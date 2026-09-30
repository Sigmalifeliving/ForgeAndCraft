"""Ollama Client for Roblox GUI Generation.

Communicates with the local Ollama instance (default: http://127.0.0.1:11434)
using preferred coding models (Qwen-Coder, e.g. qwen2.5-coder / qwen3-coder).
Enforces structured JSON output matching ForgeCraft's Roblox GUI specification.
Includes procedural fallback generation if Ollama is starting or downloading models.
"""

import json
import logging
import os
import re
import urllib.error
import urllib.request
from typing import Any, Tuple

from .validator import parse_and_repair_gui_json

logger = logging.getLogger("forgecraft.gui.ollama")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
PREFERRED_MODELS = [
    os.getenv("OLLAMA_MODEL", "qwen2.5-coder:1.5b"),
    "qwen2.5-coder:1.5b",
    "qwen2.5-coder:latest",
    "qwen2.5-coder",
    "qwen2.5-coder:7b",
    "qwen3-coder:latest",
    "qwen3-coder",
    "codellama",
    "deepseek-coder",
    "llama3",
    "mistral",
]

GUI_SYSTEM_PROMPT = """\
You are an elite, veteran Roblox UI/UX Designer and Technical Artist specializing in modern Roblox Studio interfaces (ScreenGui, Frames, Layouts, Effects).

Your job is to generate a structured Roblox GUI specification in JSON based on the user's request.

STRICT RULES:
1. Output ONLY a single valid JSON object. No conversational markdown, no backticks, no code explanations.
2. The root object MUST have:
   "type": "ScreenGui",
   "name": "MeaningfulName",
   "properties": { "resetOnSpawn": false },
   "children": [ ... ]
3. ONLY use these 17 supported Roblox component classes:
   - ScreenGui, Frame, ScrollingFrame, ViewportFrame
   - TextLabel, TextButton, TextBox, ImageLabel, ImageButton
   - UIListLayout, UIGridLayout, UIPageLayout, UIPadding
   - UICorner, UIStroke, UIGradient, UIScale, UIAspectRatioConstraint
4. Use true Roblox coordinate structures:
   - "size": [scaleX, offsetX, scaleY, offsetY] (e.g. [0.7, 0, 0.75, 0] for main window, [0.5, 0, 0.08, 0] for buttons)
   - "position": [scaleX, offsetX, scaleY, offsetY]
   - "anchorPoint": [x, y] (e.g. [0.5, 0.5] for centered dialogs with position [0.5, 0, 0.5, 0])
   - "backgroundColor": "#RRGGBB" hex string
   - "backgroundTransparency": float 0.0 to 1.0
   - "text": string for TextLabel, TextButton, TextBox
   - "textColor": "#RRGGBB" hex string
   - "textSize": integer (14 to 28)
   - "font": Roblox font name (e.g. "GothamBold", "FredokaOne", "SourceSansBold")
   - "cornerRadius": [scale, offset] for UICorner (e.g. [0, 10])
   - "strokeColor": "#RRGGBB", "strokeThickness": float for UIStroke
5. PROFESSIONAL UI ARCHITECTURE:
   - Build a complete, cohesive hierarchy (MainFrame -> TitleBar, SearchBar, ContentGrid / ScrollingFrame -> ItemCards -> Name, Price, PurchaseButton).
   - Use sensible, semantic names for all objects (e.g. "CloseButton", "SearchBar", "ItemCard1", "PurchaseBtn").
   - Include rounded corners (UICorner) and glowing accents (UIStroke) matching the requested theme (dark neon, modern glass, tactical, etc.).
"""

MODIFY_SYSTEM_PROMPT = """\
You are an expert Roblox UI Designer modifying an existing Roblox GUI specification.
You will receive:
1. CURRENT GUI SPECIFICATION (JSON)
2. USER MODIFICATION REQUEST

RULES:
1. Return ONLY the complete updated JSON specification matching the ForgeCraft GUI schema.
2. Preserve existing elements and hierarchy unless explicitly asked to remove or replace them.
3. Apply the requested changes (e.g. colors, adding components, resizing, changing text, re-theming) cleanly.
4. Output raw JSON only.
"""


