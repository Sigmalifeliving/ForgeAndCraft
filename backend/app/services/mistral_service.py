"""Mistral-based Game Audio Director.

Acts as an experienced Game Audio Director + Sound Designer + Voice Director.
Analyzes game ideas and produces structured JSON audio plans:
- Characters & Voices (mapped to local Kokoro presets)
- Dialogue lines
- Music tracks (genre, tempo, energy, procedural prompts)
- Sound effects (category, trigger, procedural prompts)
- Ambience soundscapes

No cloud audio generation requests are made to Mistral.
Mistral is strictly the planning brain.
"""

import json
import logging
import re
import urllib.error
import urllib.request
import uuid

from ..config import settings
from ..schemas import (
    AmbienceItem,
    AudioDirection,
    AudioPlan,
    CharacterVoice,
    DialogueItem,
    MusicTrack,
    ProjectPlan,
    SfxItem,
)
from .voice_service import VOICE_PRESETS

logger = logging.getLogger("forgecraft.mistral")

_PRESET_IDS = [v["id"] for v in VOICE_PRESETS]

# Model fallback chain in case the primary model is throttled
CANDIDATE_MODELS = [
    settings.MISTRAL_MODEL,
    "ministral-8b-latest",
    "codestral-latest",
    "ministral-3b-latest",
]

_AUDIO_DIRECTOR_SYSTEM = """\
You are an experienced Game Audio Director, Lead Sound Designer, and Voice Director for AAA & indie game studios.
Your job is to analyze the user's game idea and construct a complete, production-grade Game Audio Plan.

You must design audio strictly tailored to the game's genre, mood, tempo, and setting.
Do NOT plan 3D models, code, physics, or graphics. Focus 100% on audio.

Kokoro TTS Voice Presets available for characters:
- "am_michael": Deep, confident, grounded male hero / warrior / commander
- "am_adam": Calm, wise, gravelly elder / storyteller / mentor / narrator
- "am_onyx": Dark, menacing, sinister villain / anti-hero / shadowy figure
- "em_santa": Booming, theatrical, larger-than-life announcer / giant
- "em_alex": Synthetic, mechanical, precise robot / cyborg / AI system
- "af_heart": Warm, expressive, empathetic heroine / mother / guide
- "af_bella": Ethereal, mystical, airy elf / goddess / fae spirit
- "af_nova": Youthful, agile, curious scout / young adventurer
- "af_sky": Bright, cheerful, playful, energetic companion

You must return ONLY a single valid JSON object with EXACTLY this structure:
{{
  "game": {{
    "title": "Evocative Game Title",
    "genre": "Precise Game Genre",
    "audio_direction": "High-level sound design philosophy (1-2 sentences)",
    "primary_mood": ["mood1", "mood2", "mood3"],
    "environment": "Key sound environments (e.g. abandoned wards, echoey corridors)",
    "voice_style": "Vocal casting direction (e.g. whispered, controlled, desperate)",
    "music_direction": "Musical style, BPM range, and instrumentation"
  }},
  "voices": [
    {{
      "id": "v_unique_id",
      "character": "Character Name",
      "role": "Narrator / NPC / Enemy / Announcer / Protagonist",
      "gender": "male or female",
      "age": "young adult, middle-aged, elderly, child, ageless",
      "personality": "disturbing, calm, zealous, playful, etc.",
      "voice_type": "low, raspy, bright, resonant, etc.",
      "speaking_style": "how they speak, tempo, rhythm",
      "emotional_range": "primary emotions expressed",
      "kokoro_voice": "one of: am_michael, am_adam, am_onyx, em_santa, em_alex, af_heart, af_bella, af_nova, af_sky",
      "speed": 0.85 to 1.15,
      "pitch": "low, natural, or bright",
      "style": "dark, warm, robotic, energetic, etc.",
      "voice_prompt": "Detailed direction for speech synthesis"
    }}
  ],
  "dialogue": [
    {{
      "id": "d_unique_id",
      "character": "Must match a Character Name from voices",
      "scene": "Introduction / Tutorial / Warning / Combat / Victory / Story",
      "purpose": "Why this spoken line is triggered in game",
      "text": "Actual complete spoken dialogue sentence (no ellipsis)",
      "emotion": "whispering, urgent, commanding, sarcastic, etc.",
      "speed": "slow, moderate, or fast",
      "emphasis": "key words emphasized",
      "voice_prompt": "Delivery instruction for speech delivery"
    }}
  ],
  "music": [
    {{
      "id": "m_unique_id",
      "title": "Track Title",
      "purpose": "main menu / exploration / combat / boss / victory / safe zone",
      "mood": "tense horror / sunny tropical / driving synth / mystical",
      "genre": "dark ambient / synthwave / orchestral / tropical",
      "instruments": "specific instruments (e.g. sub-bass, detuned piano, cello)",
      "energy": "Low, Medium, or High",
      "tempo": "80-160",
      "duration": "30",
      "loop": true,
      "generation_prompt": "Detailed procedural music synthesizer prompt (instrumental, no vocals)"
    }}
  ],
  "sfx": [
    {{
      "id": "s_unique_id",
      "name": "SFX Name",
      "category": "impact, movement, weapon, ui, environment, creature, or interaction",
      "purpose": "where and when it triggers in gameplay",
      "trigger": "player action or game event",
      "description": "crisp description of the sound texture and layers",
      "duration": "1-3",
      "generation_prompt": "Prompt for local procedural audio synthesizer (isolated, clean)"
    }}
  ],
  "ambience": [
    {{
      "id": "a_unique_id",
      "name": "Ambience Name",
      "purpose": "which level or room it loops in",
      "description": "atmospheric soundscape elements (wind, resonance, dripping, distant hum)",
      "duration": "30",
      "loop": true,
      "generation_prompt": "Prompt for ambient loop synthesizer (seamless loop)"
    }}
  ]
}}

BUDGET CONSTRAINTS ({budget_label}):
- Low Budget: 2-3 voices, 5-8 dialogue lines, 2-3 music tracks, 8-12 SFX, 2-3 ambience tracks.
- Medium Budget: 3-5 voices, 10-15 dialogue lines, 3-5 music tracks, 12-18 SFX, 3-4 ambience tracks.
- High Budget: 5-8 voices, 18-25 dialogue lines, 5-7 music tracks, 20-30 SFX, 4-6 ambience tracks.

Every item must be specifically designed for the given game concept.
Keep all text fields, prompts, and descriptions concise (under 25 words each). Complete all lists. Never truncate JSON.
Do NOT return generic placeholder names like "Audio 1" or "Click".
Output valid JSON only.
"""


