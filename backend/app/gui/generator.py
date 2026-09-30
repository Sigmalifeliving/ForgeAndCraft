"""Roblox GUI Orchestrator Service.

Coordinates AI generation, schema validation, iterative modifications,
and Roblox Studio exports.
"""

import time
from typing import Any, Tuple
from .ollama_client import (
    check_ollama_status,
    generate_gui_with_ai,
    modify_gui_with_ai,
)
from .roblox_exporter import (
    generate_luau_script,
    generate_rbxm_xml,
    generate_roblox_zip_package,
)
from .validator import validate_gui_spec


class GuiService:
    @staticmethod
    def get_status() -> dict[str, Any]:
        is_up, models, message = check_ollama_status()
        return {
            "ollama_online": is_up,
            "models": models,
            "preferred_model": "qwen2.5-coder:1.5b",
            "message": message,
        }

    @staticmethod
    def generate(prompt: str, theme: str | None = None, model: str | None = None) -> dict[str, Any]:
        start_time = time.time()
        gui_dict, engine_used = generate_gui_with_ai(prompt, theme=theme, model=model)
        is_valid, err_msg, validated_gui = validate_gui_spec(gui_dict)
        elapsed = round(time.time() - start_time, 2)

        return {
            "status": "success" if is_valid else "warning",
            "validation_message": err_msg,
            "gui": validated_gui,
            "model_used": engine_used,
            "elapsed_seconds": elapsed,
        }

    @staticmethod
    def modify(current_gui: dict[str, Any], prompt: str, model: str | None = None) -> dict[str, Any]:
        start_time = time.time()
        updated_gui, engine_used = modify_gui_with_ai(current_gui, prompt, model=model)
        is_valid, err_msg, validated_gui = validate_gui_spec(updated_gui)
        elapsed = round(time.time() - start_time, 2)

        return {
            "status": "success" if is_valid else "warning",
            "validation_message": err_msg,
            "gui": validated_gui,
            "model_used": engine_used,
            "elapsed_seconds": elapsed,
        }

    @staticmethod
    def export_luau(gui_spec: dict[str, Any]) -> str:
        return generate_luau_script(gui_spec)

    @staticmethod
    def export_rbxm(gui_spec: dict[str, Any]) -> bytes:
        return generate_rbxm_xml(gui_spec)

    @staticmethod
    def export_zip(gui_spec: dict[str, Any]) -> bytes:
        return generate_roblox_zip_package(gui_spec)


gui_service = GuiService()
