"""Mistral-based Audio Director.

Turns a one-line game idea into a structured, production-ready audio plan
(voices, dialogue, music, sound effects and ambience) with generation
prompts that can be handed directly to the app's audio generators.

Pipeline:
    game idea -> Mistral (Stage 1: audio requirements)
               -> Mistral (Stage 2: production-ready generation prompts)
               -> validated AudioPlan

If no MISTRAL_API_KEY is configured (or the LLM pipeline fails) a built-in
themed demo plan is returned so the planner always works.
"""

import json
import re
import urllib.error
import urllib.request

from ..config import settings
from ..schemas import (
    AmbienceItem,
    AudioPlan,
    CharacterVoice,
    DialogueItem,
    MusicTrack,
    ProjectPlan,
    SfxItem,
)
from .voice_service import VOICE_PRESETS

_PRESETS = VOICE_PRESETS
_PRESET_IDS = [v["id"] for v in _PRESETS]

_STAGE1_SYSTEM = """\
You are the Audio Director for a game production studio. Your job is ONLY audio: \
voice acting, character dialogue, narration, announcements, music, ambient audio \
and sound effects. Never plan 3D models, environments, gameplay systems, UI, VFX \
or Roblox implementation.

Analyze the game idea strictly from an audio-production perspective and return a \
single JSON object with exactly these keys:

{
  "project": {"title": "short game title", "description": "one-sentence audio pitch", "language": "spoken language"},
  "voices": [
    {
      "character": "name",
      "role": "narrator / coach / announcer / NPC / enemy / system voice",
      "personality": "short personality",
      "voice_type": "warm, deep, bright, raspy, etc.",
      "age": "young adult, middle aged, elderly, child",
      "speaking_style": "how the character speaks",
      "emotional_range": "list of emotions",
      "language": "language of the character",
      "accent": "accent if relevant, else empty string"
    }
  ],
  "dialogue": [
    {
      "character": "must reference a voice from voices",
      "scene": "Introduction / Tutorial / Gameplay / Mission / Victory / Failure / Warning / Story",
      "purpose": "why this line exists",
      "text": "actual spoken line in the game language",
      "emotion": "short label such as Encouraging, Tense, Triumphant",
      "speed": "Slow, Moderate or Fast",
      "emphasis": "up to three key words, comma separated"
    }
  ],
  "music": [
    {
      "title": "track name",
      "purpose": "menu / gameplay / high-intensity / victory / defeat / results",
      "mood": "short mood",
      "genre": "concise genre",
      "instruments": "key instruments",
      "energy": "Low, Medium, High",
      "tempo": "BPM value",
      "duration": "duration in seconds",
      "loop": true
    }
  ],
  "sfx": [
    {
      "name": "fx name",
      "purpose": "where it is used",
      "trigger": "what triggers it",
      "description": "sound description",
      "duration": "short / 1 second / brief hit, etc."
    }
  ],
  "ambience": [
    {
      "name": "ambience name",
      "purpose": "which area/state it supports",
      "description": "soundscape description",
      "loop": true
    }
  ]
}

Rules:
- Only include what the game genuinely requires. No filler characters or tracks.
- "ellipsis" is NOT allowed in dialogue text: write complete spoken lines.
- Every array must contain between 1 and 10 items.
- Dialogue characters must match entries in "voices".
"""

_STAGE2_SYSTEM = """\
You are still the Audio Director for the same game. Enrich the provided audio plan \
with production-ready GENERATION PROMPTS. Keep the EXACT same JSON shape, keys and \
number of items (do not remove, rename or add items). Return JSON that adds, for every item:

- voices: "voice_prompt" = a text-to-speech style description (tone, personality, \
delivery, age) ready to pass to a TTS engine, and "preset" = the single most fitting \
voice id from this allowed list: {presets}.
- dialogue: "voice_prompt" = a delivery instruction for the line (emotion, speed, \
emphasis, character voice), and "preset" = one fitting voice id from the allowed list.
- music: "generation_prompt" = a music-generator prompt: mood, genre, instruments, \
energy, tempo, loop requirement and the words "instrumental, no vocals".
- sfx: "generation_prompt" = a sound-effect prompt describing the sound, its source, \
that it is short/isolated and clean.
- ambience: "generation_prompt" = an ambient loop prompt ending with "seamless loop".

Also fill any empty optional fields with sensible values. Return the full updated JSON object.
"""


