from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import Asset, User
from ..schemas import AssetOut, AssetUpdate

router = APIRouter(prefix="/assets", tags=["assets"])


def get_owned_asset(db: Session, asset_id: int, user_id: int) -> Asset:
    asset = db.get(Asset, asset_id)
    if not asset or asset.user_id != user_id:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.get("/{asset_id}/download")
def download_asset(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = get_owned_asset(db, asset_id, current_user.id)
    if not asset.file_path:
        raise HTTPException(
            status_code=404, detail="No file available for this asset yet"
        )
    full_path = Path(settings.GENERATED_DIR.parent) / asset.file_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File missing on server")

    media_type = {
        "wav": "audio/wav",
        "glb": "model/gltf-binary",
        "obj": "text/plain",
    }.get(asset.format, "application/octet-stream")
    filename = f"{asset.id}.{asset.format or 'bin'}"
    return FileResponse(
        path=full_path,
        media_type=media_type,
        filename=filename,
    )


@router.get("", response_model=list[AssetOut])
def list_assets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assets = db.scalars(
        select(Asset)
        .where(Asset.user_id == current_user.id)
        .order_by(Asset.created_at.desc())
    ).all()
    return assets


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_owned_asset(db, asset_id, current_user.id)


@router.patch("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: int,
    payload: AssetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = get_owned_asset(db, asset_id, current_user.id)
    if payload.name is not None:
        asset.name = payload.name
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = get_owned_asset(db, asset_id, current_user.id)
    db.delete(asset)
    db.commit()