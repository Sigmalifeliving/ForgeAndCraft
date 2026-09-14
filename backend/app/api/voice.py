import time
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..config import settings
from ..database import SessionLocal, get_db
from ..deps import get_current_user
from ..models import Asset, Job, User
from ..schemas import (
    GamePlanOut,
    GamePlanRequest,
    JobOut,
    VoiceGeneratePayload,
    VoiceOut,
)
from ..services.mistral_service import analyze_game_audio
from ..services.voice_service import VOICE_PRESETS, synthesize

router = APIRouter(prefix="/voice", tags=["voice"])

STAGES = [
    ("processing", 30, "Preparing model..."),
    ("generating", 60, "Generating speech..."),
    ("post-processing", 85, "Encoding audio..."),
]


def process_voice_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if not job:
            return

        if job.model != "local":
            job.status = "failed"
            job.progress = 0
            job.message = "Cloud engine is not configured. Select the Local engine."
            db.commit()
            return

        for stage_status, stage_progress, stage_message in STAGES:
            time.sleep(0.25)
            job.status = stage_status
            job.progress = stage_progress
            job.message = stage_message
            db.commit()

        user_dir = Path(settings.GENERATED_DIR) / str(job.user_id)
        out_path = user_dir / f"{job.id}.wav"
        text = job.prompt.strip()
        if not text:
            raise ValueError("Text is empty")

        size = synthesize(text, voice=job.voice, speed=job.speed, out_path=out_path)
        duration = round(size / (settings.KOKORO_SAMPLE_RATE * 2), 2)

        asset = Asset(
            user_id=job.user_id,
            name=job.name or (text[:80] or "Voice").strip(),
            type="voice",
            format="wav",
            file_path=f"generated/{job.user_id}/{job.id}.wav",
            size=size,
            duration=duration,
            prompt=text,
            model=job.voice,
        )
        db.add(asset)
        db.commit()
        job.output_asset_id = asset.id
        job.status = "completed"
        job.progress = 100
        job.message = "Done!"
        db.commit()
    except Exception:
        db.rollback()
        job = db.get(Job, job_id)
        if job:
            job.status = "failed"
            job.message = "Generation failed"
            db.commit()
    finally:
        db.close()


@router.get("/voices", response_model=list[VoiceOut])
def list_voices():
    return [VoiceOut(**v) for v in VOICE_PRESETS]


@router.post(
    "/generate", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED
)
def generate_voice(
    payload: VoiceGeneratePayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not any(v["id"] == payload.voice for v in VOICE_PRESETS):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown voice id")

    job = Job(
        user_id=current_user.id,
        type="voice",
        name=(payload.text[:80] or "Voice").strip(),
        prompt=payload.text,
        format="wav",
        voice=payload.voice,
        speed=payload.speed,
        status="queued",
        progress=0,
        message="Queued",
        model=payload.engine,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(process_voice_job, job.id)
    return job


@router.post("/game-plan", response_model=GamePlanOut)
def game_plan(
    payload: GamePlanRequest,
    current_user: User = Depends(get_current_user),
):
    """Mistral Audio Director: analyze a game idea -> full audio plan."""
    result = analyze_game_audio(payload.idea, payload.language, payload.style)
    return GamePlanOut(status="completed", source=result["source"], plan=result["plan"])