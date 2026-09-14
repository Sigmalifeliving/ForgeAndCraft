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
    voice: str = Field(default="voice-1")
    engine: str = Field(default="cloud", pattern=r"^(cloud|local)$")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)


class AudioGeneratePayload(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    name: str = Field(default="", max_length=120)


class GamePlanRequest(BaseModel):
    idea: str = Field(min_length=3, max_length=2000)
    language: str = Field(default="English", max_length=50)
    style: str = Field(default="You decide", max_length=100)


class ProjectPlan(BaseModel):
    title: str = ""
    description: str = ""
    language: str = ""


class _Extra:
    model_config = ConfigDict(extra="allow")


class CharacterVoice(_Extra, BaseModel):
    character: str
    role: str = ""
    personality: str = ""
    voice_type: str = ""
    age: str = ""
    speaking_style: str = ""
    emotional_range: str = ""
    language: str = ""
    accent: str = ""
    voice_prompt: str = ""
    preset: str = ""


class DialogueItem(_Extra, BaseModel):
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


class MusicTrack(_Extra, BaseModel):
    title: str
    purpose: str = ""
    mood: str = ""
    genre: str = ""
    instruments: str = ""
    energy: str = ""
    tempo: str = ""
    duration: str = ""
    loop: bool = False
    generation_prompt: str = ""


class SfxItem(_Extra, BaseModel):
    name: str
    purpose: str = ""
    trigger: str = ""
    description: str = ""
    duration: str = ""
    generation_prompt: str = ""


class AmbienceItem(_Extra, BaseModel):
    name: str
    purpose: str = ""
    description: str = ""
    loop: bool = True
    generation_prompt: str = ""


class AudioPlan(BaseModel):
    project: ProjectPlan = ProjectPlan()
    voices: list[CharacterVoice] = []
    dialogue: list[DialogueItem] = []
    music: list[MusicTrack] = []
    sfx: list[SfxItem] = []
    ambience: list[AmbienceItem] = []

    model_config = ConfigDict(extra="ignore")


class GamePlanOut(BaseModel):
    status: str = "completed"
    source: str = "mistral"
    plan: AudioPlan