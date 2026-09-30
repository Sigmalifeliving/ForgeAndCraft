"""Quick Mistral API test"""
import urllib.request, json
from app.config import settings

body = json.dumps({
    "model": "ministral-8b-latest",
    "messages": [{"role": "user", "content": "Return JSON: {\"msg\": \"hello\"}"}],
    "max_tokens": 100,
    "response_format": {"type": "json_object"},
}).encode()

req = urllib.request.Request(
    "https://api.mistral.ai/v1/chat/completions",
    data=body,
    headers={
        "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
        "Content-Type": "application/json",
    },
    method="POST",
)

try:
    resp = urllib.request.urlopen(req, timeout=30)
    raw = json.loads(resp.read())
    print("SUCCESS:", raw["choices"][0]["message"]["content"][:200])
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR {e.code}:", e.read().decode()[:300])
except Exception as e:
    print("ERROR:", e)