def check_ollama_status() -> Tuple[bool, list[str], str]:
    """Checks if Ollama is running and returns available models."""
    try:
        req = urllib.request.Request(f"{OLLAMA_BASE_URL}/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = [m["name"] for m in data.get("models", [])]
            return True, models, "Ollama is running"
    except Exception as e:
        return False, [], f"Ollama connection error: {str(e)}"


def _select_model(available_models: list[str]) -> str:
    """Selects the best matching model from available models."""
    for preferred in PREFERRED_MODELS:
        for avail in available_models:
            if preferred in avail or avail.startswith(preferred.split(":")[0]):
                return avail
    if available_models:
        return available_models[0]
    return PREFERRED_MODELS[0]


def query_ollama(prompt: str, system_prompt: str = GUI_SYSTEM_PROMPT, model: str | None = None) -> str:
    """Sends prompt to local Ollama and returns raw string response."""
    is_up, available, _ = check_ollama_status()
    if not is_up or not available:
        raise ConnectionError("Ollama is not running or no model is installed.")

    selected_model = model or _select_model(available)
    logger.info("Using Ollama model: %s (available: %s)", selected_model, available)

    payload = {
        "model": selected_model,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.15,
            "num_predict": 8192,
        },
    }

    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    # Retry once on timeout since the first call may cold-load the model
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                raw = res.get("response", "")
                logger.info("Ollama responded (%d chars) on attempt %d", len(raw), attempt + 1)
                return raw
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt == 0:
                logger.warning("Ollama attempt 1 failed (%s), retrying...", str(e))
                continue
            raise


def generate_gui_with_ai(prompt: str, theme: str | None = None, model: str | None = None) -> Tuple[dict[str, Any], str]:
    """Generates a complete GUI specification from user prompt using Ollama with procedural fallback."""
    full_user_prompt = f"Create a production-ready Roblox UI for: {prompt}"
    if theme:
        full_user_prompt += f" with theme style: {theme}"

    # Try Ollama first
    try:
        raw_ai_text = query_ollama(full_user_prompt, system_prompt=GUI_SYSTEM_PROMPT, model=model)
        gui_dict = parse_and_repair_gui_json(raw_ai_text)
        logger.info("Successfully generated GUI via Ollama AI")
        return gui_dict, "ollama (qwen2.5-coder:1.5b)"
    except Exception as err:
        logger.warning("Ollama generation unavailable (%s). Using smart procedural UI synthesizer.", str(err))
        # Use intelligent procedural synthesizer based on user prompt semantics
        fallback_gui = synthesize_procedural_gui(prompt, theme=theme)
        return fallback_gui, "forgecraft-procedural-synthesizer"


def modify_gui_with_ai(current_gui: dict[str, Any], change_prompt: str, model: str | None = None) -> Tuple[dict[str, Any], str]:
    """Modifies an existing GUI specification using iterative natural language instructions."""
    combined_prompt = f"""\
CURRENT GUI SPECIFICATION:
{json.dumps(current_gui, indent=2)}

USER REQUESTED MODIFICATION:
{change_prompt}

Please output the updated JSON with these modifications applied.
"""
    try:
        raw_ai_text = query_ollama(combined_prompt, system_prompt=MODIFY_SYSTEM_PROMPT, model=model)
        modified_gui = parse_and_repair_gui_json(raw_ai_text)
        return modified_gui, "ollama (qwen-coder)"
    except Exception as err:
        logger.warning("Ollama modification unavailable (%s). Applying procedural modification.", str(err))
        updated_gui = modify_procedural_gui(current_gui, change_prompt)
        return updated_gui, "forgecraft-procedural-modifier"


