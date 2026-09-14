"""Local text-to-3D pipeline.

Engine: TripoSR (image -> 3D) plus a text -> image reference renderer
(SD-turbo, or the user's uploaded image, or the Pollinations free endpoint).

The ``torchmcubes`` extension that normally makes TripoSR painful to build
on Windows (it requires MSVC + the CUDA toolkit) is replaced by a small
compatibility shim built on scikit-image's marching cubes, so the diffusers
pipeline imports cleanly on this machine. All heavy imports are lazy so the
API itself boots fast and only loads models when a 3D job runs.
"""
import base64
import io
import logging
import sys
import threading
import time
import types
from collections import deque

import numpy as np
from PIL import Image

from ..config import BASE_DIR, settings

logger = logging.getLogger(__name__)

_pipeline_lock = threading.Lock()
_triposr = None
_sd = None
_rembg_session = None
_loaded_device = ""


def _pick_device() -> str:
    try:
        import torch  # noqa: F401

        if settings.THREE_D_DEVICE in ("cuda", "auto") and torch.cuda.is_available():
            return "cuda"
    except Exception:
        pass
    return "cpu"


def engine_label(device: str = "") -> str:
    return f"triposr+sd-turbo ({device})" if device else "triposr+sd-turbo"


# ---------------------------------------------------------------------------
# torchmcubes compatibility shim (scikit-image marching cubes)
# ---------------------------------------------------------------------------
def _install_torchmcubes_shim():
    if "torchmcubes" in sys.modules:
        return
    try:
        import torch
        from scipy import ndimage
        from skimage import measure
    except Exception as e:  # pragma: no cover - guarded at call site too
        raise RuntimeError(f"3D deps missing (scipy/skimage/torch): {e}") from e

    def marching_cubes(u, isovalue=0.0):
        if torch.is_tensor(u):
            u = u.detach().cpu().numpy()
        verts, faces, _, _ = measure.marching_cubes(u, level=float(isovalue))
        # Skimage marching_cubes returns coords aligned with array axes [x, y, z].
        # TripoSR's MarchingCubeHelper in tsr/models/isosurface.py inverts torchmcubes CUDA
        # kernel axis ordering via v_pos = v_pos[..., [2, 1, 0]].
        # To match torchmcubes convention, we swap [2, 1, 0] here so isosurface's swap produces exact [x, y, z].
        verts = verts[..., [2, 1, 0]]
        return (
            torch.from_numpy(np.ascontiguousarray(verts, dtype=np.float32)),
            torch.from_numpy(np.ascontiguousarray(faces, dtype=np.int64)),
        )

    def grid_interp(rgb, verts):
        rgb_np = rgb.detach().cpu().numpy() if torch.is_tensor(rgb) else np.asarray(rgb)
        verts_np = verts.detach().cpu().numpy() if torch.is_tensor(verts) else np.asarray(verts)
        cols = np.zeros((verts_np.shape[0], rgb_np.shape[-1]), dtype=np.float32)
        for c in range(rgb_np.shape[-1]):
            cols[:, c] = ndimage.map_coordinates(
                rgb_np[..., c], verts_np.T, order=1, mode="constant", cval=0.0
            )
        return torch.from_numpy(cols)

    shim = types.ModuleType("torchmcubes")
    shim.marching_cubes = marching_cubes
    shim.grid_interp = grid_interp
    sys.modules["torchmcubes"] = shim


# ---------------------------------------------------------------------------
# Prompt helpers
# ---------------------------------------------------------------------------
STYLE_PRESETS = {
    "roblox": "roblox asset, cute blocky stylized 3d model, clean beveled edges, vibrant flat colors, smooth cartoon",
    "cartoon": "stylized cartoon 3d asset, pixar style, smooth rounded shapes, vibrant colors, cute game model",
    "chibi": "cute chibi miniature toy, rounded proportions, vibrant pastel colors, kawaii 3d game asset",
    "rpg_prop": "stylized fantasy game prop, clean hand-painted look, bold silhouette, rpg game asset",
    "voxel": "isometric voxel art 3d model, clean blocky cubic geometry, colorful voxels, game prop",
    "scifi": "stylized sci-fi game asset, sleek beveled armor, glowing neon blue accents, clean cartoon",
    "realistic": "clean 3d model, studio lighting, single isolated object",
}


def build_reference_prompt(subject: str, style: str = "") -> str:
    style_clean = (style or "").strip().lower().replace("-", "_").replace(" ", "_")
    preset = STYLE_PRESETS.get(style_clean)
    if not preset and style_clean:
        preset = f"stylized cartoon {style.strip()}, vibrant colors, game asset"
    elif not preset:
        preset = STYLE_PRESETS["roblox"]

    return (
        f"{subject}, {preset}, isolated object, centered, solid white background, "
        "studio lighting, front 3/4 view, 3d game asset, no text"
    )




