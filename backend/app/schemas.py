from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class AssetOut(BaseModel):
    id: int
    name: str
    type: str
    format: str
    file_path: str
    size: int
    duration: float = 0.0
    prompt: str = ""
    model: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}


class AssetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)


class JobOut(BaseModel):
    id: int
    type: str
    name: str = ""
    prompt: str
    format: str
    voice: str = ""
    speed: float = 1.0
    status: str
    progress: int
    message: str
    model: str
    output_asset_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VoiceOut(BaseModel):
    id: str
    name: str
    gender: str | None = None
    style: str | None = None


class ThreeDGeneratePayload(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    quality: str = Field(default="balanced", pattern=r"^(fast|balanced|medium|quality)$")
    format: str = Field(default="glb", pattern=r"^(glb|obj)$")
    reference_image: str = Field(default="", max_length=6_000_000)
    style: str = Field(default="", max_length=120)


class VoiceGeneratePayload(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    voice: str = Field(default="am_michael")
    engine: str = Field(default="local", pattern=r"^(cloud|local)$")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    category: str = Field(default="auto")
    duration: float = Field(default=0.0, ge=0.0, le=60.0)
    mood: str = Field(default="", max_length=50)


class AudioGeneratePayload(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    name: str = Field(default="", max_length=120)


class GamePlanRequest(BaseModel):
    idea: str = Field(min_length=3, max_length=2000)
    language: str = Field(default="English", max_length=50)
    style: str = Field(default="You decide", max_length=100)
    budget: str = Field(default="medium", max_length=20)  # low | medium | high
    mode: str = Field(default="live", max_length=20)  # live | demo


class AudioDirection(BaseModel):
    genre: str = ""
    audio_direction: str = ""
    primary_mood: list[str] = []
    environment: str = ""
    voice_style: str = ""
    music_direction: str = ""


class ProjectPlan(BaseModel):
    title: str = ""
    description: str = ""
    language: str = ""
    genre: str = ""


class _Extra:
    model_config = ConfigDict(extra="allow")


class CharacterVoice(_Extra, BaseModel):
    id: str = ""
    character: str
    role: str = ""
    gender: str = ""
    personality: str = ""
    voice_type: str = ""
    age: str = ""
    speaking_style: str = ""
    emotional_range: str = ""
    language: str = ""
    accent: str = ""
    kokoro_voice: str = ""
    speed: float = 1.0
    pitch: str = ""
    style: str = ""
    voice_prompt: str = ""
    preset: str = ""
    asset_id: str = ""
    status: str = "planned"  # planned | generating | ready | failed
    duration: float = 0.0
    audio_url: str = ""


class DialogueItem(_Extra, BaseModel):
    id: str = ""
    character: str
    scene: str = ""
    purpose: str = ""
    text: str
    emotion: str = ""
    speed: str = ""
    emphasis: str = ""
    pitch: str = ""
    voice_prompt: str = ""
    preset: str = ""
    asset_id: str = ""
    status: str = "planned"
    duration: float = 0.0
    audio_url: str = ""


class MusicTrack(_Extra, BaseModel):
    id: str = ""
    title: str
    purpose: str = ""
    mood: str = ""
    genre: str = ""
    instruments: str = ""
    energy: str = ""
    tempo: str = ""
    duration: str = "30"
    loop: bool = True
    generation_prompt: str = ""
    asset_id: str = ""
    status: str = "planned"
    audio_duration: float = 0.0
    audio_url: str = ""


class SfxItem(_Extra, BaseModel):
    id: str = ""
    name: str
    category: str = "sfx"
    purpose: str = ""
    trigger: str = ""
    description: str = ""
    duration: str = "2"
    generation_prompt: str = ""
    asset_id: str = ""
    status: str = "planned"
    audio_duration: float = 0.0
    audio_url: str = ""


class AmbienceItem(_Extra, BaseModel):
    id: str = ""
    name: str
    purpose: str = ""
    description: str = ""
    duration: str = "30"
    loop: bool = True
    generation_prompt: str = ""
    asset_id: str = ""
    status: str = "planned"
    audio_duration: float = 0.0
    audio_url: str = ""


class AudioPlan(BaseModel):
    game_id: str = ""
    project: ProjectPlan = ProjectPlan()
    direction: AudioDirection = AudioDirection()
    voices: list[CharacterVoice] = []
    dialogue: list[DialogueItem] = []
    music: list[MusicTrack] = []
    sfx: list[SfxItem] = []
    ambience: list[AmbienceItem] = []

    model_config = ConfigDict(extra="ignore")


class GamePlanOut(BaseModel):
    status: str = "completed"
    source: str = "mistral"
    game_id: str = ""
    plan: AudioPlan


class GenerateAssetPayload(BaseModel):
    game_id: str
    asset_id: str
    regenerate: bool = False
    voice: str | None = None
    speed: float | None = None


class AudioAssetOut(BaseModel):
    id: str
    game_id: str
    category: str
    item_id: str
    name: str
    description: str = ""
    prompt: str = ""
    model: str = ""
    voice: str = ""
    speed: float = 1.0
    status: str = "planned"
    duration: float = 0.0
    file_path: str = ""
    audio_url: str = ""