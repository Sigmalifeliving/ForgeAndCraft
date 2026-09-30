"""Test full analyze_game_audio function"""
import json
import sys
from app.services.mistral_service import analyze_game_audio

try:
    result = analyze_game_audio(
        idea="Create a dark horror survival game where the player explores an abandoned hospital",
        language="English",
        style="You decide",
        budget="low",
        mode="live",
    )
    print("SOURCE:", result["source"])
    print("GAME_ID:", result["game_id"])
    plan = result["plan"]
    print("TITLE:", plan.project.title)
    print("GENRE:", plan.project.genre or plan.direction.genre)
    print("VOICES:", len(plan.voices))
    print("DIALOGUE:", len(plan.dialogue))
    print("MUSIC:", len(plan.music))
    print("SFX:", len(plan.sfx))
    print("AMBIENCE:", len(plan.ambience))
    for v in plan.voices:
        print(f"  Voice: {v.character} ({v.kokoro_voice})")
    for d in plan.dialogue[:3]:
        print(f"  Dialogue: [{d.character}] {d.text[:60]}")
    print("\nSUCCESS - Full AI pipeline works!")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
