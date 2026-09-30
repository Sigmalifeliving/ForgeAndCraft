"""Prompt-to-Audio Intent Analyzer.

Analyzes natural language prompts to determine the intended audio category,
sub-type, sound characteristics, and parameters:
- SFX (Sound Effects): bells, breaking glass, explosions, lasers, door creaks, footsteps, etc.
- Music / Gametrack: horror soundtracks, synthwave, 8-bit, orchestral, medieval, etc.
- Ambience: atmospheric drones, wind, ocean, forest, cave, space hum, etc.
- Voice: character dialogue, narration, spoken speech (extracts clean text).
"""

import re
from typing import TypedDict


class AudioIntent(TypedDict):
    category: str       # "sfx" | "music" | "ambience" | "voice"
    sub_type: str       # e.g. "bell", "breaking_glass", "horror_gametrack", "laser"
    name: str           # User-facing title for the asset
    mood: str           # e.g. "horror", "epic", "cheerful", "eerie"
    duration: float     # Recommended duration in seconds
    clean_prompt: str   # Cleaned text or dialogue line
    voice_id: str       # Kokoro voice ID if voice category


def analyze_audio_prompt(prompt: str, user_category: str = "auto", preferred_voice: str = "am_michael") -> AudioIntent:
    p = prompt.strip()
    p_lower = p.lower()

    # If user explicitly specified a category (and it's not "auto")
    explicit_category = user_category.lower() if user_category and user_category != "auto" else None

    # Check for quotes or explicit speech dialogue patterns first
    quote_match = re.search(r'["\']([^"\']{2,})["\']', p)
    dialogue_match = re.search(r'(?:saying|says|speaks|yells|shouts|whispers|voice of an? [a-z0-9_ -]+ saying):?\s*(.+)$', p, re.IGNORECASE)

    # 1. MUSIC / GAMETRACK DETECTION
    is_music = explicit_category == "music" or any(
        kw in p_lower for kw in (
            "gametrack", "game track", "soundtrack", "background music", "bgm", "theme music",
            "music track", "theme song", "battle theme", "boss theme", "menu music", "synthwave track",
            "orchestral track", "chiptune track", "game music", "music for my game"
        )
    ) or (
        "music" in p_lower and any(w in p_lower for w in ("horror", "action", "fantasy", "game", "loop", "beat"))
    )

    if is_music:
        mood = "cinematic"
        if any(w in p_lower for w in ("horror", "scary", "spooky", "creepy", "dark", "eerie", "haunting", "abandoned")):
            mood = "horror"
            name = "Horror Gametrack"
        elif any(w in p_lower for w in ("synthwave", "cyberpunk", "futuristic", "sci-fi", "techno", "neon")):
            mood = "synthwave"
            name = "Cyberpunk Synthwave Track"
        elif any(w in p_lower for w in ("8-bit", "chiptune", "retro", "arcade", "pixel", "nes")):
            mood = "chiptune"
            name = "Retro Arcade Gametrack"
        elif any(w in p_lower for w in ("medieval", "fantasy", "tavern", "rpg", "celtic")):
            mood = "medieval"
            name = "Medieval RPG Gametrack"
        elif any(w in p_lower for w in ("cheerful", "happy", "sunny", "tropical", "beach", "fun")):
            mood = "cheerful"
            name = "Upbeat Game Track"
        elif any(w in p_lower for w in ("epic", "battle", "heroic", "orchestral", "intense")):
            mood = "epic"
            name = "Epic Battle Gametrack"
        else:
            name = "Game Soundtrack"

        return AudioIntent(
            category="music",
            sub_type=f"{mood}_gametrack",
            name=name,
            mood=mood,
            duration=16.0,
            clean_prompt=p,
            voice_id="",
        )

    # 2. AMBIENCE DETECTION
    is_ambience = explicit_category == "ambience" or any(
        kw in p_lower for kw in (
            "ambience", "ambient", "atmosphere", "soundscape", "background noise",
            "room tone", "wind howling", "rain ambience", "forest ambience",
            "cave ambience", "ocean waves ambience", "dark drone"
        )
    )

    if is_ambience:
        if any(w in p_lower for w in ("horror", "hospital", "haunted", "dungeon", "dark")):
            sub_type = "horror_drone"
            name = "Dark Atmospheric Drone"
            mood = "horror"
        elif any(w in p_lower for w in ("ocean", "beach", "sea", "coastal", "waves")):
            sub_type = "ocean_waves"
            name = "Ocean Waves Ambience"
            mood = "calm"
        elif any(w in p_lower for w in ("space", "station", "cockpit", "spaceship", "sci-fi")):
            sub_type = "space_hum"
            name = "Sci-Fi Space Hum"
            mood = "sci-fi"
        elif any(w in p_lower for w in ("forest", "jungle", "nature", "woods")):
            sub_type = "forest_wind"
            name = "Forest Canopy Wind"
            mood = "nature"
        else:
            sub_type = "general_ambience"
            name = "Ambient Soundscape"
            mood = "ambient"

        return AudioIntent(
            category="ambience",
            sub_type=sub_type,
            name=name,
            mood=mood,
            duration=16.0,
            clean_prompt=p,
            voice_id="",
        )

    # 3. SOUND EFFECTS (SFX) DETECTION
    # Key phrases matching user's specific request and common game SFX:
    # "voice of a bell", "sound of a bell", "voice of the breaking glass", "breaking glass", etc.
    is_sfx = explicit_category == "sfx" or any(
        kw in p_lower for kw in (
            "sound effect", "sfx", "foley", "sound of", "voice of a bell", "voice of the bell",
            "voice of bell", "breaking glass", "glass break", "shattering glass", "glass shatter",
            "bell", "chime", "gong", "toll", "ding", "dong", "door creak", "creaking door",
            "laser", "blast", "explosion", "bomb", "boom", "punch", "sword", "hit", "impact",
            "coin", "pickup", "footstep", "footsteps", "growl", "roar", "gunshot", "shotgun",
            "pistol", "rifle", "teleport", "magic spell", "whoosh", "alarm", "siren", "thunder"
        )
    )

    if is_sfx:
        # Check specific SFX types
        if any(w in p_lower for w in ("glass", "shatter", "window break")):
            return AudioIntent(
                category="sfx",
                sub_type="breaking_glass",
                name="Breaking Glass SFX",
                mood="impact",
                duration=1.8,
                clean_prompt=p,
                voice_id="",
            )
        elif any(w in p_lower for w in ("bell", "chime", "gong", "toll", "ding", "church bell", "temple bell")):
            return AudioIntent(
                category="sfx",
                sub_type="bell",
                name="Resonant Bell Chime",
                mood="metallic",
                duration=3.5,
                clean_prompt=p,
                voice_id="",
            )
        elif any(w in p_lower for w in ("door", "creak", "wood", "scrape")):
            return AudioIntent(
                category="sfx",
                sub_type="door_creak",
                name="Creaky Door SFX",
                mood="creepy",
                duration=1.6,
                clean_prompt=p,
                voice_id="",
            )
        elif any(w in p_lower for w in ("laser", "pew", "beam", "blaster", "sci-fi blast")):
            return AudioIntent(
                category="sfx",
                sub_type="laser",
                name="Sci-Fi Blaster Beam",
                mood="sci-fi",
                duration=0.8,
                clean_prompt=p,
                voice_id="",
            )
        elif any(w in p_lower for w in ("explosion", "bomb", "blast", "detonation", "grenade")):
            return AudioIntent(
                category="sfx",
                sub_type="explosion",
                name="Heavy Blast Explosion",
                mood="destructive",
                duration=2.2,
                clean_prompt=p,
                voice_id="",
            )
        elif any(w in p_lower for w in ("hit", "punch", "sword", "clash", "blade", "impact", "strike")):
            return AudioIntent(
                category="sfx",
                sub_type="impact",
                name="Combat Strike Impact",
                mood="action",
                duration=0.9,
                clean_prompt=p,
                voice_id="",
            )
        elif any(w in p_lower for w in ("coin", "pickup", "gem", "collect", "powerup", "item")):
            return AudioIntent(
                category="sfx",
                sub_type="coin",
                name="Arcade Coin Pickup",
                mood="positive",
                duration=0.6,
                clean_prompt=p,
                voice_id="",
            )
        elif any(w in p_lower for w in ("gunshot", "gun", "shot", "rifle", "pistol", "bullet", "firearm")):
            return AudioIntent(
                category="sfx",
                sub_type="gunshot",
                name="Gunshot Weapon SFX",
                mood="action",
                duration=1.2,
                clean_prompt=p,
                voice_id="",
            )
        elif any(w in p_lower for w in ("thunder", "lightning", "storm strike")):
            return AudioIntent(
                category="sfx",
                sub_type="thunder",
                name="Thunder Crack & Rumble",
                mood="dramatic",
                duration=3.0,
                clean_prompt=p,
                voice_id="",
            )
        elif any(w in p_lower for w in ("magic", "spell", "sparkle", "fairy", "enchant")):
            return AudioIntent(
                category="sfx",
                sub_type="magic",
                name="Magical Spell Sparkle",
                mood="mystical",
                duration=1.5,
                clean_prompt=p,
                voice_id="",
            )
        elif any(w in p_lower for w in ("ui", "click", "button", "menu", "beep")):
            return AudioIntent(
                category="sfx",
                sub_type="ui_click",
                name="UI Menu Click",
                mood="interface",
                duration=0.3,
                clean_prompt=p,
                voice_id="",
            )
        else:
            return AudioIntent(
                category="sfx",
                sub_type="generic_sfx",
                name="Sound Effect",
                mood="action",
                duration=1.5,
                clean_prompt=p,
                voice_id="",
            )

    # 4. SPOKEN VOICE / DIALOGUE DETECTION
    # If the user explicitly chose "voice", or there are quotes / dialogue cues, or text looks like speech:
    clean_spoken = p
    voice_id = preferred_voice or "am_michael"

    if quote_match:
        clean_spoken = quote_match.group(1).strip()
    elif dialogue_match:
        clean_spoken = dialogue_match.group(1).strip().strip('"\'')
    else:
        # Strip common meta prompt prefixes like "i want a voice saying", "speak this:", "say:"
        prefix_pattern = r'^(?:i want (?:a|the)? voice (?:saying|to say)?|speak(?: this)?:?|say:?|voice:?)\s*'
        clean_spoken = re.sub(prefix_pattern, '', clean_spoken, flags=re.IGNORECASE).strip().strip('"\'')

    # Character matching for voice ID if specified in prompt
    if any(w in p_lower for w in ("narrator", "elder", "old man", "storyteller", "wise")):
        voice_id = "am_adam"
    elif any(w in p_lower for w in ("villain", "dark", "evil", "menacing", "monster", "demon")):
        voice_id = "am_onyx"
    elif any(w in p_lower for w in ("robot", "synthetic", "cyborg", "machine", "ai")):
        voice_id = "em_alex"
    elif any(w in p_lower for w in ("heroine", "woman", "female", "guide", "mother")):
        voice_id = "af_heart"
    elif any(w in p_lower for w in ("elf", "fairy", "mystic", "ethereal", "goddess")):
        voice_id = "af_bella"
    elif any(w in p_lower for w in ("scout", "young", "kid", "boy", "girl", "adventurer")):
        voice_id = "af_nova"
    elif any(w in p_lower for w in ("cheerful", "bright", "companion", "happy")):
        voice_id = "af_sky"
    elif any(w in p_lower for w in ("announcer", "booming", "giant")):
        voice_id = "em_santa"

    # If it's pure short text without any SFX / music keywords, or user chose voice
    return AudioIntent(
        category="voice",
        sub_type="speech",
        name=clean_spoken[:40] or "Spoken Voice",
        mood="spoken",
        duration=max(1.0, len(clean_spoken) / 12.0),
        clean_prompt=clean_spoken or p,
        voice_id=voice_id,
    )