def _chat(messages: list[dict], max_tokens: int = 4096) -> dict:
    url = settings.MISTRAL_BASE_URL.rstrip("/") + "/chat/completions"
    body = {
        "model": settings.MISTRAL_MODEL,
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
        with urllib.request.urlopen(req, timeout=settings.MISTRAL_TIMEOUT) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="replace")[:400]
        raise RuntimeError(f"Mistral HTTP {err.code}: {detail}") from err
    except urllib.error.URLError as err:
        raise RuntimeError(f"Mistral connection error: {err.reason}") from err
    content = raw["choices"][0]["message"]["content"]
    return _extract_json(content)


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
    raise ValueError("No JSON object found in Mistral response")


def _list_of(data: dict, key: str, model_cls) -> list:
    value = data.get(key, []) if isinstance(data, dict) else []
    if not isinstance(value, list):
        return []
    items = []
    for entry in value[:10]:
        if not isinstance(entry, dict):
            continue
        try:
            items.append(model_cls.model_validate(entry))
        except Exception:
            continue
    return items


def _recommend_preset(text: str, gender: str = "") -> str:
    t = (text or "").lower()
    if any(k in t for k in ("robot", "synthetic", "android", "mechanical", "cyborg", "ai ")):
        return "em_alex"
    if any(k in t for k in ("villain", "dark", "menacing", "evil", "sinister", "monster", "demon")):
        return "am_onyx"
    if any(k in t for k in ("elder", "wise", "narrat", "storyteller", "ancient", "mentor", "old")):
        return "am_adam"
    if any(k in t for k in ("big", "booming", "giant", "larger-than-life", "announc", "stadium", "bulky")):
        return "em_santa"
    if any(k in t for k in ("child", "kid", "scout", "youth", "young", "school")):
        return "af_nova"
    if any(k in t for k in ("ethereal", "elf", "mystic", "goddess", "fairy", "fae", "magical", "spirit")):
        return "af_bella"
    if any(k in t for k in ("cheer", "bright", "happy", "light", "friendly", "party", "jolly")):
        return "af_sky"
    if any(k in t for k in ("heroine", "warm", "gentle", "mother", "kind", "nurturing")):
        return "af_heart"
    if any(k in t for k in ("hero", "deep", "grounded", "confident", "strong", "warrior", "captain")):
        return "am_michael"
    if gender and "female" in gender.lower():
        return "af_heart"
    return "am_michael"


def _gender_hint(entry: dict) -> str:
    blob = " ".join(str(entry.get(k, "")) for k in ("voice_type", "age", "personality", "speaking_style"))
    if "female" in blob.lower() or "woman" in blob.lower() or "girl" in blob.lower():
        return "female"
    if "male" in blob.lower() or "man" in blob.lower() or "boy" in blob.lower():
        return "male"
    return ""


def _backfill_plan(plan: AudioPlan) -> AudioPlan:
    by_name = {}
    for v in plan.voices:
        if not v.preset:
            v.preset = _recommend_preset(
                " ".join([v.character, v.personality, v.voice_type, v.speaking_style, v.age]),
                _gender_hint(v.model_dump()),
            )
        if not v.voice_prompt:
            v.voice_prompt = (
                f"{v.voice_type or 'Natural'} voice with a {v.personality or 'engaging'} "
                f"personality, {v.speaking_style or 'clear and natural'} delivery"
                + (f", {v.age}" if v.age else "")
                + (f", {v.accent} accent" if v.accent else "")
                + "."
            )
        by_name[v.character.lower()] = v

    for d in plan.dialogue:
        src = by_name.get(d.character.lower())
        if not d.preset:
            if src:
                d.preset = src.preset
            else:
                d.preset = _recommend_preset(
                    " ".join([d.character, d.emotion, d.purpose]), _gender_hint(d.model_dump())
                )
        if not d.voice_prompt:
            base = f"Speak with a {d.emotion or 'natural'} tone"
            if d.speed:
                base += f", {d.speed.lower()} speed"
            if d.emphasis:
                base += f", emphasizing {d.emphasis}"
            d.voice_prompt = base + "."

    for m in plan.music:
        if not m.generation_prompt:
            loop_txt = "seamless loop" if m.loop else "no loop required"
            m.generation_prompt = (
                f"{m.mood or 'Uplifting'} {m.genre or 'instrumental'} music track, "
                f"{m.energy or 'Medium'} energy, {m.tempo or '120'} BPM, "
                f"featuring {m.instruments or 'warm instrumentation'}, instrumental, no vocals, {loop_txt}."
            )
    for s in plan.sfx:
        if not s.generation_prompt:
            s.generation_prompt = (
                f"{s.description or s.name} sound effect, "
                f"{s.duration or 'short'} duration, isolated and clean."
            )
    for a in plan.ambience:
        if not a.generation_prompt:
            a.generation_prompt = (
                f"{a.description or a.name} ambient soundscape, immersive and subtle, seamless loop."
            )
    return plan


