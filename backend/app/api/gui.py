"""Roblox GUI Generation API Router.

Endpoints for generating, modifying, and exporting AI Roblox GUI specifications.
"""

from fastapi import APIRouter, HTTPException, Response, status
from fastapi.responses import Response

from ..gui.generator import gui_service
from ..gui.schema import GuiExportRequest, GuiGenerateRequest, GuiModifyRequest

router = APIRouter(prefix="/gui", tags=["gui"])


@router.get("/status")
def get_gui_status():
    """Returns local Ollama health, available models, and active configuration."""
    return gui_service.get_status()


@router.post("/generate")
def generate_gui(payload: GuiGenerateRequest):
    """Generates a structured Roblox GUI JSON specification from prompt."""
    try:
        res = gui_service.generate(prompt=payload.prompt, theme=payload.theme, model=payload.model)
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"GUI generation failed: {str(e)}",
        )


@router.post("/modify")
def modify_gui(payload: GuiModifyRequest):
    """Applies natural language modifications to an existing GUI specification."""
    try:
        res = gui_service.modify(current_gui=payload.get_gui(), prompt=payload.get_prompt(), model=payload.model)
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"GUI modification failed: {str(e)}",
        )


@router.post("/export/luau")
def export_luau(payload: GuiExportRequest):
    """Generates standalone Luau script for the GUI specification."""
    code = gui_service.export_luau(payload.gui)
    return {"code": code, "luau": code, "filename": f"{payload.gui.get('name', 'Gui')}.luau"}


@router.post("/export/rbxm")
def export_rbxm(payload: GuiExportRequest):
    """Downloads native Roblox Studio Model XML (.rbxm)."""
    xml_bytes = gui_service.export_rbxm(payload.gui)
    filename = f"{payload.gui.get('name', 'Gui')}.rbxm"
    return Response(
        content=xml_bytes,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export/zip")
def export_zip(payload: GuiExportRequest):
    """Downloads complete Roblox Studio package with .rbxm, .luau, and README."""
    zip_bytes = gui_service.export_zip(payload.gui)
    filename = f"ForgeCraft_{payload.gui.get('name', 'Gui')}_RobloxStudio.zip"
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
