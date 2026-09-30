import json
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import User
from app.security import create_access_token

db = SessionLocal()
user = db.query(User).first()
if not user:
    user = User(username='testadmin', email='admin@test.com', password_hash='hash')
    db.add(user)
    db.commit()
    db.refresh(user)

token = create_access_token(user.id)
client = TestClient(app)
headers = {'Authorization': f'Bearer {token}'}

prompts = [
    ("Horror Hospital", "Create a dark horror survival game where the player explores an abandoned hospital."),
    ("Tropical Surfing", "Create a colorful tropical surfing game with an energetic tropical atmosphere."),
    ("Medieval RPG", "Create a medieval fantasy RPG where the player fights monsters in a dark forest."),
    ("Cyberpunk Racing", "Create a futuristic cyberpunk racing game through neon-lit highways."),
]

results = {}

print("================================================================")
print("RUNNING 4 PROMPTS LIVE THROUGH MISTRAL AUDIO DIRECTOR & KOKORO")
print("================================================================")

for label, prompt_text in prompts:
    print(f"\n--- Testing: {label} ---")
    res = client.post(
        "/api/voice/game-plan",
        json={"idea": prompt_text, "mode": "live", "budget": "medium"},
        headers=headers,
    )
    if res.status_code != 200:
        print(f"FAILED: {res.status_code} {res.text}")
        continue

    data = res.json()
    game_id = data["game_id"]
    source = data["source"]
    plan = data["plan"]
    direction = plan.get("direction", {})
    voices = plan.get("voices", [])
    dialogue = plan.get("dialogue", [])
    music = plan.get("music", [])
    sfx = plan.get("sfx", [])
    ambience = plan.get("ambience", [])

    print(f"Source: {source} | Game ID: {game_id}")
    print(f"Title: {plan.get('project', {}).get('title')}")
    print(f"Genre: {direction.get('genre')}")
    print(f"Mood: {direction.get('primary_mood')}")
    print(f"Voices ({len(voices)}): {[v['character'] + ' (' + v.get('kokoro_voice', v.get('preset', '')) + ')' for v in voices[:3]]}")
    print(f"Dialogue ({len(dialogue)}): {[d['text'][:40] + '...' for d in dialogue[:2]]}")
    print(f"Music ({len(music)}): {[m['title'] for m in music[:2]]}")
    print(f"SFX ({len(sfx)}): {[s['name'] for s in sfx[:3]]}")
    print(f"Ambience ({len(ambience)}): {[a['name'] for a in ambience[:2]]}")

    # Generate one voice asset (Kokoro)
    if voices:
        v_asset_id = voices[0]["asset_id"]
        v_res = client.post(
            "/api/voice/generate-asset",
            json={"game_id": game_id, "asset_id": v_asset_id},
            headers=headers,
        )
        print(f"-> Voice Gen: {v_res.status_code} Status: {v_res.json().get('status')} File: {v_res.json().get('file_path')}")

    # Generate one SFX asset (Local SFX)
    if sfx:
        s_asset_id = sfx[0]["asset_id"]
        s_res = client.post(
            "/api/voice/generate-asset",
            json={"game_id": game_id, "asset_id": s_asset_id},
            headers=headers,
        )
        print(f"-> SFX Gen: {s_res.status_code} Status: {s_res.json().get('status')} Duration: {s_res.json().get('duration')}s")

        # Test regeneration on that SFX
        regen_res = client.post(
            "/api/voice/generate-asset",
            json={"game_id": game_id, "asset_id": s_asset_id, "regenerate": True},
            headers=headers,
        )
        print(f"-> SFX Regen: {regen_res.status_code} Status: {regen_res.json().get('status')}")

    # Generate one Music asset (Local Music)
    if music:
        m_asset_id = music[0]["asset_id"]
        m_res = client.post(
            "/api/voice/generate-asset",
            json={"game_id": game_id, "asset_id": m_asset_id},
            headers=headers,
        )
        print(f"-> Music Gen: {m_res.status_code} Status: {m_res.json().get('status')} Duration: {m_res.json().get('duration')}s")

    # Export Roblox package
    export_res = client.get(f"/api/voice/games/{game_id}/export-roblox", headers=headers)
    print(f"-> Roblox Export: {export_res.status_code} Zip bytes: {len(export_res.content)}")

    results[label] = {
        "title": plan.get("project", {}).get("title"),
        "genre": direction.get("genre"),
        "voices": [v["character"] for v in voices],
        "sfx_count": len(sfx),
        "music_count": len(music),
    }

print("\n================================================================")
print("VARIETY CHECK ACROSS ALL 4 PLANS")
print("================================================================")
for label, data in results.items():
    print(f"{label}: {data['title']} | Genre: {data['genre']} | Characters: {data['voices'][:2]} | SFX: {data['sfx_count']}")
