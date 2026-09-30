from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    assets: Mapped[list["Asset"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    jobs: Mapped[list["Job"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    games: Mapped[list["Game"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    format: Mapped[str] = mapped_column(String(10), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), default="")
    size: Mapped[int] = mapped_column(Integer, default=0)
    duration: Mapped[float] = mapped_column(Float, default=0.0)
    prompt: Mapped[str] = mapped_column(Text, default="")
    model: Mapped[str] = mapped_column(String(50), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    owner: Mapped["User"] = relationship(back_populates="assets")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(120), default="")
    prompt: Mapped[str] = mapped_column(Text, default="")
    format: Mapped[str] = mapped_column(String(10), default="")
    voice: Mapped[str] = mapped_column(String(30), default="")
    speed: Mapped[float] = mapped_column(Float, default=1.0)
    reference_image: Mapped[str] = mapped_column(Text, default="")
    style: Mapped[str] = mapped_column(String(120), default="")
    status: Mapped[str] = mapped_column(String(30), default="queued")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str] = mapped_column(String(255), default="")
    model: Mapped[str] = mapped_column(String(50), default="")
    output_asset_id: Mapped[int | None] = mapped_column(
        ForeignKey("assets.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    owner: Mapped["User"] = relationship(back_populates="jobs")


class Game(Base):
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)  # e.g. game_7f82a1
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    genre: Mapped[str] = mapped_column(String(80), default="")
    idea: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(40), default="English")
    style: Mapped[str] = mapped_column(String(80), default="You decide")
    budget: Mapped[str] = mapped_column(String(20), default="medium")
    audio_direction: Mapped[str] = mapped_column(Text, default="")
    primary_mood: Mapped[str] = mapped_column(String(200), default="")
    environment: Mapped[str] = mapped_column(String(200), default="")
    voice_style: Mapped[str] = mapped_column(String(200), default="")
    music_direction: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    owner: Mapped["User"] = relationship(back_populates="games")
    plans: Mapped[list["AudioPlanRecord"]] = relationship(
        back_populates="game", cascade="all, delete-orphan"
    )
    audio_assets: Mapped[list["AudioAssetRecord"]] = relationship(
        back_populates="game", cascade="all, delete-orphan"
    )


class AudioPlanRecord(Base):
    __tablename__ = "audio_plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    game_id: Mapped[str] = mapped_column(ForeignKey("games.id"), index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(30), default="mistral")  # "mistral" | "demo"
    plan_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    game: Mapped["Game"] = relationship(back_populates="plans")


class AudioAssetRecord(Base):
    __tablename__ = "audio_asset_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)  # e.g. sfx_door_creak_12a8
    game_id: Mapped[str] = mapped_column(ForeignKey("games.id"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)  # voice, dialogue, music, sfx, ambience
    item_id: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    prompt: Mapped[str] = mapped_column(Text, default="")
    model: Mapped[str] = mapped_column(String(50), default="")
    voice: Mapped[str] = mapped_column(String(30), default="")
    speed: Mapped[float] = mapped_column(Float, default=1.0)
    pitch: Mapped[str] = mapped_column(String(30), default="")
    status: Mapped[str] = mapped_column(String(20), default="planned")  # planned, generating, ready, failed
    file_path: Mapped[str] = mapped_column(String(500), default="")
    duration: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    game: Mapped["Game"] = relationship(back_populates="audio_assets")