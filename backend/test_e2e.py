"""End-to-end API test: register, login, create game plan via Mistral"""
import json
import urllib.request
import urllib.error

BASE = "http://localhost:8000/api"

def api_post(endpoint, body=None, token=None):
    url = f"{BASE}{endpoint}"
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:500]
        print(f"HTTP {e.code}: {body}")
        return None

# 1. Register (may fail if user already exists)
print("=== REGISTER ===")
reg = api_post("/auth/register", {
    "username": "testpipeline",
    "email": "pipeline@test.com",
    "password": "testtest123"
})
print("Register result:", reg)

# 2. Login
print("\n=== LOGIN ===")
login = api_post("/auth/login", {
    "username": "testpipeline",
    "password": "testtest123"
})
if not login:
    print("Login failed")
    exit(1)
token = login["access_token"]
print("Got token:", token[:20] + "...")

# 3. Call game-plan with LIVE mode
print("\n=== GAME PLAN (LIVE AI) ===")
plan_result = api_post("/voice/game-plan", {
    "idea": "Create a fast-paced surfing game with an energetic tropical atmosphere",
    "language": "English",
    "style": "You decide",
    "budget": "low",
    "mode": "live"
}, token=token)

if plan_result:
    print("SOURCE:", plan_result.get("source"))
    print("GAME_ID:", plan_result.get("game_id"))
    print("STATUS:", plan_result.get("status"))
    plan = plan_result.get("plan", {})
    project = plan.get("project", {})
    print("TITLE:", project.get("title"))
    print("VOICES:", len(plan.get("voices", [])))
    print("DIALOGUE:", len(plan.get("dialogue", [])))
    print("MUSIC:", len(plan.get("music", [])))
    print("SFX:", len(plan.get("sfx", [])))
    print("AMBIENCE:", len(plan.get("ambience", [])))
    
    # Check if voices have proper presets
    for v in plan.get("voices", []):
        print(f"  Voice: {v.get('character')} -> kokoro: {v.get('kokoro_voice')}, preset: {v.get('preset')}")
    
    print("\nSUCCESS - Full E2E pipeline works via API!")
else:
    print("FAILED - Game plan returned None")
