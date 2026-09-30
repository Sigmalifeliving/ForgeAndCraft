"""Roblox GUI Specification Validator & Auto-Repair Engine.

Ensures that AI-generated GUI JSON strictly conforms to the ForgeCraft GUI schema.
If an AI generates minor schema anomalies (e.g. "Button" instead of "TextButton",
missing children array, string coordinates instead of numeric UDim2), this module
auto-repairs the structure gracefully without failing.
"""

import json
import re
from typing import Any, Tuple
from .schema import SUPPORTED_ROBLOX_TYPES, GuiSpecification

# Synonym mapping to automatically fix common LLM class name hallucinations
COMPONENT_ALIASES = {
    "button": "TextButton",
    "btn": "TextButton",
    "textbutton": "TextButton",
    "label": "TextLabel",
    "txt": "TextLabel",
    "textlabel": "TextLabel",
    "input": "TextBox",
    "textfield": "TextBox",
    "textbox": "TextBox",
    "searchbar": "TextBox",
    "image": "ImageLabel",
    "img": "ImageLabel",
    "imagelabel": "ImageLabel",
    "imagebutton": "ImageButton",
    "imgbutton": "ImageButton",
    "div": "Frame",
    "container": "Frame",
    "box": "Frame",
    "card": "Frame",
    "panel": "Frame",
    "window": "Frame",
    "modal": "Frame",
    "scroll": "ScrollingFrame",
    "scroller": "ScrollingFrame",
    "scrollingframe": "ScrollingFrame",
    "list": "UIListLayout",
    "uilist": "UIListLayout",
    "uilistlayout": "UIListLayout",
    "grid": "UIGridLayout",
    "uigrid": "UIGridLayout",
    "uigridlayout": "UIGridLayout",
    "corner": "UICorner",
    "rounded": "UICorner",
    "uicorner": "UICorner",
    "stroke": "UIStroke",
    "border": "UIStroke",
    "outline": "UIStroke",
    "uistroke": "UIStroke",
    "gradient": "UIGradient",
    "uigradient": "UIGradient",
    "padding": "UIPadding",
    "uipadding": "UIPadding",
    "aspect": "UIAspectRatioConstraint",
    "aspectratio": "UIAspectRatioConstraint",
    "uiaspectratioconstraint": "UIAspectRatioConstraint",
    "scale": "UIScale",
    "uiscale": "UIScale",
    "viewport": "ViewportFrame",
    "viewportframe": "ViewportFrame",
}


def _clean_json_string(raw: str) -> str:
    """Extracts JSON substring from LLM markdown fences or conversational wrapping."""
    text = raw.strip()
    # Match ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        text = match.group(1).strip()
    else:
        # Find outer braces if surrounded by prose
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            text = text[start : end + 1]

    # Remove trailing commas that break strict json.loads
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return text


def _normalize_udim2(val: Any, default: list[float] | None = None) -> list[float]:
    """Ensures a [scaleX, offsetX, scaleY, offsetY] 4-element numeric array."""
    if default is None:
        default = [1.0, 0.0, 1.0, 0.0]

    if isinstance(val, (list, tuple)):
        nums = []
        for x in val:
            try:
                nums.append(float(x))
            except (ValueError, TypeError):
                nums.append(0.0)
        while len(nums) < 4:
            nums.append(0.0)
        return nums[:4]

    if isinstance(val, dict):
        sx = float(val.get("scaleX", val.get("ScaleX", 0)))
        ox = float(val.get("offsetX", val.get("OffsetX", 0)))
        sy = float(val.get("scaleY", val.get("ScaleY", 0)))
        oy = float(val.get("offsetY", val.get("OffsetY", 0)))
        return [sx, ox, sy, oy]

    return default


def _normalize_vector2(val: Any, default: list[float] | None = None) -> list[float]:
    """Ensures a [x, y] 2-element numeric array."""
    if default is None:
        default = [0.0, 0.0]
    if isinstance(val, (list, tuple)):
        nums = []
        for x in val:
            try:
                nums.append(float(x))
            except (ValueError, TypeError):
                nums.append(0.0)
        while len(nums) < 2:
            nums.append(0.0)
        return nums[:2]
    return default