def _build_plan(payload: dict, idea: str, language: str) -> AudioPlan:
    project = payload.get("project") if isinstance(payload, dict) else {}
    if not isinstance(project, dict):
        project = {}
    title = str(project.get("title") or _title_from_idea(idea))
    plan = AudioPlan(
        project=ProjectPlan(
            title=title[:120],
            description=str(project.get("description") or idea)[:500],
            language=str(project.get("language") or language)[:50],
        ),
        voices=_list_of(payload, "voices", CharacterVoice),
        dialogue=_list_of(payload, "dialogue", DialogueItem),
        music=_list_of(payload, "music", MusicTrack),
        sfx=_list_of(payload, "sfx", SfxItem),
        ambience=_list_of(payload, "ambience", AmbienceItem),
    )
    return _backfill_plan(plan)


def _title_from_idea(idea: str) -> str:
    t = re.sub(r"^(create|make|build|develop|design|a)\s+(an?\s+)?", "", idea.strip(), flags=re.I)
    t = re.sub(r"\s+", " ", t).strip(" .!?")
    if not t:
        return "New Game Audio Project"
    return t[:80].capitalize()


def analyze_game_audio(idea: str, language: str = "English", style: str = "You decide") -> dict:
    """Run the two-stage Mistral analysis. Returns {"source", "plan"}."""
    if not settings.MISTRAL_API_KEY:
        return {"source": "fallback", "plan": fallback_game_plan(idea, language, style)}

    user_stage1 = (
        f"Game idea: {idea}\n\nLanguage: {language}\nStyle: {style}\n\n"
        "Return only the JSON described in the system prompt."
    )
    try:
        stage1 = _chat(
            [
                {"role": "system", "content": _STAGE1_SYSTEM},
                {"role": "user", "content": user_stage1},
            ]
        )
        stage2 = _chat(
            [
                {"role": "system", "content": _STAGE2_SYSTEM.format(presets=", ".join(_PRESET_IDS))},
                {"role": "user", "content": f"Audio plan to enrich:\n{json.dumps(stage1, ensure_ascii=False)}"},
            ]
        )
        plan = _build_plan(stage2, idea, language)
        if not plan.voices and not plan.dialogue and not plan.music:
            plan = _build_plan(stage1, idea, language)
        return {"source": "mistral", "plan": plan}
    except Exception:
        return {"source": "fallback", "plan": fallback_game_plan(idea, language, style)}


# ---------------------------------------------------------------------------
# Built-in themed demo plans (used when Mistral is not configured).
# ---------------------------------------------------------------------------


def _th(character, role, personality, voice_type, age, speaking_style, emotional_range, preset, voice_prompt=""):
    return {
        "character": character,
        "role": role,
        "personality": personality,
        "voice_type": voice_type,
        "age": age,
        "speaking_style": speaking_style,
        "emotional_range": emotional_range,
        "language": "English",
        "accent": "",
        "preset": preset,
        "voice_prompt": voice_prompt
        or f"{voice_type} voice, {personality.lower()} personality, {speaking_style.lower()} delivery, {age}.",
    }


def _dl(character, scene, purpose, text, emotion, speed, emphasis, preset, voice_prompt=""):
    return {
        "character": character,
        "scene": scene,
        "purpose": purpose,
        "text": text,
        "emotion": emotion,
        "speed": speed,
        "emphasis": emphasis,
        "preset": preset,
        "voice_prompt": voice_prompt
        or f"Speak with a {emotion.lower()} tone, {speed.lower()} pace, emphasizing {emphasis}.",
    }


def _mu(title, purpose, mood, genre, instruments, energy, tempo, duration, loop, prompt):
    return {
        "title": title,
        "purpose": purpose,
        "mood": mood,
        "genre": genre,
        "instruments": instruments,
        "energy": energy,
        "tempo": tempo,
        "duration": duration,
        "loop": loop,
        "generation_prompt": prompt,
    }