def _to_white_bg(img: Image.Image, threshold: int = 42) -> Image.Image:
    """Flood-fill connected background from the image borders to pure white."""
    arr = np.asarray(img.convert("RGB")).astype(np.int16)
    h, w, _ = arr.shape
    bg = arr[0, 0].astype(np.int16)
    mask = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not mask[y, x]:
                mask[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if not mask[y, x]:
                mask[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx]:
                if int((np.abs(arr[ny, nx] - bg)).sum()) < threshold:
                    mask[ny, nx] = True
                    q.append((ny, nx))
    out = arr.copy()
    out[mask] = 255
    out[arr >= 245] = 255
    return Image.fromarray(out.astype(np.uint8))


def _square_canvas(img: Image.Image, size: int = 512) -> Image.Image:
    img = img.convert("RGB")
    if img.size == (size, size):
        return img
    side = max(img.size)
    # Neutral 50% gray background for TripoSR
    canvas = Image.new("RGB", (side, side), (127, 127, 127))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def _get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        import rembg

        _rembg_session = rembg.new_session("isnet-general-use")
    return _rembg_session


def _prep_reference_for_triposr(image: Image.Image) -> Image.Image:
    """Match TripoSR's training preprocessing: foreground subject composited on a 0.5-gray bg."""
    vendor_dir = str(BASE_DIR / "vendor")
    if vendor_dir not in sys.path:
        sys.path.insert(0, vendor_dir)
    from tsr.utils import remove_background, resize_foreground

    rgba = None
    if settings.THREE_D_REMBG.lower() == "true":
        try:
            rgba = remove_background(image, _get_rembg_session())
        except Exception as exc:  # noqa: BLE001
            logger.warning("rembg preprocessing failed (%s), using threshold mask", exc)

    if rgba is None:
        img_rgb = image.convert("RGB")
        arr = np.asarray(img_rgb).astype(np.float32)
        is_bg = np.all(arr > 240, axis=-1)
        alpha = np.where(is_bg, 0, 255).astype(np.uint8)
        rgba = Image.fromarray(np.dstack([np.asarray(img_rgb), alpha]))

    try:
        rgba = resize_foreground(rgba, 0.85)
    except Exception as exc:  # noqa: BLE001
        logger.warning("resize_foreground failed (%s)", exc)

    # Composite cleanly over 50% neutral gray (127, 127, 127) as TripoSR requires
    rgba_np = np.asarray(rgba).astype(np.float32) / 255.0
    if rgba_np.ndim == 3 and rgba_np.shape[-1] == 4:
        rgb = rgba_np[:, :, :3]
        alpha = rgba_np[:, :, 3:4]
        composited = rgb * alpha + (1.0 - alpha) * 0.5
    else:
        composited = rgba_np[:, :, :3]

    out_img = Image.fromarray((np.clip(composited, 0.0, 1.0) * 255.0).astype(np.uint8))
    return out_img.resize((512, 512), Image.LANCZOS)


# ---------------------------------------------------------------------------
# Model loading (lazy singletons)
# ---------------------------------------------------------------------------
def _load_triposr():
    global _triposr, _loaded_device
    with _pipeline_lock:
        if _triposr is not None:
            return _triposr, _loaded_device
        _install_torchmcubes_shim()

        vendor_dir = str(BASE_DIR / "vendor")
        if vendor_dir not in sys.path:
            sys.path.insert(0, vendor_dir)
        import torch
        from tsr.system import TSR

        device = _pick_device()
        model = TSR.from_pretrained(
            settings.THREE_D_TRIPOSR_MODEL_ID,
            config_name="config.yaml",
            weight_name="model.ckpt",
        )
        model.renderer.set_chunk_size(int(settings.THREE_D_CHUNK_SIZE))
        model = model.to(device)
        model.eval()
        _triposr, _loaded_device = model, device
        logger.info("TripoSR loaded on %s", device)
        return _triposr, _loaded_device


def _load_sd():
    global _sd
    with _pipeline_lock:
        if _sd is not None:
            return _sd
        import torch
        from diffusers import StableDiffusionPipeline

        device = _pick_device()
        # fp32 everywhere: fp16 UNet produces NaN latents on Turing GPUs.
        # Sequential CPU offload keeps GPU well under 4GB at the cost of speed.
        pipe = StableDiffusionPipeline.from_pretrained(
            settings.THREE_D_SD_MODEL_ID,
            safety_checker=None,
            requires_safety_checker=False,
            torch_dtype=torch.float32,
        )
        if device == "cuda":
            try:
                pipe.enable_model_cpu_offload()
            except Exception:
                pipe.enable_sequential_cpu_offload()
        else:
            pipe = pipe.to("cpu")
        pipe.set_progress_bar_config(disable=True)
        _sd = pipe
        logger.info("sd-turbo reference renderer loaded on %s", device)
        return _sd


# ---------------------------------------------------------------------------
# Reference image generation
# ---------------------------------------------------------------------------
def _render_reference_local_sd(subject: str, style: str = "") -> Image.Image:
    """Draw a clean reference image with local SD-turbo."""
    import torch

    pipe = _load_sd()
    prompt = build_reference_prompt(subject, style)
    generator = None
    if _pick_device() == "cuda":
        generator = torch.Generator(device="cuda").manual_seed(
            torch.randint(0, 1 << 30, (), device="cuda").item()
        )
    result = pipe(
        prompt,
        num_inference_steps=int(settings.THREE_D_SD_STEPS),
        guidance_scale=0.0,
        width=512,
        height=512,
        generator=generator,
        output_type="latent",
    )
    latents = result.images.to(dtype=torch.float32)
    vae = pipe.vae.to(dtype=torch.float32)
    with torch.no_grad():
        image = vae.decode(1 / vae.config.scaling_factor * latents, return_dict=False)[0]
        image = (image / 2 + 0.5).clamp(0, 1)
        image = image.cpu().permute(0, 2, 3, 1).float().numpy()
    img = Image.fromarray((np.clip(image[0], 0, 1) * 255.0).astype(np.uint8))
    return _to_white_bg(img)


def _render_reference_pollinations(subject: str, style: str = "") -> Image.Image:
    import random
    import urllib.parse
    import urllib.request

    prompt = build_reference_prompt(subject, style)
    seed = random.randint(1, 10000000)
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=512&height=512&nologo=true&seed={seed}"
    req = urllib.request.Request(url, headers={"User-Agent": "ForgeCraft/1.0 (GameDev 3D)"})
    with urllib.request.urlopen(req, timeout=6) as resp:

        data = resp.read()
    return _to_white_bg(Image.open(io.BytesIO(data)).convert("RGB"))


def render_reference_image(subject: str, style: str = "") -> Image.Image:
    """Render a clean reference image (Pollinations Flux with local SD fallback)."""
    engine = (settings.THREE_D_REFERENCE_ENGINE or "pollinations").lower()

    if engine in ("pollinations", "auto", "cloud"):
        try:
            logger.info("Generating reference image via Pollinations (Flux)...")
            return _render_reference_pollinations(subject, style)
        except Exception as exc:
            logger.warning("Pollinations reference render failed (%s), falling back to local SD-turbo", exc)

    logger.info("Generating reference image via local SD-turbo...")
    return _render_reference_local_sd(subject, style)


def decode_reference_image(b64: str) -> Image.Image:
    """Accept data:image/...;base64 or a raw base64 string."""
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    raw = base64.b64decode(b64)
    return Image.open(io.BytesIO(raw))


# ---------------------------------------------------------------------------
# TripoSR reconstruction
# ---------------------------------------------------------------------------
def _run_pipeline(model, device, image, mc_res):
    import torch

    attempts = [
        int(mc_res),
        max(64, int(mc_res * 0.75)),
        max(64, int(mc_res * 0.6)),
    ]
    cpu_fallback_used = False
    for res in attempts:
        try:
            with torch.no_grad():
                scene_codes = model(image, device)
            meshes = model.extract_mesh(
                scene_codes, has_vertex_color=True, resolution=res
            )
            return meshes[0]
        except (torch.cuda.OutOfMemoryError, RuntimeError) as exc:
            lower = str(exc).lower()
            if "out of memory" not in lower and "cuda" not in lower:
                raise
            logger.warning("TripoSR attempt OOM (mc=%s), retrying", res)
            if not cpu_fallback_used:
                cpu_fallback_used = True
                model.to("cpu")
                with torch.no_grad():
                    scene_codes = model(image, "cpu")
                meshes = model.extract_mesh(
                    scene_codes, has_vertex_color=True, resolution=max(64, int(mc_res * 0.6))
                )
                return meshes[0]
    raise RuntimeError("TripoSR could not run within available memory")


QUALITY_MC_RES = {
    "fast": 128,
    "balanced": 160,
    "medium": 160,
    "quality": 208,
}


def generate_3d(
    subject: str,
    out_path,
    fmt: str = "glb",
    reference_image_pil=None,
    style: str = "",
    quality: str = "balanced",
    mc_res=None,
    chunk_size=None,
):
    """Run reference + reconstruction, exporting a GLB/OBJ mesh file."""
    started = time.monotonic()
    if reference_image_pil is None:
        reference_image_pil = render_reference_image(subject, style)
    reference_image_pil = _prep_reference_for_triposr(reference_image_pil)

    model, device = _load_triposr()
    if mc_res is None:
        mc_res = QUALITY_MC_RES.get((quality or "balanced").lower(), int(settings.THREE_D_MC_RESOLUTION))
    image = _square_canvas(reference_image_pil, 512)

    mesh = _run_pipeline(model, device, image, mc_res)

    vendor_dir = str(BASE_DIR / "vendor")
    if vendor_dir not in sys.path:
        sys.path.insert(0, vendor_dir)
    from tsr.utils import to_gradio_3d_orientation

    # Align with standard Three.js / GLTF coordinates (+Y up, +Z front)
    mesh = to_gradio_3d_orientation(mesh)
    mesh.export(out_path)
    elapsed = round(time.monotonic() - started, 1)
    return {
        "model": engine_label(_loaded_device),
        "device": _loaded_device,
        "seconds": elapsed,
    }