def synthesize_procedural_gui(prompt: str, theme: str | None = None) -> dict[str, Any]:
    """High-fidelity procedural generator that crafts responsive Roblox GUI specs for any prompt."""
    p_lower = prompt.lower()

    # Theme colors
    is_neon = "neon" in p_lower or "cyber" in p_lower or theme == "modern"
    is_pop = "pop" in p_lower or "simulator" in p_lower or "cartoon" in p_lower or theme == "cartoon"
    is_tactical = "tactical" in p_lower or "military" in p_lower or theme == "tactical"

    if is_neon:
        bg_main = "#0d1117"
        card_bg = "#161b22"
        accent = "#00f0ff"
        accent_btn = "#00e5ff"
        text_primary = "#ffffff"
        text_sub = "#8b949e"
        stroke_color = "#00f0ff"
    elif is_pop:
        bg_main = "#2a1b4e"
        card_bg = "#3d2b6b"
        accent = "#ffb703"
        accent_btn = "#fb8500"
        text_primary = "#ffffff"
        text_sub = "#ffd166"
        stroke_color = "#ffb703"
    elif is_tactical:
        bg_main = "#141e17"
        card_bg = "#1e2d23"
        accent = "#10b981"
        accent_btn = "#059669"
        text_primary = "#ecfdf5"
        text_sub = "#6ee7b7"
        stroke_color = "#10b981"
    else:
        bg_main = "#12141c"
        card_bg = "#1e2230"
        accent = "#6366f1"
        accent_btn = "#4f46e5"
        text_primary = "#ffffff"
        text_sub = "#94a3b8"
        stroke_color = "#6366f1"

    # 1. WEAPON SHOP / STORE GENERATOR
    if any(w in p_lower for w in ("weapon", "shop", "store", "buy", "market", "items", "guns")):
        # Extract item count if specified (e.g. "6 weapons")
        count_match = re.search(r"(\d+)\s*(?:weapons|items|cards|guns|swords)", p_lower)
        num_items = int(count_match.group(1)) if count_match else 6
        num_items = max(2, min(12, num_items))

        weapons_data = [
            {"name": "Plasma Katana", "price": "2,500 Coins", "color": "#ff007f"},
            {"name": "Quantum Blaster", "price": "4,200 Coins", "color": "#00f0ff"},
            {"name": "Vortex Bow", "price": "1,800 Coins", "color": "#a855f7"},
            {"name": "Titan Heavy Hammer", "price": "3,100 Coins", "color": "#f59e0b"},
            {"name": "Shadow Daggers", "price": "1,200 Coins", "color": "#10b981"},
            {"name": "Solar Flare Sniper", "price": "5,000 Coins", "color": "#ef4444"},
            {"name": "Cryo Cannon", "price": "3,800 Coins", "color": "#38bdf8"},
            {"name": "Thunder Cleaver", "price": "2,900 Coins", "color": "#eab308"},
            {"name": "Void Wand", "price": "4,500 Coins", "color": "#8b5cf6"},
            {"name": "Gravity Grenade", "price": "950 Coins", "color": "#14b8a6"},
            {"name": "Cyber Crossbow", "price": "2,100 Coins", "color": "#f97316"},
            {"name": "Omega Shield", "price": "1,500 Coins", "color": "#06b6d4"},
        ]

        item_cards = []
        for i in range(num_items):
            item = weapons_data[i % len(weapons_data)]
            item_cards.append({
                "type": "Frame",
                "name": f"ItemCard_{i+1}",
                "properties": {
                    "size": [0, 160, 0, 195],
                    "backgroundColor": card_bg,
                    "backgroundTransparency": 0.15,
                },
                "children": [
                    {"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 8]}},
                    {"type": "UIStroke", "name": "Stroke", "properties": {"strokeColor": stroke_color, "strokeThickness": 1.0}},
                    {
                        "type": "Frame",
                        "name": "IconBox",
                        "properties": {
                            "size": [0.85, 0, 0.42, 0],
                            "position": [0.5, 0, 0.06, 0],
                            "anchorPoint": [0.5, 0],
                            "backgroundColor": "#000000",
                            "backgroundTransparency": 0.4,
                        },
                        "children": [
                            {"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 6]}},
                            {"type": "UIStroke", "name": "Glow", "properties": {"strokeColor": item["color"], "strokeThickness": 1.5}},
                            {
                                "type": "TextLabel",
                                "name": "WeaponSymbol",
                                "properties": {
                                    "size": [1, 0, 1, 0],
                                    "text": "⚔️" if i % 2 == 0 else "⚡",
                                    "textSize": 28,
                                    "textColor": "#ffffff",
                                    "backgroundTransparency": 1.0,
                                },
                                "children": [],
                            },
                        ],
                    },
                    {
                        "type": "TextLabel",
                        "name": "ItemName",
                        "properties": {
                            "size": [0.9, 0, 0.14, 0],
                            "position": [0.5, 0, 0.52, 0],
                            "anchorPoint": [0.5, 0],
                            "text": item["name"],
                            "textColor": text_primary,
                            "textSize": 14,
                            "font": "GothamBold",
                            "backgroundTransparency": 1.0,
                        },
                        "children": [],
                    },
                    {
                        "type": "TextLabel",
                        "name": "ItemPrice",
                        "properties": {
                            "size": [0.9, 0, 0.12, 0],
                            "position": [0.5, 0, 0.67, 0],
                            "anchorPoint": [0.5, 0],
                            "text": f"🪙 {item['price']}",
                            "textColor": "#ffd166",
                            "textSize": 12,
                            "font": "SourceSansBold",
                            "backgroundTransparency": 1.0,
                        },
                        "children": [],
                    },
                    {
                        "type": "TextButton",
                        "name": "PurchaseBtn",
                        "properties": {
                            "size": [0.85, 0, 0.16, 0],
                            "position": [0.5, 0, 0.81, 0],
                            "anchorPoint": [0.5, 0],
                            "text": "BUY",
                            "textColor": "#ffffff",
                            "textSize": 13,
                            "font": "GothamBold",
                            "backgroundColor": accent_btn,
                            "backgroundTransparency": 0.0,
                        },
                        "children": [
                            {"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 6]}},
                        ],
                    },
                ],
            })

        # Main window structure
        main_frame_children = [
            {"type": "UICorner", "name": "WindowCorner", "properties": {"cornerRadius": [0, 12]}},
            {"type": "UIStroke", "name": "WindowStroke", "properties": {"strokeColor": stroke_color, "strokeThickness": 1.5}},
            # Title Bar
            {
                "type": "Frame",
                "name": "TitleBar",
                "properties": {
                    "size": [1.0, 0, 0, 52],
                    "position": [0, 0, 0, 0],
                    "backgroundColor": "#000000",
                    "backgroundTransparency": 0.35,
                },
                "children": [
                    {
                        "type": "TextLabel",
                        "name": "ShopTitle",
                        "properties": {
                            "size": [0.7, 0, 1.0, 0],
                            "position": [0, 20, 0, 0],
                            "text": "FORGECRAFT WEAPON ARSENAL",
                            "textColor": accent,
                            "textSize": 18,
                            "font": "GothamBold",
                            "backgroundTransparency": 1.0,
                        },
                        "children": [],
                    },
                    {
                        "type": "TextButton",
                        "name": "CloseButton",
                        "properties": {
                            "size": [0, 32, 0, 32],
                            "position": [1, -44, 0.5, 0],
                            "anchorPoint": [0, 0.5],
                            "text": "✕",
                            "textColor": "#ffffff",
                            "textSize": 16,
                            "font": "GothamBold",
                            "backgroundColor": "#ef4444",
                        },
                        "children": [
                            {"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 6]}},
                        ],
                    },
                ],
            },
            # Search Bar
            {
                "type": "TextBox",
                "name": "SearchBar",
                "properties": {
                    "size": [0.94, 0, 0, 36],
                    "position": [0.5, 0, 0, 62],
                    "anchorPoint": [0.5, 0],
                    "text": "",
                    "placeholder": "🔍 Search weapons by name or rarity...",
                    "textColor": text_primary,
                    "textSize": 14,
                    "backgroundColor": "#000000",
                    "backgroundTransparency": 0.5,
                },
                "children": [
                    {"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 8]}},
                    {"type": "UIStroke", "name": "Stroke", "properties": {"strokeColor": stroke_color, "strokeThickness": 1.0}},
                    {"type": "UIPadding", "name": "Padding", "properties": {"paddingLeft": [0, 14], "paddingRight": [0, 14]}},
                ],
            },
            # Scrolling Item Grid
            {
                "type": "ScrollingFrame",
                "name": "ItemGridFrame",
                "properties": {
                    "size": [0.94, 0, 0.72, 0],
                    "position": [0.5, 0, 0, 108],
                    "anchorPoint": [0.5, 0],
                    "backgroundColor": "#000000",
                    "backgroundTransparency": 0.65,
                },
                "children": [
                    {"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 8]}},
                    {
                        "type": "UIGridLayout",
                        "name": "GridLayout",
                        "properties": {
                            "cellSize": [0, 160, 0, 195],
                            "cellPadding": [0, 14, 0, 14],
                            "fillDirection": "Horizontal",
                        },
                        "children": [],
                    },
                    {"type": "UIPadding", "name": "GridPadding", "properties": {"paddingTop": [0, 12], "paddingLeft": [0, 12]}},
                    *item_cards,
                ],
            },
        ]

        return {
            "type": "ScreenGui",
            "name": "WeaponShopGui",
            "properties": {"resetOnSpawn": False},
            "children": [
                {
                    "type": "Frame",
                    "name": "MainShopFrame",
                    "properties": {
                        "size": [0.75, 0, 0.82, 0],
                        "position": [0.5, 0, 0.5, 0],
                        "anchorPoint": [0.5, 0.5],
                        "backgroundColor": bg_main,
                        "backgroundTransparency": 0.1,
                    },
                    "children": main_frame_children,
                }
            ],
        }

    # 2. INVENTORY / BACKPACK
    elif any(w in p_lower for w in ("inventory", "backpack", "storage", "bag", "chest")):
        slots = []
        for s in range(16):
            has_item = s < 6
            slots.append({
                "type": "TextButton",
                "name": f"Slot_{s+1}",
                "properties": {
                    "size": [0, 68, 0, 68],
                    "backgroundColor": card_bg,
                    "backgroundTransparency": 0.3,
                    "text": "🛡️" if s == 0 else "🗡️" if s == 1 else "🧪" if s == 2 else "" if not has_item else "💎",
                    "textSize": 22,
                },
                "children": [
                    {"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 6]}},
                    {"type": "UIStroke", "name": "Stroke", "properties": {"strokeColor": accent if has_item else "#334155", "strokeThickness": 1.0}},
                ],
            })

        return {
            "type": "ScreenGui",
            "name": "InventoryGui",
            "properties": {"resetOnSpawn": False},
            "children": [
                {
                    "type": "Frame",
                    "name": "InventoryFrame",
                    "properties": {
                        "size": [0.52, 0, 0.65, 0],
                        "position": [0.5, 0, 0.5, 0],
                        "anchorPoint": [0.5, 0.5],
                        "backgroundColor": bg_main,
                        "backgroundTransparency": 0.15,
                    },
                    "children": [
                        {"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 12]}},
                        {"type": "UIStroke", "name": "Stroke", "properties": {"strokeColor": stroke_color, "strokeThickness": 1.5}},
                        {
                            "type": "TextLabel",
                            "name": "Title",
                            "properties": {
                                "size": [0.8, 0, 0, 44],
                                "position": [0, 16, 0, 0],
                                "text": "PLAYER INVENTORY (6/16)",
                                "textColor": accent,
                                "textSize": 16,
                                "font": "GothamBold",
                                "backgroundTransparency": 1.0,
                            },
                            "children": [],
                        },
                        {
                            "type": "TextButton",
                            "name": "CloseBtn",
                            "properties": {
                                "size": [0, 28, 0, 28],
                                "position": [1, -38, 0, 8],
                                "text": "✕",
                                "backgroundColor": "#ef4444",
                                "textColor": "#ffffff",
                            },
                            "children": [{"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 6]}}],
                        },
                        {
                            "type": "Frame",
                            "name": "SlotGrid",
                            "properties": {
                                "size": [0.92, 0, 0.78, 0],
                                "position": [0.5, 0, 0, 56],
                                "anchorPoint": [0.5, 0],
                                "backgroundTransparency": 1.0,
                            },
                            "children": [
                                {
                                    "type": "UIGridLayout",
                                    "name": "Grid",
                                    "properties": {"cellSize": [0, 68, 0, 68], "cellPadding": [0, 10, 0, 10]},
                                    "children": [],
                                },
                                *slots,
                            ],
                        },
                    ],
                }
            ],
        }

    # 3. PLAYER HUD / STATS
    elif any(w in p_lower for w in ("hud", "health", "stat", "status", "level", "mana")):
        return {
            "type": "ScreenGui",
            "name": "PlayerHudGui",
            "properties": {"resetOnSpawn": False},
            "children": [
                {
                    "type": "Frame",
                    "name": "HudContainer",
                    "properties": {
                        "size": [0.32, 0, 0, 110],
                        "position": [0, 24, 1, -134],
                        "backgroundColor": bg_main,
                        "backgroundTransparency": 0.2,
                    },
                    "children": [
                        {"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 10]}},
                        {"type": "UIStroke", "name": "Stroke", "properties": {"strokeColor": stroke_color, "strokeThickness": 1.5}},
                        # Health Bar
                        {
                            "type": "Frame",
                            "name": "HealthBarBg",
                            "properties": {"size": [0.9, 0, 0, 22], "position": [0.05, 0, 0, 16], "backgroundColor": "#222", "backgroundTransparency": 0.2},
                            "children": [
                                {"type": "UICorner", "name": "C", "properties": {"cornerRadius": [0, 6]}},
                                {"type": "Frame", "name": "Fill", "properties": {"size": [0.85, 0, 1, 0], "backgroundColor": "#ef4444"}, "children": [{"type": "UICorner", "name": "C", "properties": {"cornerRadius": [0, 6]}}]},
                                {"type": "TextLabel", "name": "Text", "properties": {"size": [1, 0, 1, 0], "text": "HP: 850 / 1000", "textColor": "#ffffff", "textSize": 12, "backgroundTransparency": 1.0}, "children": []},
                            ],
                        },
                        # Shield Bar
                        {
                            "type": "Frame",
                            "name": "ShieldBarBg",
                            "properties": {"size": [0.9, 0, 0, 22], "position": [0.05, 0, 0, 44], "backgroundColor": "#222", "backgroundTransparency": 0.2},
                            "children": [
                                {"type": "UICorner", "name": "C", "properties": {"cornerRadius": [0, 6]}},
                                {"type": "Frame", "name": "Fill", "properties": {"size": [0.6, 0, 1, 0], "backgroundColor": "#3b82f6"}, "children": [{"type": "UICorner", "name": "C", "properties": {"cornerRadius": [0, 6]}}]},
                                {"type": "TextLabel", "name": "Text", "properties": {"size": [1, 0, 1, 0], "text": "SHIELD: 600 / 1000", "textColor": "#ffffff", "textSize": 12, "backgroundTransparency": 1.0}, "children": []},
                            ],
                        },
                        # Level text
                        {
                            "type": "TextLabel",
                            "name": "LevelBadge",
                            "properties": {"size": [0.9, 0, 0, 24], "position": [0.05, 0, 0, 74], "text": "⚡ LEVEL 42  |  🪙 12,450 Coins", "textColor": "#ffd166", "textSize": 13, "backgroundTransparency": 1.0},
                            "children": [],
                        },
                    ],
                }
            ],
        }

    # 4. DEFAULT GENERAL WINDOW (Quests, Settings, Dialog, Leaderboard, etc.)
    else:
        title = prompt[:36].title() or "Custom Roblox Interface"
        return {
            "type": "ScreenGui",
            "name": "CustomGameGui",
            "properties": {"resetOnSpawn": False},
            "children": [
                {
                    "type": "Frame",
                    "name": "DialogFrame",
                    "properties": {
                        "size": [0.6, 0, 0.65, 0],
                        "position": [0.5, 0, 0.5, 0],
                        "anchorPoint": [0.5, 0.5],
                        "backgroundColor": bg_main,
                        "backgroundTransparency": 0.15,
                    },
                    "children": [
                        {"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 12]}},
                        {"type": "UIStroke", "name": "Stroke", "properties": {"strokeColor": stroke_color, "strokeThickness": 1.5}},
                        {
                            "type": "TextLabel",
                            "name": "Header",
                            "properties": {
                                "size": [0.85, 0, 0, 48],
                                "position": [0, 20, 0, 0],
                                "text": title.upper(),
                                "textColor": accent,
                                "textSize": 18,
                                "font": "GothamBold",
                                "backgroundTransparency": 1.0,
                            },
                            "children": [],
                        },
                        {
                            "type": "TextButton",
                            "name": "CloseBtn",
                            "properties": {
                                "size": [0, 32, 0, 32],
                                "position": [1, -44, 0, 10],
                                "text": "✕",
                                "backgroundColor": "#ef4444",
                                "textColor": "#ffffff",
                            },
                            "children": [{"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 6]}}],
                        },
                        {
                            "type": "TextLabel",
                            "name": "ContentText",
                            "properties": {
                                "size": [0.9, 0, 0.4, 0],
                                "position": [0.5, 0, 0, 68],
                                "anchorPoint": [0.5, 0],
                                "text": f"Interactive game interface generated for: {prompt}",
                                "textColor": text_primary,
                                "textSize": 15,
                                "backgroundTransparency": 1.0,
                            },
                            "children": [],
                        },
                        {
                            "type": "TextButton",
                            "name": "ActionButton",
                            "properties": {
                                "size": [0.5, 0, 0, 42],
                                "position": [0.5, 0, 1, -58],
                                "anchorPoint": [0.5, 0],
                                "text": "CONFIRM ACTION",
                                "textColor": "#ffffff",
                                "textSize": 14,
                                "font": "GothamBold",
                                "backgroundColor": accent_btn,
                            },
                            "children": [{"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 8]}}],
                        },
                    ],
                }
            ],
        }


def modify_procedural_gui(current_gui: dict[str, Any], change_prompt: str) -> dict[str, Any]:
    """Applies direct surgical modifications to the GUI tree based on user instructions."""
    cp_lower = change_prompt.lower()
    updated = json.loads(json.dumps(current_gui))  # deepcopy

    # 1. Color / Theme changes (e.g. "make buttons blue", "change to green", "neon pink")
    target_color = None
    if "blue" in cp_lower or "cyan" in cp_lower:
        target_color = "#00b4d8"
    elif "red" in cp_lower or "crimson" in cp_lower:
        target_color = "#ef4444"
    elif "green" in cp_lower or "emerald" in cp_lower:
        target_color = "#10b981"
    elif "purple" in cp_lower or "violet" in cp_lower:
        target_color = "#a855f7"
    elif "pink" in cp_lower or "magenta" in cp_lower:
        target_color = "#f43f5e"
    elif "gold" in cp_lower or "yellow" in cp_lower:
        target_color = "#f59e0b"

    def apply_recursive(el: dict[str, Any]):
        t = el.get("type", "")
        props = el.setdefault("properties", {})

        # If user said "buttons", modify TextButton / ImageButton
        if "button" in cp_lower and target_color and t in ("TextButton", "ImageButton"):
            props["backgroundColor"] = target_color
        # If user asked for theme / stroke changes
        elif "stroke" in cp_lower and target_color and t == "UIStroke":
            props["strokeColor"] = target_color
        # If user asked for background changes
        elif "background" in cp_lower and target_color and t in ("Frame", "ScrollingFrame"):
            props["backgroundColor"] = target_color

        # If user requested to change text or title
        if "title" in cp_lower and "change" in cp_lower and t == "TextLabel" and "title" in el.get("name", "").lower():
            # Extract quoted or target string
            new_text_match = re.search(r'["\']([^"\']+)["\']', change_prompt)
            if new_text_match:
                props["text"] = new_text_match.group(1).upper()

        for child in el.get("children", []):
            if isinstance(child, dict):
                apply_recursive(child)

    apply_recursive(updated)

    # 2. Add search bar if requested and doesn't exist
    if "search bar" in cp_lower or "search" in cp_lower:
        def check_and_add_search(el: dict[str, Any]):
            children = el.get("children", [])
            has_search = any("search" in str(c.get("name", "")).lower() for c in children)
            if not has_search and el.get("type") == "Frame" and len(children) > 1:
                # Insert search bar
                new_search = {
                    "type": "TextBox",
                    "name": "SearchBar",
                    "properties": {
                        "size": [0.94, 0, 0, 36],
                        "position": [0.5, 0, 0, 56],
                        "anchorPoint": [0.5, 0],
                        "text": "",
                        "placeholder": "🔍 Search items...",
                        "textColor": "#ffffff",
                        "textSize": 14,
                        "backgroundColor": "#000000",
                        "backgroundTransparency": 0.5,
                    },
                    "children": [
                        {"type": "UICorner", "name": "Corner", "properties": {"cornerRadius": [0, 8]}},
                        {"type": "UIStroke", "name": "Stroke", "properties": {"strokeColor": "#00f0ff", "strokeThickness": 1.0}},
                    ],
                }
                children.insert(1, new_search)
                return True
            for child in children:
                if isinstance(child, dict) and check_and_add_search(child):
                    return True
            return False

        check_and_add_search(updated)

    return updated