def _sfx(name, purpose, trigger, description, duration, prompt):
    return {
        "name": name,
        "purpose": purpose,
        "trigger": trigger,
        "description": description,
        "duration": duration,
        "generation_prompt": prompt,
    }


def _amb(name, purpose, description, loop, prompt):
    return {
        "name": name,
        "purpose": purpose,
        "description": description,
        "loop": loop,
        "generation_prompt": prompt,
    }


_THEMES = {
    "water": {
        "title": "Surfing Game",
        "voices": [
            _th("Coach Kai", "Surfing instructor", "Energetic, supportive and confident",
                "Strong and warm", "Adult", "Friendly and motivational",
                "Encouraging, excited, proud", "am_michael"),
            _th("Announcer", "Competition announcer", "Showman, larger than life",
                "Big and booming", "Adult", "Rapid, theatrical",
                "Excited, hype", "em_santa"),
            _th("Riva", "Rival surfer", "Cocky, confident rival",
                "Young and sharp", "Young adult", "Playful and taunting",
                "Smug, surprised", "am_onyx"),
            _th("Old Salt", "Lighthouse narrator", "Wise, weathered storyteller",
                "Calm and gravelly", "Elderly", "Slow and reflective",
                "Warm, nostalgic", "am_adam"),
        ],
        "dialogue": [
            _dl("Coach Kai", "Introduction", "Welcome the player and start the tutorial",
                "Welcome to the waves! Keep your balance and watch the next swell.",
                "Encouraging", "Moderate", "balance, next swell", "am_michael"),
            _dl("Coach Kai", "Tutorial", "Teach the first trick",
                "Drop in low, shift your weight, and flick the tail for a turn.",
                "Instructive", "Moderate", "weight, turn", "am_michael"),
            _dl("Announcer", "Gameplay", "Announce a big wave",
                "Here comes a monster set! Clear the lineup that header is closing in.",
                "Hype", "Fast", "monster set, closing in", "em_santa"),
            _dl("Riva", "Victory", "React when the player wins",
                "You own this break today, but the low tide rematch is mine.",
                "Gritted", "Moderate", "rematch", "am_onyx"),
            _dl("Old Salt", "Story progression", "Set up the final reef challenge",
                "Only one surfer has ever ridden the Reef King's wave. Legend says it still waits.",
                "Mysterious", "Slow", "Reef King, waits", "am_adam"),
        ],
        "music": [
            _mu("Coastal Menu", "Main menu", "Laid-back and sunny", "Tropical chill",
                "Steel drums, acoustic guitar, soft percussion", "Low", "92", "24",
                True, "Laid-back tropical chill track with steel drums and soft percussion, sunny beach mood, instrumental, no vocals, seamless loop."),
            _mu("Gameplay Surf Theme", "Main gameplay soundtrack", "Energetic and adventurous",
                "Tropical electronic", "Percussion, bright synths, energetic bass", "High", "125", "40",
                True, "High-energy tropical electronic surf soundtrack with rhythmic percussion, bright synths and energetic bass, adventurous ocean atmosphere, instrumental, no vocals, seamless loop."),
            _mu("Victory Fanfare", "Victory", "Triumphant and bright", "Celebratory pop",
                "Horns, drums, glockenspiel", "High", "110", "16",
                False, "Triumphant celebratory fanfare with bright horns and drums, victorious atmosphere, instrumental, no vocals."),
        ],
        "sfx": [
            _sfx("Wave Impact", "Landing", "Player lands after jumping a wave",
                "Heavy water splash with a short surfboard impact", "1 second",
                "Realistic ocean wave impact with a sharp surfboard splash, energetic water movement, short duration, clean isolated sound."),
            _sfx("Board Spray", "Movement", "Player carves a turn",
                "Frothy water spray from the board edge", "Short",
                "Bright frothy water spray sound, quick and bright, short duration, isolated and clean."),
            _sfx("Crowd Cheer", "Reward", "Player earns points in a competition",
                "Distant cheering crowd swell", "2 seconds",
                "Distant crowd cheering swell, warm and celebratory, medium duration, mixed but clear."),
        ],
        "ambience": [
            _amb("Ocean Beach Loop", "Menu and free-surf states",
                "Gentle waves, seagulls, soft wind and water movement", True,
                "Natural tropical ocean ambience with gentle waves, soft wind and distant seabirds, seamless loop, relaxing but immersive."),
        ],
    },
    "space": {
        "title": "Space Game",
        "voices": [
            _th("Mission Control", "Mission coordinator", "Calm, professional and reassuring",
                "Smooth, even", "Adult", "Clear and controlled",
                "Calm, focused, urgent", "am_adam"),
            _th("ORBI", "Ship AI", "Helpful, dryly witty synthetic",
                "Synthetic and clean", "Ageless", "Precise, crisp",
                "Neutral, amused", "em_alex"),
            _th("Captain Vega", "Player's commander", "Bold and charismatic leader",
                "Firm and warm", "Adult", "Commanding and motivational",
                "Determined, proud", "am_michael"),
            _th("Nova", "Alien scout", "Curious and youthful",
                "Bright and agile", "Young", "By-the-cheek, playful",
                "Curious, excited", "af_nova"),
        ],
        "dialogue": [
            _dl("Mission Control", "Introduction", "Establish the mission",
                "Omega station online. Squad, we are go for the relay run.",
                "Professional", "Moderate", "go, relay run", "am_adam"),
            _dl("ORBI", "Warning", "Alert player to low oxygen",
                "WARNING: oxygen reserves at fifteen percent. Recommend immediate resupply.",
                "Neutral-alert", "Fast", "fifteen percent, resupply", "em_alex"),
            _dl("Captain Vega", "Mission instructions", "Give the objective",
                "Take the ring gate, hold the lane, and bring us home picture perfect.",
                "Confident", "Moderate", "ring gate, hold the lane", "am_michael"),
        ],
        "music": [
            _mu("Nebula Drift", "Exploration", "Vast and ambient", "Ambient synthwave",
                "Pads, soft arps, sub bass", "Low", "70", "40",
                True, "Vast ambient synthwave pad track with soft arpeggios and sub bass, drifting space mood, instrumental, no vocals, seamless loop."),
            _mu("Combat Pulse", "Combat", "Tense and driving", "Dark electronic",
                "Percussion, distorted synth, pulse bass", "High", "150", "36",
                True, "Driving dark electronic combat theme with pulsing bass and tense percussion, high energy, instrumental, no vocals, seamless loop."),
        ],
        "sfx": [
            _sfx("Engine Burn", "Movement", "Throttling the engines",
                "Deep rumble with a rising whoosh", "2 seconds",
                "Deep thruster rumble with a rising whoosh, powerful and smooth, short duration, isolated and clean."),
            _sfx("Laser Blast", "Combat", "Firing the ship cannon",
                "Sharp ripping pulse with echo", "Short",
                "Sharp ripping laser pulse with a slight echo, futuristic and clean, short duration, isolated."),
            _sfx("Pilot Warning", "System", "HUD alert",
                "Chirping double beep", "Brief hit",
                "Quick chirping double beep UI alert, bright and clear, very short, isolated sound."),
        ],
        "ambience": [
            _amb("Deep Space Hiss", "Spaceflight moments",
                "Subtle hiss, distant hums and fading radio chatter", True,
                "Subtle deep space ambience with soft hiss, distant machinery hum and faint radio signals, seamless loop, immersive and quiet."),
        ],
    },
    "fantasy": {
        "title": "Fantasy Game",
        "voices": [
            _th("Alaric", "Wizard mentor", "Wise, kind and slightly mischievous",
                "Warm, rich", "Elderly", "Measured and mystical",
                "Calm, amused, serious", "am_adam"),
            _th("Lyra", "Heroine", "Brave, empathetic protagonist",
                "Warm and expressive", "Young adult", "Determined and heartfelt",
                "Hopeful, fierce, tender", "af_heart"),
            _th("Malakar", "Dark sorcerer", "Cold, menacing antagonist",
                "Deep, dark", "Ageless", "Slow, deliberate threats",
                "Smug, furious", "am_onyx"),
            _th("Eldrin", "Elven guide", "Graceful and ethereal",
                "Ethereal, airy", "Ancient", "Soft and lyrical",
                "Serene, sorrowful", "af_bella"),
        ],
        "dialogue": [
            _dl("Alaric", "Introduction", "Introduce the threat",
                "The shard was sealed for a thousand years, child. Tonight it wakes.",
                "Mysterious", "Slow", "sealed, wakes", "am_adam"),
            _dl("Lyra", "Mission instructions", "Set the quest",
                "If I hold the amulet clear of the rites, you shatter the seal from outside.",
                "Determined", "Moderate", "amulet, shatter the seal", "af_heart"),
            _dl("Malakar", "Story progression", "Villain ultimatum",
                "Bow to the shadow, and I will let your village keep its embers.",
                "Menacing", "Slow", "bow, embers", "am_onyx"),
        ],
        "music": [
            _mu("Tavern Shadows", "Safe hubs", "Warm yet mysterious", "Folk fantasy",
                "Lute, violin, soft drums", "Low", "84", "36",
                True, "Warm folk fantasy tavern tune with lute and violin, cozy but mysterious, instrumental, no vocals, seamless loop."),
            _mu("Epic Battle", "Combat", "Heroic and urgent", "Epic orchestral",
                "Brass, strings, timpani", "High", "140", "44",
                True, "Heroic epic orchestral battle theme with brass, strings and timpani, urgent and sweeping, instrumental, no vocals, seamless loop."),
        ],
        "sfx": [
            _sfx("Spell Cast", "Action", "Casting a spell",
                "Whooshing burst with magical chime", "1 second",
                "Whooshing magical burst with a bright chime, arcane and clean, short duration, isolated sound."),
            _sfx("Sword Strike", "Combat", "Hitting an enemy",
                "Metallic clash with recoil", "Short",
                "Metallic sword clash with a sharp recoil ring, quick and clean, short duration, isolated."),
            _sfx("Potion Fizz", "Pickup", "Drinking a heal potion",
                "Bubbling pop", "Short",
                "Bubbling potion fizz with a light pop, playful and clean, short duration, isolated."),
        ],
        "ambience": [
            _amb("Mystic Forest", "Exploration areas",
                "Wind through leaves, distant birds, faint magic hum", True,
                "Mystic forest ambience with wind, rustling leaves, distant birds and a faint magical hum, seamless loop, immersive."),
        ],
    },
    "racing": {
        "title": "Racing Game",
        "voices": [
            _th("Turbo T", "Race announcer", "High-energy showman",
                "Big and punchy", "Adult", "Rapid-fire enthusiasm",
                "Hype, dramatic", "em_santa"),
            _th("Mechanic Ed", "Garage coach", "Pragmatic, friendly expert",
                "Raspy and grounded", "Adult", "Casual and direct",
                "Helpful, excited", "am_michael"),
            _th("Viper", "Rival driver", "Slick and competitive",
                "Smooth, cocky", "Young adult", "Smirking one-liners",
                "Smug, surprised", "am_onyx"),
        ],
        "dialogue": [
            _dl("Turbo T", "Countdown", "Start the race",
                "Engines ready! Lights out, and it is GO!",
                "Hype", "Fast", "lights out, GO", "em_santa"),
            _dl("Mechanic Ed", "Tutorial", "Explain drifting",
                "Brake late, flick the wheel, and let the throttle pull you through the corner.",
                "Instructive", "Moderate", "brake late, throttle", "am_michael"),
            _dl("Viper", "Defeat", "Rival taunt after losing",
                "Nice try, rookie. My crew will be polishing that trophy all week.",
                "Smug", "Moderate", "trophy, all week", "am_onyx"),
        ],
        "music": [
            _mu("Garage Menu", "Main menu", "Cool and gritty", "City electronic",
                "Synth, electric guitar, heavy drums", "Medium", "100", "30",
                True, "Cool city electronic garage track with synth and electric guitar, gritty mood, instrumental, no vocals, seamless loop."),
            _mu("Race Groove", "Races", "Pumping and fast", "Electronic rock",
                "Driving drums, bass, leads", "High", "160", "48",
                True, "Pumping electronic rock race theme with driving drums and bass, fast and intense, instrumental, no vocals, seamless loop."),
        ],
        "sfx": [
            _sfx("Engine Rev", "Movement", "Revving at the start line",
                "Deep engine rise to a roar", "2 seconds",
                "Deep racing engine rev rising to a full roar, powerful and clean, short duration, isolated."),
            _sfx("Tire Screech", "Drifting", "A sharp corner drift",
                "High-pitched tire skid", "Short",
                "Sharp high-pitched tire screech during a drift, quick and aggressive, short duration, isolated sound."),
            _sfx("Checkpoint", "Progress", "Passing a checkpoint",
                "Energetic beep with whoosh", "Brief hit",
                "Energetic two-tone checkpoint beep with a light whoosh, bright and clear, very short, isolated."),
        ],
        "ambience": [
            _amb("Paddock Crowd", "Menus and garage",
                "Distant crowd, engines, tool clatter", True,
                "Racing paddock ambience with distant crowd noise, engine rumble and workshop clatter, seamless loop, low and immersive."),
        ],
    },
    "generic": {
        "title": "New Game",
        "voices": [
            _th("Storyteller", "Narrator", "Warm, wise and engaging",
                "Calm and even", "Middle aged", "Measured, cinematic",
                "Steady, emotional", "am_adam"),
            _th("Gunner", "Hero", "Brave and dependable",
                "Grounded and warm", "Young adult", "Confident and direct",
                "Hopeful, determined", "am_michael"),
            _th("Tilly", "Tutorial guide", "Cheerful and encouraging",
                "Bright and light", "Young", "Playful and upbeat",
                "Cheerful, excited", "af_sky"),
        ],
        "dialogue": [
            _dl("Storyteller", "Introduction", "Set the scene",
                "Every journey begins the same way: one step forward and no looking back.",
                "Warm", "Moderate", "one step, no looking back", "am_adam"),
            _dl("Tilly", "Tutorial", "Teach the core action",
                "Use the prompt to act, and keep an eye on your resources up here.",
                "Encouraging", "Moderate", "act, resources", "af_sky"),
            _dl("Gunner", "Victory", "Celebrate a win",
                "That is how it is done. Round two, and this time we finish the route.",
                "Triumphant", "Fast", "done, finish the route", "am_michael"),
        ],
        "music": [
            _mu("Title Theme", "Main menu", "Hopeful and clear", "Epic trailer music",
                "Strings, choir, soft drums", "Medium", "100", "20",
                True, "Hopeful epic title theme with warm strings and soft drums, cinematic and clear, instrumental, no vocals, seamless loop."),
            _mu("Main Gameplay", "Gameplay loop", "Active and motivating", "Modern electronic",
                "Drums, bass, bright leads", "High", "128", "36",
                True, "Active modern electronic gameplay track with driving drums, bass and bright leads, motivating energy, instrumental, no vocals, seamless loop."),
        ],
        "sfx": [
            _sfx("UI Click", "Interface", "Pressing a button",
                "Soft click with slight pop", "Brief hit",
                "Soft UI button click with a light pop, clean and subtle, very short, isolated sound."),
            _sfx("Pickup", "Collectible", "Collecting an item",
                "Bright rising coin-like chime", "Short",
                "Bright rising collectible chime, cheerful and clean, short duration, isolated."),
            _sfx("Success", "Reward", "Completing an objective",
                "Satisfying major chord ding", "1 second",
                "Satisfying major-chord success ding, warm and positive, short duration, isolated."),
        ],
        "ambience": [
            _amb("Main Hub", "Hub and menus",
                "Soft room tone with distant activity", True,
                "Soft game hub ambience with gentle room tone and distant activity, subtle and calm, seamless loop."),
        ],
    },
}


