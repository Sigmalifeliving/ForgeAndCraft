"""
Utility script to download Kokoro ONNX model and voice weights.
Run this script once after cloning the repository:
    python download_models.py
"""

import sys
from pathlib import Path
import urllib.request

MODELS_DIR = Path(__file__).resolve().parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

FILES = {
    "kokoro-v1.0.onnx": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx",
    "voices-v1.0.bin": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin",
}


def download_file(url: str, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size > 0:
        print(f"[OK] {dest.name} already exists ({dest.stat().st_size / (1024 * 1024):.1f} MB).")
        return

    print(f"Downloading {dest.name} from {url}...")

    def progress_hook(block_num, block_size, total_size):
        downloaded = block_num * block_size
        if total_size > 0:
            percent = downloaded / total_size * 100
            mb_downloaded = downloaded / (1024 * 1024)
            mb_total = total_size / (1024 * 1024)
            sys.stdout.write(f"\r  -> {percent:.1f}% ({mb_downloaded:.1f}/{mb_total:.1f} MB)")
            sys.stdout.flush()

    try:
        urllib.request.urlretrieve(url, str(dest), reporthook=progress_hook)
        print(f"\n[Done] Successfully downloaded {dest.name}")
    except Exception as exc:
        if dest.exists():
            dest.unlink(missing_ok=True)
        print(f"\n[Error] Failed to download {dest.name}: {exc}")
        sys.exit(1)


def main():
    print(f"Checking Kokoro models in: {MODELS_DIR}")
    for filename, url in FILES.items():
        download_file(url, MODELS_DIR / filename)
    print("\nAll models ready!")


if __name__ == "__main__":
    main()
