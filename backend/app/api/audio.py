import time
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from ..config import settings
from ..database import SessionLocal, get_db
from ..deps import get_current_user
from ..models import Asset, Job, User
from ..schemas import AudioGeneratePayload, JobOut
from ..services.audio_service import render_audio

STAGES = [
    ("processing", 30, "Analyzing audio prompt..."),
    ("generating", 65, "Rendering audio..."),
    ("post-processing", 85, "Encoding audio..."),
]

KIND_LABELS = {
    "music": "Music",
    "sfx": "Sound Effect",
    "ambience": "Ambience",
}


def process_audio_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if not job:
            return

        for stage_status, stage_progress, stage_message in STAGES:
            time.sleep(0.15)
            job.status = stage_status
            job.progress = stage_progress
            job.message = stage_message
            db.commit()

        kind = job.type
        text = job.prompt.strip()
        if not text:
            raise ValueError("Prompt is empty")

        out_path = Path(settings.GENERATED_DIR) / str(job.user_id) / f"{job.id}.wav"
        size, duration = render_audio(kind, text, out_path)

        label = KIND_LABELS.get(kind, kind.upper())
        asset = Asset(
            user_id=job.user_id,
            name=job.name or f"{label} {job.id}",
            type=kind,
            format="wav",
            file_path=f"generated/{job.user_id}/{job.id}.wav",
            size=size,
            duration=round(duration, 2),
            prompt=text,
            model=job.model or settings.AUDIO_MODEL,
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
            job.progress = 0
            job.message = "Generation failed"
            db.commit()
    finally:
        db.close()


def _audio_job(
    job_type: str,
    payload: AudioGeneratePayload,
    background_tasks: BackgroundTasks,
    current_user: User,
    db: Session,
) -> Job:
    job = Job(
        user_id=current_user.id,
        type=job_type,
        name=payload.name.strip()[:120],
        prompt=payload.prompt,
        format="wav",
        status="queued",
        progress=0,
        message="Queued",
        model=settings.AUDIO_MODEL,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    background_tasks.add_task(process_audio_job, job.id)
    return job


music_router = APIRouter(prefix="/music", tags=["music"])


@music_router.post(
    "/generate", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED
)
def generate_music(
    payload: AudioGeneratePayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _audio_job("music", payload, background_tasks, current_user, db)


sfx_router = APIRouter(prefix="/sfx", tags=["sfx"])


@sfx_router.post(
    "/generate", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED
)
def generate_sfx(
    payload: AudioGeneratePayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _audio_job("sfx", payload, background_tasks, current_user, db)


ambience_router = APIRouter(prefix="/ambience", tags=["ambience"])


@ambience_router.post(
    "/generate", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED
)
def generate_ambience(
    payload: AudioGeneratePayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _audio_job("ambience", payload, background_tasks, current_user, db)