from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Job, User
from ..schemas import JobOut

router = APIRouter(prefix="/jobs", tags=["jobs"])

STAGES = [
    ("processing", 15, "Analyzing prompt..."),
    ("generating", 40, "Generating geometry..."),
    ("generating", 65, "Building mesh..."),
    ("post-processing", 85, "Converting and optimizing..."),
]


def get_owned_job(db: Session, job_id: int, user_id: int) -> Job:
    job = db.get(Job, job_id)
    if not job or job.user_id != user_id:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("", response_model=list[JobOut])
def list_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    jobs = db.scalars(
        select(Job)
        .where(Job.user_id == current_user.id)
        .order_by(Job.created_at.desc())
        .limit(50)
    ).all()
    return jobs


@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_owned_job(db, job_id, current_user.id)