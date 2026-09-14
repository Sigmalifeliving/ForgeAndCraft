"""Placeholder audio renderers for music / SFX / ambience.

These produce simple but audible WAV files so the full generation pipeline
(job -> asset -> download) works end-to-end until a real music/SFX/
ambience model or API is wired in. Output is deterministic per prompt.
"""

import hashlib
from pathlib import Path

import numpy as np

SAMPLE_RATE = 22050


def _seed(text: str) -> int:
    return int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:8], 16)


def _write(out_path: Path, samples: np.ndarray) -> tuple[int, float]:
    import soundfile as sf

    out_path.parent.mkdir(parents=True, exist_ok=True)
    data = samples.astype(np.float32)
    sf.write(str(out_path), data, SAMPLE_RATE)
    return out_path.stat().st_size, float(samples.shape[0]) / SAMPLE_RATE


def _render_music(prompt: str, out_path: Path) -> tuple[int, float]:
    seed = _seed(prompt)
    rng = np.random.default_rng(seed)
    tempo = 112 + (seed % 28)
    beat = 60.0 / tempo
    duration = 8.0
    n = int(duration * SAMPLE_RATE)
    track = np.zeros(n)

    base_root = 110.0 * (2 ** (((seed >> 4) % 12) / 12.0))
    scale = [base_root * (2 ** (k / 12.0)) for k in (0, 2, 4, 7, 9)]
    step = beat * 0.5  # eighth notes
    steps = int(duration / step)

    for i in range(steps):
        start = i * step
        if start + 0.35 > duration:
            break
        idx = int(start * SAMPLE_RATE)
        seg_len = min(int(0.35 * SAMPLE_RATE), n - idx)
        seg_t = np.arange(seg_len) / SAMPLE_RATE
        note = rng.choice(scale)
        track[idx : idx + seg_len] += (
            np.sin(2 * np.pi * note * seg_t) * np.exp(-seg_t * 9)
        )
        if i % 2 == 0:
            b_len = min(int(0.5 * SAMPLE_RATE), n - idx)
            b_t = np.arange(b_len) / SAMPLE_RATE
            track[idx : idx + b_len] += (
                np.sin(2 * np.pi * (base_root / 2) * b_t) * np.exp(-b_t * 5) * 0.7
            )

    track = track / (np.max(np.abs(track)) + 1e-6) * 0.9
    return _write(out_path, track)


def _render_sfx(prompt: str, out_path: Path) -> tuple[int, float]:
    seed = _seed(prompt)
    rng = np.random.default_rng(seed)
    duration = 1.8
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE

    noise = rng.standard_normal(n) * np.exp(-t * 5)
    f_start = 120 + (seed % 400)
    f_end = 4000 + ((seed >> 8) % 2000)
    sweep_phase = 2 * np.pi * np.cumsum(f_start + (f_end - f_start) * (t / duration)) / SAMPLE_RATE
    sweep = np.sin(sweep_phase) * np.exp(-((t - 0.2) ** 2) * 9)

    mix = noise * 0.6 + sweep * 0.5
    mix = mix / (np.max(np.abs(mix)) + 1e-6) * 0.9
    return _write(out_path, mix)


def _render_ambience(prompt: str, out_path: Path) -> tuple[int, float]:
    seed = _seed(prompt)
    rng = np.random.default_rng(seed)
    duration = 6.0
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE

    white = rng.standard_normal(n)
    brown = np.cumsum(white)
    brown = brown / (np.max(np.abs(brown)) + 1e-6)
    lfo = 0.25 * np.sin(2 * np.pi * 0.12 * t) + 0.1 * np.sin(2 * np.pi * 0.05 * t)

    mix = brown * 0.5 + lfo
    mix = mix / (np.max(np.abs(mix)) + 1e-6) * 0.7

    fade = min(int(0.5 * SAMPLE_RATE), n)
    mix[:fade] *= np.linspace(0, 1, fade)
    mix[-fade:] *= np.linspace(1, 0, fade)
    return _write(out_path, mix)


def render_audio(kind: str, prompt: str, out_path: Path) -> tuple[int, float]:
    """Render a WAV for the given kind. Returns (size_bytes, duration_seconds)."""
    if kind == "music":
        return _render_music(prompt, out_path)
    if kind == "sfx":
        return _render_sfx(prompt, out_path)
    if kind == "ambience":
        return _render_ambience(prompt, out_path)
    raise ValueError(f"Unsupported audio kind: {kind}")