def _sanitize_element(el: Any, depth: int = 0) -> dict[str, Any]:
    """Recursively validates and sanitizes a single GUI element dict."""
    if not isinstance(el, dict):
        return {
            "type": "Frame",
            "name": "InvalidElement",
            "properties": {"size": [1.0, 0, 1.0, 0]},
            "children": [],
        }

    raw_type = str(el.get("type", "Frame")).strip()
    norm_type_key = raw_type.lower().replace(" ", "").replace("_", "")
    comp_type = COMPONENT_ALIASES.get(norm_type_key, raw_type)

    if comp_type not in SUPPORTED_ROBLOX_TYPES:
        comp_type = "Frame"

    name = str(el.get("name") or comp_type).strip() or comp_type
    props = el.get("properties") or {}
    if not isinstance(props, dict):
        props = {}

    sanitized_props: dict[str, Any] = {}
    for k, v in props.items():
        k_clean = str(k).strip()
        # CamelCase / standard keys
        if k_clean.lower() in ("size", "dimensions"):
            sanitized_props["size"] = _normalize_udim2(v, [1.0, 0, 1.0, 0] if depth == 0 else [0.5, 0, 0.5, 0])
        elif k_clean.lower() in ("position", "pos"):
            sanitized_props["position"] = _normalize_udim2(v, [0.0, 0, 0.0, 0])
        elif k_clean.lower() in ("anchorpoint", "anchor"):
            sanitized_props["anchorPoint"] = _normalize_vector2(v, [0.0, 0.0])
        elif k_clean.lower() in ("backgroundcolor", "backgroundcolor3", "color", "bgcolor"):
            sanitized_props["backgroundColor"] = str(v)
        elif k_clean.lower() in ("backgroundtransparency", "transparency", "bgtransparency"):
            try:
                sanitized_props["backgroundTransparency"] = max(0.0, min(1.0, float(v)))
            except (ValueError, TypeError):
                sanitized_props["backgroundTransparency"] = 0.0
        elif k_clean.lower() in ("text", "title", "label"):
            sanitized_props["text"] = str(v)
        elif k_clean.lower() in ("textcolor", "textcolor3"):
            sanitized_props["textColor"] = str(v)
        elif k_clean.lower() in ("textsize", "fontsize", "size_text"):
            try:
                sanitized_props["textSize"] = int(float(v))
            except (ValueError, TypeError):
                sanitized_props["textSize"] = 16
        elif k_clean.lower() in ("font",):
            sanitized_props["font"] = str(v)
        elif k_clean.lower() in ("cornerradius", "radius"):
            if isinstance(v, (list, tuple)) and len(v) >= 2:
                sanitized_props["cornerRadius"] = [float(v[0]), float(v[1])]
            else:
                try:
                    sanitized_props["cornerRadius"] = [0.0, float(v)]
                except (ValueError, TypeError):
                    sanitized_props["cornerRadius"] = [0.0, 8.0]
        elif k_clean.lower() in ("stroke", "strokecolor", "bordercolor"):
            sanitized_props["strokeColor"] = str(v)
        elif k_clean.lower() in ("strokethickness", "thickness"):
            try:
                sanitized_props["strokeThickness"] = float(v)
            except (ValueError, TypeError):
                sanitized_props["strokeThickness"] = 1.0
        elif k_clean.lower() in ("gradient", "colors"):
            sanitized_props["gradientColors"] = v
        elif k_clean.lower() in ("filldirection", "direction"):
            sanitized_props["fillDirection"] = "Horizontal" if "horiz" in str(v).lower() else "Vertical"
        elif k_clean.lower() in ("padding", "cellpadding", "cellsize", "visible", "zindex", "layoutorder"):
            sanitized_props[k_clean] = v
        else:
            sanitized_props[k_clean] = v

    # Sanitize children
    raw_children = el.get("children") or []
    if not isinstance(raw_children, list):
        raw_children = []

    sanitized_children = [_sanitize_element(child, depth + 1) for child in raw_children if isinstance(child, dict)]

    return {
        "type": comp_type,
        "name": name,
        "properties": sanitized_props,
        "children": sanitized_children,
    }


def parse_and_repair_gui_json(raw_text: str) -> dict[str, Any]:
    """Parses raw text from LLM, repairs formatting, and returns a sanitized GUI spec dict."""
    cleaned = _clean_json_string(raw_text)
    try:
        data = json.loads(cleaned)
    except Exception as exc:
        raise ValueError(f"Malformed JSON from AI model: {str(exc)}\nRaw string: {raw_text[:200]}")

    if not isinstance(data, dict):
        raise ValueError("AI output must be a top-level JSON object.")

    # Ensure root is ScreenGui
    root_type = data.get("type", "ScreenGui")
    if root_type != "ScreenGui":
        # Wrap root inside a ScreenGui container
        wrapped_element = _sanitize_element(data, depth=1)
        return {
            "type": "ScreenGui",
            "name": data.get("name", "ForgeCraftGui"),
            "properties": {"resetOnSpawn": False},
            "children": [wrapped_element],
        }

    # Root is ScreenGui
    sanitized_root = _sanitize_element(data, depth=0)
    sanitized_root["type"] = "ScreenGui"
    return sanitized_root


def validate_gui_spec(spec_dict: dict[str, Any]) -> Tuple[bool, str, dict[str, Any]]:
    """Validates and guarantees that the specification conforms to GuiSpecification."""
    try:
        sanitized = _sanitize_element(spec_dict)
        if sanitized.get("type") != "ScreenGui":
            sanitized = {
                "type": "ScreenGui",
                "name": sanitized.get("name", "ScreenGui"),
                "properties": {},
                "children": [sanitized],
            }
        # Validate through Pydantic
        GuiSpecification(**sanitized)
        return True, "Valid", sanitized
    except Exception as e:
        return False, str(e), spec_dict
