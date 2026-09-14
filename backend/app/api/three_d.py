import logging

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from ..config import settings
from ..database import SessionLocal, get_db
from ..deps import get_current_user
from ..models import Asset, Job, User
from ..schemas import JobOut, ThreeDGeneratePayload
from ..services import three_d_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/3d", tags=["3d"])


def process_3d_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if not job:
            return

        subject = job.prompt or "3d object"

        # Optional uploaded reference image (skips the text->image step).
        reference_pil = None
        if job.reference_image:
            job.status = "processing"
            job.message = "Preparing your reference image..."
            job.progress = 20
            db.commit()
            reference_pil = three_d_service.decode_reference_image(job.reference_image)

        fmt = job.format or "glb"
        rel_dir = f"generated/{job.user_id}"
        abs_dir = settings.GENERATED_DIR.parent / rel_dir
        abs_dir.mkdir(parents=True, exist_ok=True)
        out_path = abs_dir / f"{job.id}.{fmt}"
        quality = job.name if job.name in ("fast", "balanced", "quality") else "balanced"

        if reference_pil is None:
            job.message = "Rendering stylized game reference image..."
            job.progress = 30
        else:
            job.message = "Reconstructing 3D mesh with TripoSR..."
            job.progress = 45
        job.status = "processing"
        db.commit()

        metadata = three_d_service.generate_3d(
            subject=subject,
            out_path=out_path,
            fmt=fmt,
            reference_image_pil=reference_pil,
            style=job.style,
            quality=quality,
        )

        size = out_path.stat().st_size
        asset = Asset(
            user_id=job.user_id,
            name=(subject[:80] or "3D Model").strip(),
            type="3d",
            format=fmt,
            file_path=f"{rel_dir}/{job.id}.{fmt}",
            size=size,
            prompt=job.prompt,
            model=metadata.get("model", "triposr"),
        )
        db.add(asset)
        db.commit()
        job.output_asset_id = asset.id
        job.model = asset.model
        job.status = "completed"
        job.progress = 100
        job.message = "Done!"
        db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.exception("3D job %s failed", job_id)
        db.rollback()
        job = db.get(Job, job_id)
        if job:
            job.status = "failed"
            job.message = str(exc)[:250]
            db.commit()
    finally:
        db.close()


@router.post(
    "/generate", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED
)
def generate_3d(
    payload: ThreeDGeneratePayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = Job(
        user_id=current_user.id,
        type="3d",
        name=payload.quality or "balanced",
        prompt=payload.prompt,
        format=payload.format or "glb",
        reference_image=payload.reference_image,
        style=payload.style,
        status="queued",
        progress=0,
        message="Queued",
        model=three_d_service.engine_label(""),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(process_3d_job, job.id)
    return job