def fallback_game_plan(idea: str, language: str = "English", style: str = "You decide") -> AudioPlan:
    idea = idea or "Create a video game"
    key = _theme_for(idea)
    theme = _THEMES[key]

    plan = AudioPlan(
        project=ProjectPlan(
            title=theme["title"][:120],
            description=idea[:500],
            language=language[:50],
        ),
        voices=_list_of(theme, "voices", CharacterVoice),
        dialogue=_list_of(theme, "dialogue", DialogueItem),
        music=_list_of(theme, "music", MusicTrack),
        sfx=_list_of(theme, "sfx", SfxItem),
        ambience=_list_of(theme, "ambience", AmbienceItem),
    )
    return _backfill_plan(plan)


def _theme_for(idea: str) -> str:
    t = idea.lower()
    if any(k in t for k in ("surf", "wave", "ocean", "water", "beach", "swim", "kayak", "boat", "pirate", "sea", "ship")):
        return "water"
    if any(k in t for k in ("space", "star", "planet", "galaxy", "alien", "cosmic", "rocket", "astro", "moon", "orbit")):
        return "space"
    if any(k in t for k in ("fantasy", "magic", "spell", "dragon", "knight", "wizard", "castle", "sword", "elf", "dungeon", "myth")):
        return "fantasy"
    if any(k in t for k in ("race", "racing", "car", "kart", "drift", "motor", "rally", "speed")):
        return "racing"
    return "generic"