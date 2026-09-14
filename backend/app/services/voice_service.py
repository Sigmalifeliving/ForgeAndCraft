import threading
from pathlib import Path
from typing import Any

from ..config import settings

_kokoro_lock = threading.Lock()
_kokoro: Any = None

# Curated gaming voice presets mapped to Kokoro voices.
VOICE_PRESETS = [
    {"id": "am_michael", "name": "Hero", "gender": "male", "style": "Deep, grounded hero"},
    {"id": "am_adam", "name": "Narrator / Elder", "gender": "male", "style": "Calm storyteller"},
    {"id": "am_onyx", "name": "Villain", "gender": "male", "style": "Dark and menacing"},
    {"id": "em_santa", "name": "Booming Voice", "gender": "male", "style": "Larger-than-life"},
    {"id": "em_alex", "name": "Robot / Synthetic", "gender": "male", "style": "Mechanical"},
    {"id": "af_heart", "name": "Heroine", "gender": "female", "style": "Warm and expressive"},
    {"id": "af_bella", "name": "Elf / Ethereal", "gender": "female", "style": "Mystical"},
    {"id": "af_nova", "name": "Scout", "gender": "female", "style": "Youthful adventurer"},
    {"id": "af_sky", "name": "Bright Voice", "gender": "female", "style": "Cheerful and light"},
]

_VALID_IDS = {v["id"] for v in VOICE_PRESETS}


def _get_kokoro():
    global _kokoro
    if _kokoro is None:
        with _kokoro_lock:
            if _kokoro is None:
                from kokoro_onnx import Kokoro

                if not settings.KOKORO_MODEL_PATH.exists():
                    raise FileNotFoundError(
                        f"Kokoro model not found at {settings.KOKORO_MODEL_PATH}"
                    )
                if not settings.KOKORO_VOICES_PATH.exists():
                    raise FileNotFoundError(
                        f"Kokoro voices not found at {settings.KOKORO_VOICES_PATH}"
                    )
                _kokoro = Kokoro(
                    str(settings.KOKORO_MODEL_PATH), str(settings.KOKORO_VOICES_PATH)
                )
    return _kokoro


def is_voice_valid(voice_id: str) -> bool:
    return voice_id in _VALID_IDS


def synthesize(text: str, voice: str, speed: float, out_path: Path) -> int:
    """Synthesize speech to a WAV file and return the byte size."""
    if not text.strip():
        raise ValueError("Text is empty")
    if not is_voice_valid(voice):
        raise ValueError(f"Unknown voice: {voice}")

    import soundfile as sf

    kokoro = _get_kokoro()
    with _kokoro_lock:
        samples, sample_rate = kokoro.create(text, voice=voice, speed=speed)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    import numpy as np

    data = np.asarray(samples)
    if data.dtype.kind == "f":
        data = (data * 32767).astype("int16")
    sf.write(str(out_path), data, sample_rate)
    return out_path.stat().st_size