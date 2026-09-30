import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")
load_dotenv()  # Fallback to current working directory


class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "insecure-dev-secret-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./forgecraft.db")

    GENERATED_DIR: Path = BASE_DIR / "generated"
    MODELS_DIR: Path = BASE_DIR / "models"
    KOKORO_MODEL_PATH: Path = MODELS_DIR / "kokoro-v1.0.onnx"
    KOKORO_VOICES_PATH: Path = MODELS_DIR / "voices-v1.0.bin"
    KOKORO_SAMPLE_RATE: int = 24000

    # Mistral LLM (Audio Director).
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
    MISTRAL_BASE_URL: str = os.getenv("MISTRAL_BASE_URL", "https://api.mistral.ai/v1")
    MISTRAL_MODEL: str = os.getenv("MISTRAL_MODEL", "ministral-8b-latest")
    MISTRAL_TIMEOUT: int = int(os.getenv("MISTRAL_TIMEOUT", "120"))

    # Placeholder generator label for music/SFX/ambience until a real model
    # or API is configured.
    AUDIO_MODEL: str = os.getenv("AUDIO_MODEL", "forgecraft-stub")

    # Text-to-3D: local TripoSR image->3D reconstruction. The reference image
    # can come from an upload, a local SD-turbo render, or the Pollinations
    # free cloud endpoint (reference engines: upload | local_sd | pollinations).
    THREE_D_ENGINE: str = os.getenv("THREE_D_ENGINE", "triposr")
    THREE_D_REFERENCE_ENGINE: str = os.getenv("THREE_D_REFERENCE_ENGINE", "local_sd")
    THREE_D_DEVICE: str = os.getenv("THREE_D_DEVICE", "auto")  # auto | cuda | cpu
    THREE_D_MC_RESOLUTION: int = int(os.getenv("THREE_D_MC_RESOLUTION", "192"))
    THREE_D_CHUNK_SIZE: int = int(os.getenv("THREE_D_CHUNK_SIZE", "16384"))
    THREE_D_SD_STEPS: int = int(os.getenv("THREE_D_SD_STEPS", "2"))
    THREE_D_REMBG: str = os.getenv("THREE_D_REMBG", "true")
    THREE_D_SD_MODEL_ID: str = os.getenv("THREE_D_SD_MODEL_ID", "stabilityai/sd-turbo")
    THREE_D_TRIPOSR_MODEL_ID: str = os.getenv("THREE_D_TRIPOSR_MODEL_ID", "stabilityai/TripoSR")


settings = Settings()