def _chat_with_fallback(messages: list[dict], max_tokens: int = 6000) -> dict:
    if not settings.MISTRAL_API_KEY:
        raise RuntimeError("MISTRAL_API_KEY is not configured in backend/.env")

    models_to_try = []
    for m in CANDIDATE_MODELS:
        if m and m not in models_to_try:
            models_to_try.append(m)

    last_error = None
    for model_name in models_to_try:
        url = settings.MISTRAL_BASE_URL.rstrip("/") + "/chat/completions"
        body = {
            "model": model_name,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            logger.info(f"Calling Mistral model: {model_name}...")
            with urllib.request.urlopen(req, timeout=settings.MISTRAL_TIMEOUT) as resp:
                raw = json.loads(resp.read().decode("utf-8"))
            content = raw["choices"][0]["message"]["content"]
            parsed = _extract_json(content)
            logger.info(f"Mistral model {model_name} succeeded.")
            return parsed
        except urllib.error.HTTPError as err:
            detail = err.read().decode("utf-8", errors="replace")[:300]
            last_error = f"Mistral HTTP {err.code} ({model_name}): {detail}"
            logger.warning(f"Mistral {model_name} HTTP {err.code}: {detail}")
            if err.code in (429, 404, 503):
                continue
            raise RuntimeError(last_error) from err
        except urllib.error.URLError as err:
            last_error = f"Mistral connection error ({model_name}): {err.reason}"
            logger.warning(last_error)
            continue
        except Exception as e:
            last_error = f"Mistral processing error ({model_name}): {str(e)}"
            logger.warning(last_error)
            continue

    raise RuntimeError(last_error or "All Mistral candidate models failed.")


def _extract_json(content: str) -> dict:
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
    try:
        parsed = json.loads(content)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    start = content.find("{")
    while start != -1:
        try:
            obj, _ = decoder.raw_decode(content[start:])
            if isinstance(obj, dict):
                return obj
        except json.JSONDecodeError:
            pass
        start = content.find("{", start + 1)
    raise ValueError("No valid JSON object found in Mistral response")


def _recommend_preset(text: str, gender: str = "") -> str:
    t = (text or "").lower()
    if any(k in t for k in ("robot", "synthetic", "android", "mechanical", "cyborg", "ai ")):
        return "em_alex"
    if any(k in t for k in ("villain", "dark", "menacing", "evil", "sinister", "monster", "demon", "zombie")):
        return "am_onyx"
    if any(k in t for k in ("elder", "wise", "narrat", "storyteller", "ancient", "mentor", "old", "doctor")):
        return "am_adam"
    if any(k in t for k in ("big", "booming", "giant", "announc", "stadium", "referee")):
        return "em_santa"
    if any(k in t for k in ("child", "kid", "scout", "youth", "young", "cadet")):
        return "af_nova"
    if any(k in t for k in ("ethereal", "elf", "mystic", "goddess", "fairy", "fae", "magical", "spirit")):
        return "af_bella"
    if any(k in t for k in ("cheer", "bright", "happy", "light", "friendly", "party", "jolly")):
        return "af_sky"
    if any(k in t for k in ("heroine", "warm", "gentle", "mother", "kind", "survivor female")):
        return "af_heart"
    if gender and "female" in gender.lower():
        return "af_heart"
    return "am_michael"


def _build_plan(payload: dict, idea: str, language: str, game_id: str) -> AudioPlan:
    g_info = payload.get("game") or {}
    if not isinstance(g_info, dict):
        g_info = {}

    title = str(g_info.get("title") or _title_from_idea(idea))[:120]
    genre = str(g_info.get("genre") or "")[:80]
    audio_dir = str(g_info.get("audio_direction") or f"Custom sound design tailored to {genre}")
    environment = str(g_info.get("environment") or "")[:200]
    voice_style = str(g_info.get("voice_style") or "")[:200]
    music_dir = str(g_info.get("music_direction") or "")[:200]

    raw_mood = g_info.get("primary_mood") or []
    if isinstance(raw_mood, list):
        primary_mood = [str(m).strip() for m in raw_mood if m]
    elif isinstance(raw_mood, str):
        primary_mood = [m.strip() for m in raw_mood.split(",") if m.strip()]
    else:
        primary_mood = ["immersive", "atmospheric"]

    direction = AudioDirection(
        genre=genre,
        audio_direction=audio_dir,
        primary_mood=primary_mood[:6],
        environment=environment,
        voice_style=voice_style,
        music_direction=music_dir,
    )

    project = ProjectPlan(
        title=title,
        description=str(g_info.get("description") or idea)[:500],
        language=language[:50],
        genre=genre,
    )

    # Voices
    voices = []
    voice_by_name = {}
    for idx, v in enumerate(payload.get("voices") or []):
        if not isinstance(v, dict):
            continue
        v_id = str(v.get("id") or f"v_{idx+1}")
        char_name = str(v.get("character") or f"Character {idx+1}")
        gender = str(v.get("gender") or "")
        kokoro_voice = str(v.get("kokoro_voice") or v.get("preset") or "")
        if kokoro_voice not in _PRESET_IDS:
            kokoro_voice = _recommend_preset(
                f"{char_name} {v.get('role', '')} {v.get('personality', '')} {v.get('voice_type', '')}",
                gender,
            )
        speed = float(v.get("speed") or 1.0)
        speed = max(0.75, min(1.3, speed))
        c_voice = CharacterVoice(
            id=v_id,
            character=char_name,
            role=str(v.get("role") or "Supporting Character"),
            gender=gender,
            personality=str(v.get("personality") or ""),
            voice_type=str(v.get("voice_type") or ""),
            age=str(v.get("age") or ""),
            speaking_style=str(v.get("speaking_style") or ""),
            emotional_range=str(v.get("emotional_range") or ""),
            language=language,
            accent=str(v.get("accent") or ""),
            kokoro_voice=kokoro_voice,
            preset=kokoro_voice,
            speed=speed,
            pitch=str(v.get("pitch") or "natural"),
            style=str(v.get("style") or "natural"),
            voice_prompt=str(
                v.get("voice_prompt")
                or f"Deliver in a {v.get('personality', 'natural')} tone with {v.get('speaking_style', 'clear')} pacing."
            ),
            asset_id=f"{game_id}_{v_id}",
            status="planned",
        )
        voices.append(c_voice)
        voice_by_name[char_name.lower()] = c_voice

    # Dialogue
    dialogue = []
    for idx, d in enumerate(payload.get("dialogue") or []):
        if not isinstance(d, dict):
            continue
        d_id = str(d.get("id") or f"d_{idx+1}")
        char_name = str(d.get("character") or "Narrator")
        matching_voice = voice_by_name.get(char_name.lower())
        preset = matching_voice.preset if matching_voice else _recommend_preset(char_name)

        speed_val = str(d.get("speed") or "moderate")
        d_item = DialogueItem(
            id=d_id,
            character=char_name,
            scene=str(d.get("scene") or "Gameplay"),
            purpose=str(d.get("purpose") or "Atmosphere"),
            text=str(d.get("text") or "Keep moving forward."),
            emotion=str(d.get("emotion") or "Natural"),
            speed=speed_val,
            emphasis=str(d.get("emphasis") or ""),
            pitch=str(d.get("pitch") or "natural"),
            voice_prompt=str(
                d.get("voice_prompt")
                or f"Speak with a {d.get('emotion', 'clear')} tone at {speed_val} speed."
            ),
            preset=preset,
            asset_id=f"{game_id}_{d_id}",
            status="planned",
        )
        dialogue.append(d_item)

    # Music
    music = []
    for idx, m in enumerate(payload.get("music") or []):
        if not isinstance(m, dict):
            continue
        m_id = str(m.get("id") or f"m_{idx+1}")
        m_track = MusicTrack(
            id=m_id,
            title=str(m.get("title") or f"Music Track {idx+1}"),
            purpose=str(m.get("purpose") or "Exploration"),
            mood=str(m.get("mood") or "Atmospheric"),
            genre=str(m.get("genre") or genre or "Soundtrack"),
            instruments=str(m.get("instruments") or "Synthesizer, percussion"),
            energy=str(m.get("energy") or "Medium"),
            tempo=str(m.get("tempo") or "120"),
            duration=str(m.get("duration") or "30"),
            loop=bool(m.get("loop", True)),
            generation_prompt=str(
                m.get("generation_prompt")
                or f"{m.get('mood', 'Cinematic')} {m.get('genre', 'music')} track, {m.get('energy', 'Medium')} energy, {m.get('tempo', 120)} BPM, instrumental, no vocals."
            ),
            asset_id=f"{game_id}_{m_id}",
            status="planned",
        )
        music.append(m_track)

    # SFX
    sfx = []
    for idx, s in enumerate(payload.get("sfx") or []):
        if not isinstance(s, dict):
            continue
        s_id = str(s.get("id") or f"s_{idx+1}")
        s_item = SfxItem(
            id=s_id,
            name=str(s.get("name") or f"Sound Effect {idx+1}"),
            category=str(s.get("category") or "environment"),
            purpose=str(s.get("purpose") or "Feedback"),
            trigger=str(s.get("trigger") or "Player action"),
            description=str(s.get("description") or "Crisp sound effect"),
            duration=str(s.get("duration") or "2"),
            generation_prompt=str(
                s.get("generation_prompt")
                or f"{s.get('description', s.get('name', 'Sound effect'))}, isolated and clean."
            ),
            asset_id=f"{game_id}_{s_id}",
            status="planned",
        )
        sfx.append(s_item)

    # Ambience
    ambience = []
    for idx, a in enumerate(payload.get("ambience") or []):
        if not isinstance(a, dict):
            continue
        a_id = str(a.get("id") or f"a_{idx+1}")
        a_item = AmbienceItem(
            id=a_id,
            name=str(a.get("name") or f"Ambience {idx+1}"),
            purpose=str(a.get("purpose") or "Area background"),
            description=str(a.get("description") or "Ambient soundscape"),
            duration=str(a.get("duration") or "30"),
            loop=bool(a.get("loop", True)),
            generation_prompt=str(
                a.get("generation_prompt")
                or f"{a.get('description', a.get('name', 'Ambient soundscape'))}, seamless loop."
            ),
            asset_id=f"{game_id}_{a_id}",
            status="planned",
        )
        ambience.append(a_item)

    return AudioPlan(
        game_id=game_id,
        project=project,
        direction=direction,
        voices=voices,
        dialogue=dialogue,
        music=music,
        sfx=sfx,
        ambience=ambience,
    )


def _title_from_idea(idea: str) -> str:
    t = re.sub(r"^(create|make|build|develop|design|a)\s+(an?\s+)?", "", idea.strip(), flags=re.I)
    t = re.sub(r"\s+", " ", t).strip(" .!?")
    if not t:
        return "New Game Audio Project"
    return t[:80].capitalize()


def analyze_game_audio(
    idea: str,
    language: str = "English",
    style: str = "You decide",
    budget: str = "medium",
    mode: str = "live",
    game_id: str | None = None,
) -> dict:
    """Run the Audio Director analysis. Returns {"source", "game_id", "plan"}."""
    if not game_id:
        game_id = f"game_{uuid.uuid4().hex[:8]}"

    if mode == "demo":
        logger.info("Demo mode explicitly requested. Using built-in demo plan.")
        plan = fallback_game_plan(idea, language, style, game_id)
        return {"source": "demo", "game_id": game_id, "plan": plan}

    # Live AI Mode
    system_prompt = _AUDIO_DIRECTOR_SYSTEM.format(budget_label=budget.upper())
    user_prompt = (
        f"Game Idea: {idea}\n\n"
        f"Language: {language}\n"
        f"Style Preference: {style}\n"
        f"Generation Budget: {budget}\n\n"
        "Design the complete Game Audio Plan. Return ONLY the strict JSON object."
    )

    # Call Mistral with model fallback
    data = _chat_with_fallback(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )

    plan = _build_plan(data, idea, language, game_id)
    return {"source": "mistral", "game_id": game_id, "plan": plan}


# ---------------------------------------------------------------------------
# Themed Demo Plans (Used ONLY when user explicitly chooses Demo mode)
# ---------------------------------------------------------------------------

def fallback_game_plan(
    idea: str, language: str = "English", style: str = "You decide", game_id: str = "game_demo"
) -> AudioPlan:
    t = (idea or "").lower()
    if any(k in t for k in ("horror", "hospital", "zombie", "dark", "abandoned", "eerie", "ghost")):
        theme_data = _HORROR_DEMO
    elif any(k in t for k in ("surf", "wave", "ocean", "beach", "tropical", "water", "island")):
        theme_data = _SURF_DEMO
    elif any(k in t for k in ("fantasy", "magic", "rpg", "sword", "dragon", "knight", "forest")):
        theme_data = _FANTASY_DEMO
    elif any(k in t for k in ("race", "racing", "car", "drift", "speed", "cyber", "neon")):
        theme_data = _RACING_DEMO
    else:
        theme_data = _GENERIC_DEMO

    return _build_plan(theme_data, idea, language, game_id)


_HORROR_DEMO = {
    "game": {
        "title": "Abandoned Hospital: Patient Zero",
        "genre": "Dark Horror Survival",
        "audio_direction": "Oppressive silence punctuated by sudden resonant clangs, whispered delusions, and subsonic heartbeats.",
        "primary_mood": ["Dark", "Tense", "Dread", "Claustrophobic"],
        "environment": "Decaying psychiatric ward, wet tiled hallways, flickering fluorescent hum",
        "voice_style": "Low, trembling, feverish, and desperate",
        "music_direction": "Sub-bass drones, bowed cymbals, dissonant strings, 70 BPM",
    },
    "voices": [
        {
            "id": "v_doctor",
            "character": "Dr. Mercer",
            "role": "Chief Surgeon / Antagonist",
            "gender": "male",
            "age": "middle-aged",
            "personality": "Calm, clinical, chillingly detached",
            "voice_type": "Low and controlled",
            "speaking_style": "Slow, methodical, surgical",
            "kokoro_voice": "am_onyx",
            "speed": 0.88,
            "pitch": "low",
            "style": "dark",
            "voice_prompt": "Low, slow, clinical male voice with disturbing calmness.",
        },
        {
            "id": "v_survivor",
            "character": "Claire",
            "role": "Protagonist / Survivor",
            "gender": "female",
            "age": "young adult",
            "personality": "Terrified yet determined",
            "voice_type": "Breathless, strained",
            "speaking_style": "Fast whispered delivery",
            "kokoro_voice": "af_heart",
            "speed": 1.05,
            "pitch": "natural",
            "style": "tense",
            "voice_prompt": "Breathless female voice, tense and whispered.",
        },
        {
            "id": "v_intercom",
            "character": "Automated Intercom",
            "role": "Facility System Voice",
            "gender": "male",
            "age": "ageless",
            "personality": "Cold and sterile",
            "voice_type": "Mechanical with slight distortion",
            "speaking_style": "Robotic cadence",
            "kokoro_voice": "em_alex",
            "speed": 0.95,
            "pitch": "natural",
            "style": "synthetic",
            "voice_prompt": "Monotone synthetic PA announcer with metallic resonance.",
        },
    ],
    "dialogue": [
        {
            "id": "d_intro",
            "character": "Claire",
            "scene": "Opening Scene",
            "purpose": "Establish vulnerability",
            "text": "The emergency doors are welded shut from the outside. Something is in here with me.",
            "emotion": "whispering",
            "speed": "moderate",
            "emphasis": "welded shut, with me",
        },
        {
            "id": "d_taunt",
            "character": "Dr. Mercer",
            "scene": "Hallway Encounter",
            "purpose": "Psychological terror",
            "text": "Do not resist the procedure, Claire. Sickness is merely an unanswered symptom.",
            "emotion": "chilling",
            "speed": "slow",
            "emphasis": "procedure, sickness",
        },
        {
            "id": "d_warning",
            "character": "Automated Intercom",
            "scene": "Facility Quarantine",
            "purpose": "Environmental hazard alert",
            "text": "Code Black in Ward B. Total decontamination protocol initiating in three minutes.",
            "emotion": "sterile",
            "speed": "moderate",
            "emphasis": "Code Black, decontamination",
        },
        {
            "id": "d_escape",
            "character": "Claire",
            "scene": "Generator Room",
            "purpose": "Pushed to the brink",
            "text": "If I can restore backup power to the elevator shaft, I might make it to the roof.",
            "emotion": "determined",
            "speed": "fast",
            "emphasis": "backup power, elevator shaft",
        },
    ],
    "music": [
        {
            "id": "m_exploration",
            "title": "Corridor of Whispers",
            "purpose": "Exploration gameplay",
            "mood": "Dark ambient horror",
            "genre": "Horror ambient",
            "instruments": "Sub-bass, bowing metals, distant detuned piano",
            "energy": "Low",
            "tempo": "72",
            "duration": "45",
            "loop": True,
            "generation_prompt": "Eerie dark ambient horror drone with sub-bass and metallic scrapes, tense and claustrophobic, instrumental, no vocals, seamless loop.",
        },
        {
            "id": "m_pursuit",
            "title": "Scapel Chase",
            "purpose": "Combat / monster pursuit",
            "mood": "High panic and dread",
            "genre": "Dark cinematic industrial",
            "instruments": "Distorted tribal percussion, screeching strings, pulse bass",
            "energy": "High",
            "tempo": "135",
            "duration": "30",
            "loop": True,
            "generation_prompt": "High-intensity dark horror pursuit theme with heavy distorted percussion and screeching strings, panic atmosphere, instrumental, no vocals, seamless loop.",
        },
    ],
    "sfx": [
        {
            "id": "s_door_creak",
            "name": "Heavy Metal Hospital Door Creak",
            "category": "environment",
            "purpose": "Entering treatment rooms",
            "trigger": "Door interaction",
            "description": "Slow agonizing rusty hinge groan with echoing reverberation",
            "duration": "3",
            "generation_prompt": "Old rusty hospital door slowly creaking open with metallic friction and echo, isolated and clean.",
        },
        {
            "id": "s_heartbeat",
            "name": "Panic Heartbeat Surge",
            "category": "feedback",
            "purpose": "Low health / proximity indicator",
            "trigger": "Monster near player",
            "description": "Sub-bass pulse with muffling ear pressure effect",
            "duration": "2",
            "generation_prompt": "Deep thumping heartbeat pulse in heavy acoustic space, muffling bass thump, isolated and clean.",
        },
        {
            "id": "s_glass_shatter",
            "name": "Medical Vial Shatter",
            "category": "impact",
            "purpose": "Distraction mechanic",
            "trigger": "Throwing an object",
            "description": "Sharp high-frequency glass crash with liquid splatter",
            "duration": "2",
            "generation_prompt": "Sharp glass vial shattering on hospital tile floor with quick liquid splash, isolated and clean.",
        },
        {
            "id": "s_monster_growl",
            "name": "Mutated Specimen Growl",
            "category": "creature",
            "purpose": "Enemy detection",
            "trigger": "Enemy nearby",
            "description": "Guttural wet snarl with ragged breathing",
            "duration": "3",
            "generation_prompt": "Guttural mutated creature snarl with wet rasp and deep resonance, isolated and clean.",
        },
    ],
    "ambience": [
        {
            "id": "a_ward",
            "name": "Psychiatric Ward Room Tone",
            "purpose": "Main indoor exploration",
            "description": "Low drone, flickering fluorescent ballast buzz, distant pipe dripping",
            "duration": "30",
            "loop": True,
            "generation_prompt": "Dark abandoned hospital room tone with low drone, electrical fluorescent buzz, and distant dripping water, seamless loop.",
        }
    ],
}

_SURF_DEMO = {
    "game": {
        "title": "Sunburst Surfers",
        "genre": "Tropical Sports & Adventure",
        "audio_direction": "Bright, uplifting, energetic soundscape filled with warm ocean spray, cheering fans, and steel pan grooves.",
        "primary_mood": ["Energetic", "Sunny", "Playful", "Adventurous"],
        "environment": "Golden sands, crashing reef breaks, lively boardwalk",
        "voice_style": "Friendly, hype, confident, and sun-soaked",
        "music_direction": "Upbeat tropical electronic, steel drums, acoustic plucks, 128 BPM",
    },
    "voices": [
        {
            "id": "v_coach",
            "character": "Coach Kai",
            "role": "Mentor",
            "gender": "male",
            "age": "adult",
            "personality": "Supportive and high-energy",
            "voice_type": "Warm and resonant",
            "speaking_style": "Motivational and enthusiastic",
            "kokoro_voice": "am_michael",
            "speed": 1.0,
            "pitch": "natural",
            "style": "warm",
            "voice_prompt": "Warm, encouraging male voice with lively surf enthusiasm.",
        },
        {
            "id": "v_announcer",
            "character": "Duke Hype",
            "role": "Tournament Announcer",
            "gender": "male",
            "age": "adult",
            "personality": "Showman, loud, charismatic",
            "voice_type": "Booming and theatrical",
            "speaking_style": "Rapid tournament delivery",
            "kokoro_voice": "em_santa",
            "speed": 1.15,
            "pitch": "bright",
            "style": "energetic",
            "voice_prompt": "Booming, enthusiastic sports announcer voice with big energy.",
        },
    ],
    "dialogue": [
        {
            "id": "d_dropin",
            "character": "Coach Kai",
            "scene": "Wave Drop",
            "purpose": "Tutorial tip",
            "text": "Drop in right down the shoulder, bend your knees, and carve hard into the pocket!",
            "emotion": "enthusiastic",
            "speed": "moderate",
            "emphasis": "drop in, carve hard",
        },
        {
            "id": "d_bigwave",
            "character": "Duke Hype",
            "scene": "Monster Wave",
            "purpose": "Hype moment",
            "text": "Look at the size of that twenty-foot barrel! Unbelievable aerial incoming!",
            "emotion": "hyped",
            "speed": "fast",
            "emphasis": "twenty-foot, aerial incoming",
        },
    ],
    "music": [
        {
            "id": "m_surf_beat",
            "title": "Tide Rider Groove",
            "purpose": "Gameplay soundtrack",
            "mood": "Tropical sunshine adventure",
            "genre": "Tropical House",
            "instruments": "Steel drums, bright plucks, rolling house bass",
            "energy": "High",
            "tempo": "125",
            "duration": "30",
            "loop": True,
            "generation_prompt": "Upbeat tropical electronic dance track with steel drums, bright synths and energetic ocean vibes, instrumental, no vocals, seamless loop.",
        }
    ],
    "sfx": [
        {
            "id": "s_wave_crash",
            "name": "Heavy Ocean Wave Crash",
            "category": "environment",
            "purpose": "Wave crest breaking",
            "trigger": "Wave break",
            "description": "Massive surging water impact with foamy fizz",
            "duration": "2",
            "generation_prompt": "Massive ocean wave crashing down with heavy water impact and frothy spray, isolated and clean.",
        },
        {
            "id": "s_board_snap",
            "name": "Surfboard Snap Turn",
            "category": "movement",
            "purpose": "Sharp carving turn",
            "trigger": "Player turns",
            "description": "Crisp spray whoosh with board friction",
            "duration": "1",
            "generation_prompt": "Crisp surfboard carving through seawater with bright spray and splash, isolated and clean.",
        },
    ],
    "ambience": [
        {
            "id": "a_beach",
            "name": "Tropical Beach Atmosphere",
            "purpose": "Main menu and free roam",
            "description": "Rolling ocean swells, gentle breeze, distant seagulls",
            "duration": "30",
            "loop": True,
            "generation_prompt": "Sunny tropical beach ambience with gentle breaking waves, ocean breeze and distant seagulls, seamless loop.",
        }
    ],
}

_FANTASY_DEMO = {
    "game": {
        "title": "Chronicles of Eldoria",
        "genre": "High Fantasy Action RPG",
        "audio_direction": "Epic orchestral grandeur layered with mystical wind chimes and archaic incantations.",
        "primary_mood": ["Epic", "Mystical", "Heroic", "Ancient"],
        "environment": "Whispering enchanted groves, crumbling stone keeps, torchlit dungeons",
        "voice_style": "Regal, wise, commanding, and arcane",
        "music_direction": "Celtic folk meets cinematic orchestra, 110 BPM",
    },
    "voices": [
        {
            "id": "v_mage",
            "character": "Grand Mage Vael",
            "role": "Mentor / Wizard",
            "gender": "male",
            "age": "elderly",
            "personality": "Mystical and solemn",
            "voice_type": "Deep, resonant, ancient",
            "speaking_style": "Deliberate and rhythmic",
            "kokoro_voice": "am_adam",
            "speed": 0.9,
            "pitch": "low",
            "style": "mystical",
            "voice_prompt": "Wise, elderly wizard voice with calm mystical cadence.",
        }
    ],
    "dialogue": [
        {
            "id": "d_prophecy",
            "character": "Grand Mage Vael",
            "scene": "Quest Start",
            "purpose": "Lore introduction",
            "text": "The ancient runes illuminate the forest path once more. Take the enchanted blade.",
            "emotion": "solemn",
            "speed": "slow",
            "emphasis": "ancient runes, enchanted blade",
        }
    ],
    "music": [
        {
            "id": "m_tavern",
            "title": "Hearth of the Gryphon",
            "purpose": "Safe hub / village",
            "mood": "Warm and festive",
            "genre": "Medieval Folk",
            "instruments": "Lute, wooden flute, hand drums",
            "energy": "Medium",
            "tempo": "104",
            "duration": "30",
            "loop": True,
            "generation_prompt": "Warm medieval folk tavern melody with lute and flute, cozy and lively, instrumental, no vocals, seamless loop.",
        }
    ],
    "sfx": [
        {
            "id": "s_spellcast",
            "name": "Arcane Magic Burst",
            "category": "combat",
            "purpose": "Casting spell",
            "trigger": "Attack button",
            "description": "Rising magical chime with powerful shockwave burst",
            "duration": "2",
            "generation_prompt": "Arcane magical burst with bright mystical chime and low energy pulse, isolated and clean.",
        }
    ],
    "ambience": [
        {
            "id": "a_forest",
            "name": "Enchanted Forest Canopy",
            "purpose": "Overworld exploration",
            "description": "Wind through ancient boughs, nocturnal birds, gentle magical shimmer",
            "duration": "30",
            "loop": True,
            "generation_prompt": "Mystic enchanted forest ambience with gentle wind through leaves and subtle magic hum, seamless loop.",
        }
    ],
}

_RACING_DEMO = {
    "game": {
        "title": "Neon Velocity 2099",
        "genre": "Cyberpunk Anti-Grav Racing",
        "audio_direction": "Relentless synthwave pulses, screaming turbine engines, and futuristic radio comms.",
        "primary_mood": ["Futuristic", "Competitive", "High-Octane", "Aggressive"],
        "environment": "Rain-soaked neon megacity, elevated magnetic highway, crowded grandstands",
        "voice_style": "Fast, cocky, robotic, and urgent",
        "music_direction": "Darksynth / Cyberpunk electronic, heavy arpeggios, 140 BPM",
    },
    "voices": [
        {
            "id": "v_crew",
            "character": "Pit Chief Jax",
            "role": "Radio Coach",
            "gender": "male",
            "age": "adult",
            "personality": "Gruff, pragmatic racer",
            "voice_type": "Grounded with radio filter",
            "speaking_style": "Fast and decisive",
            "kokoro_voice": "am_michael",
            "speed": 1.1,
            "pitch": "natural",
            "style": "direct",
            "voice_prompt": "Fast, direct pit crew chief giving race instructions over comms.",
        }
    ],
    "dialogue": [
        {
            "id": "d_boost",
            "character": "Pit Chief Jax",
            "scene": "Lap 2",
            "purpose": "Tactical callout",
            "text": "Nitrous tank primed! Drain it down the long straightaway before they cut you off!",
            "emotion": "urgent",
            "speed": "fast",
            "emphasis": "nitrous tank, straightaway",
        }
    ],
    "music": [
        {
            "id": "m_race",
            "title": "Overdrive Highway",
            "purpose": "Main race track",
            "mood": "High-octane cyberpunk",
            "genre": "Darksynth",
            "instruments": "Driving saw bass, distorted drums, neon lead synths",
            "energy": "High",
            "tempo": "142",
            "duration": "30",
            "loop": True,
            "generation_prompt": "High-octane darksynth cyberpunk race track with heavy driving bass and fast synth arpeggios, energetic and intense, instrumental, no vocals, seamless loop.",
        }
    ],
    "sfx": [
        {
            "id": "s_engine_boost",
            "name": "Ion Engine Boost Ignition",
            "category": "movement",
            "purpose": "Nitro boost activation",
            "trigger": "Boost key",
            "description": "High-frequency plasma whine into a thunderous thruster roar",
            "duration": "2",
            "generation_prompt": "Sci-fi ion engine boost activating with high-pitched laser whine into powerful roar, isolated and clean.",
        }
    ],
    "ambience": [
        {
            "id": "a_megacity",
            "name": "Neon Megacity Paddock",
            "purpose": "Garage and vehicle select",
            "description": "Distant highway hover traffic, neon hum, light drizzle",
            "duration": "30",
            "loop": True,
            "generation_prompt": "Cyberpunk megacity background with distant flying car traffic, gentle rain on metal and electrical hum, seamless loop.",
        }
    ],
}

_GENERIC_DEMO = _HORROR_DEMO