"""Roblox GUI Schema Definition.

Defines the supported Roblox GUI component types, properties, and strict JSON schemas.
The JSON specification serves as the single source of truth for both:
1. Live Web React Preview (ForgeCraft GUI Engine)
2. Roblox Studio Export (.rbxm XML model & .luau scripts)
"""

from typing import Any, Literal
from pydantic import BaseModel, Field

# 17 Supported Roblox GUI Component Classes
SUPPORTED_ROBLOX_TYPES = [
    # Containers & Base
    "ScreenGui",
    "Frame",
    "ScrollingFrame",
    "ViewportFrame",
    # Elements & Controls
    "TextLabel",
    "TextButton",
    "TextBox",
    "ImageLabel",
    "ImageButton",
    # Layouts & Organization
    "UIListLayout",
    "UIGridLayout",
    "UIPageLayout",
    "UIPadding",
    # Modifiers & Visual Effects
    "UICorner",
    "UIStroke",
    "UIGradient",
    "UIScale",
    "UIAspectRatioConstraint",
]

GuiComponentType = Literal[
    "ScreenGui",
    "Frame",
    "ScrollingFrame",
    "ViewportFrame",
    "TextLabel",
    "TextButton",
    "TextBox",
    "ImageLabel",
    "ImageButton",
    "UIListLayout",
    "UIGridLayout",
    "UIPageLayout",
    "UIPadding",
    "UICorner",
    "UIStroke",
    "UIGradient",
    "UIScale",
    "UIAspectRatioConstraint",
]


class GuiElement(BaseModel):
    type: str
    name: str = "Element"
    properties: dict[str, Any] = Field(default_factory=dict)
    children: list["GuiElement"] = Field(default_factory=list)


GuiElement.model_rebuild()


class GuiSpecification(BaseModel):
    type: Literal["ScreenGui"] = "ScreenGui"
    name: str = "ForgeCraftGui"
    properties: dict[str, Any] = Field(default_factory=dict)
    children: list[GuiElement] = Field(default_factory=list)


class GuiGenerateRequest(BaseModel):
    prompt: str = Field(min_length=2, max_length=4000)
    current_gui: dict[str, Any] | None = None
    theme: str | None = None
    model: str | None = None


class GuiModifyRequest(BaseModel):
    prompt: str = ""
    change_prompt: str | None = None
    current_gui: dict[str, Any] = Field(default_factory=dict)
    gui: dict[str, Any] | None = None
    model: str | None = None

    def get_prompt(self) -> str:
        return self.prompt or self.change_prompt or ""

    def get_gui(self) -> dict[str, Any]:
        return self.current_gui or self.gui or {}


class GuiExportRequest(BaseModel):
    gui: dict[str, Any]
    format: Literal["rbxm", "luau", "zip"] = "rbxm"
