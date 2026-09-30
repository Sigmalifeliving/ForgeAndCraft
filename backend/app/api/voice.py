import io
import json
from pathlib import Path
import time
import uuid
import zipfile

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import FileResponse, Response, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import BASE_DIR, settings
from ..database import SessionLocal, get_db
from ..deps import get_current_user
from ..models import Asset, AudioAssetRecord, AudioPlanRecord, Game, Job, User
from ..schemas import (
    AudioAssetOut,
    AudioPlan,
    GamePlanOut,
    GamePlanRequest,
    GenerateAssetPayload,
    JobOut,
    VoiceGeneratePayload,
    VoiceOut,
)
from ..services.audio_generators import (
    ambience_generator,
    music_generator,
    sfx_generator,
    voice_generator,
)
from ..services.mistral_service import analyze_game_audio
from ..services.prompt_analyzer import analyze_audio_prompt
from ..services.voice_service import VOICE_PRESETS, is_voice_valid, synthesize

router = APIRouter(prefix="/voice", tags=["voice"])


def process_voice_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if not job:
            return

        # Parse custom parameters encoded in style (e.g. "category:duration:mood")
        user_cat = "auto"
        user_dur = 0.0
        user_mood = ""
        if job.style:
            parts = job.style.split(":")
            if len(parts) >= 1 and parts[0]:
                user_cat = parts[0]
            if len(parts) >= 2 and parts[1]:
                try:
                    user_dur = float(parts[1])
                except ValueError:
                    pass
            if len(parts) >= 3 and parts[2]:
                user_mood = parts[2]

        text = (job.prompt or "").strip()
        if not text:
            raise ValueError("Prompt is empty")

        # Classify user intent
        intent = analyze_audio_prompt(
            text,
            user_category=user_cat,
            preferred_voice=job.voice,
        )

        job.status = "processing"
        job.progress = 25
        job.message = f"Analyzing sound design: {intent['name']}..."
        db.commit()
        time.sleep(0.15)

        user_dir = Path(settings.GENERATED_DIR) / str(job.user_id)
        user_dir.mkdir(parents=True, exist_ok=True)
        out_path = user_dir / f"{job.id}.wav"

        job.status = "generating"
        job.progress = 65
        job.message = f"Synthesizing {intent['category'].upper()} audio: {intent['name']}..."
        db.commit()

        dur_target = user_dur if user_dur > 0 else intent["duration"]

        if intent["category"] == "music":
            size, duration = music_generator.generate(
                prompt=job.prompt,
                out_path=out_path,
                duration=dur_target,
                mood=user_mood or intent["mood"],
            )
            model_info = f"local-music ({intent['sub_type']})"
        elif intent["category"] == "sfx":
            size, duration = sfx_generator.generate(
                prompt=job.prompt,
                out_path=out_path,
                duration=dur_target,
                category="sfx",
            )
            model_info = f"local-sfx ({intent['sub_type']})"
        elif intent["category"] == "ambience":
            size, duration = ambience_generator.generate(
                prompt=job.prompt,
                out_path=out_path,
                duration=dur_target,
            )
            model_info = f"local-ambience ({intent['sub_type']})"
        else:
            # Voice / Speech category
            spoken_text = intent["clean_prompt"] or text
            v_id = intent["voice_id"] or job.voice or "am_michael"
            if not is_voice_valid(v_id):
                v_id = "am_michael"
            size, duration = voice_generator.generate(
                spoken_text,
                out_path,
                voice=v_id,
                speed=job.speed or 1.0,
            )
            model_info = f"kokoro ({v_id})"

        job.status = "post-processing"
        job.progress = 90
        job.message = "Mastering WAV audio..."
        db.commit()
        time.sleep(0.1)

        asset = Asset(
            user_id=job.user_id,
            name=intent["name"] or job.name or (text[:60] or "Audio Asset").strip(),
            type=intent["category"],
            format="wav",
            file_path=f"generated/{job.user_id}/{job.id}.wav",
            size=size,
            duration=round(duration, 2),
            prompt=text,
            model=model_info,
        )
        db.add(asset)
        db.commit()

        job.output_asset_id = asset.id
        job.name = intent["name"]
        job.status = "completed"
        job.progress = 100
        job.message = f"{intent['name']} ready!"
        db.commit()

    except Exception as e:
        db.rollback()
        job = db.get(Job, job_id)
        if job:
            job.status = "failed"
            job.message = f"Generation failed: {str(e)}"
            db.commit()
    finally:
        db.close()


@router.get("/voices", response_model=list[VoiceOut])
def list_voices():
    return [VoiceOut(**v) for v in VOICE_PRESETS]


@router.post(
    "/generate", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED
)
def generate_voice(
    payload: VoiceGeneratePayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    selected_voice = payload.voice
    if not is_voice_valid(selected_voice):
        selected_voice = "am_michael"

    # Encode user intent preferences in job.style
    cat_code = payload.category or "auto"
    dur_code = str(payload.duration) if payload.duration > 0 else ""
    mood_code = payload.mood or ""
    style_spec = f"{cat_code}:{dur_code}:{mood_code}"

    job = Job(
        user_id=current_user.id,
        type="voice",
        name=(payload.text[:80] or "Audio").strip(),
        prompt=payload.text,
        format="wav",
        voice=selected_voice,
        speed=payload.speed,
        status="queued",
        progress=0,
        message="Queued",
        model="local",
        style=style_spec,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(process_voice_job, job.id)
    return job


@router.post("/game-plan", response_model=GamePlanOut)
def game_plan(
    payload: GamePlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mistral Audio Director: analyze a game idea -> full audio plan and initialize project assets."""
    game_id = f"game_{uuid.uuid4().hex[:8]}"

    try:
        result = analyze_game_audio(
            idea=payload.idea,
            language=payload.language,
            style=payload.style,
            budget=payload.budget,
            mode=payload.mode,
            game_id=game_id,
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Mistral Audio Director Error: {str(err)}",
        )

    plan: AudioPlan = result["plan"]

    # Persist Game record
    game_record = Game(
        id=game_id,
        user_id=current_user.id,
        title=plan.project.title or "New Game Audio Project",
        genre=plan.direction.genre,
        idea=payload.idea,
        language=payload.language,
        style=payload.style,
        budget=payload.budget,
        audio_direction=plan.direction.audio_direction,
        primary_mood=", ".join(plan.direction.primary_mood),
        environment=plan.direction.environment,
        voice_style=plan.direction.voice_style,
        music_direction=plan.direction.music_direction,
    )
    db.add(game_record)

    # Persist AudioPlan record
    plan_record = AudioPlanRecord(
        game_id=game_id,
        source=result["source"],
        plan_json=json.dumps(plan.model_dump()),
    )
    db.add(plan_record)

    # Persist initial AudioAssetRecord entries in PLANNED state
    for v in plan.voices:
        rec = AudioAssetRecord(
            id=v.asset_id,
            game_id=game_id,
            user_id=current_user.id,
            category="voice",
            item_id=v.id,
            name=f"{v.character} — Voice Sample",
            description=v.role,
            prompt=v.voice_prompt or f"Hi, I'm {v.character}.",
            model="kokoro",
            voice=v.kokoro_voice or v.preset or "am_michael",
            speed=v.speed,
            pitch=v.pitch,
            status="planned",
        )
        db.add(rec)

    for d in plan.dialogue:
        rec = AudioAssetRecord(
            id=d.asset_id,
            game_id=game_id,
            user_id=current_user.id,
            category="dialogue",
            item_id=d.id,
            name=f"{d.character} — {d.scene}",
            description=d.purpose,
            prompt=d.text,
            model="kokoro",
            voice=d.preset or "am_michael",
            speed=1.0,
            pitch=d.pitch,
            status="planned",
        )
        db.add(rec)

    for m in plan.music:
        rec = AudioAssetRecord(
            id=m.asset_id,
            game_id=game_id,
            user_id=current_user.id,
            category="music",
            item_id=m.id,
            name=m.title,
            description=m.purpose,
            prompt=m.generation_prompt,
            model="local-music",
            status="planned",
        )
        db.add(rec)

    for s in plan.sfx:
        rec = AudioAssetRecord(
            id=s.asset_id,
            game_id=game_id,
            user_id=current_user.id,
            category="sfx",
            item_id=s.id,
            name=s.name,
            description=s.description,
            prompt=s.generation_prompt,
            model="local-sfx",
            status="planned",
        )
        db.add(rec)

    for a in plan.ambience:
        rec = AudioAssetRecord(
            id=a.asset_id,
            game_id=game_id,
            user_id=current_user.id,
            category="ambience",
            item_id=a.id,
            name=a.name,
            description=a.description,
            prompt=a.generation_prompt,
            model="local-ambience",
            status="planned",
        )
        db.add(rec)

    db.commit()

    return GamePlanOut(
        status="completed",
        source=result["source"],
        game_id=game_id,
        plan=plan,
    )


@router.post("/generate-asset", response_model=AudioAssetOut)
def generate_asset(
    payload: GenerateAssetPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate or regenerate an individual audio asset locally."""
    # Find matching record
    rec = db.get(AudioAssetRecord, payload.asset_id)
    if not rec or rec.game_id != payload.game_id or rec.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Audio asset not found")

    rec.status = "generating"
    db.commit()

    # Destination directory structure: generated/<user_id>/<game_id>/<category>/<item_id>.wav
    dest_dir = Path(settings.GENERATED_DIR) / str(current_user.id) / payload.game_id / rec.category
    dest_dir.mkdir(parents=True, exist_ok=True)
    out_file = dest_dir / f"{rec.item_id}.wav"
    rel_path = f"generated/{current_user.id}/{payload.game_id}/{rec.category}/{rec.item_id}.wav"

    # Optional override parameters
    if payload.voice and is_voice_valid(payload.voice):
        rec.voice = payload.voice
    if payload.speed:
        rec.speed = max(0.5, min(2.0, float(payload.speed)))

    variation_salt = int(time.time() * 1000) % 100000 if payload.regenerate else 0

    try:
        if rec.category in ("voice", "dialogue"):
            size, duration = voice_generator.generate(
                prompt=rec.prompt,
                out_path=out_file,
                voice=rec.voice or "am_michael",
                speed=rec.speed,
                pitch=rec.pitch,
            )
        elif rec.category == "music":
            size, duration = music_generator.generate(
                prompt=rec.prompt,
                out_path=out_file,
                duration=16.0,
                variation_salt=variation_salt,
            )
        elif rec.category == "sfx":
            size, duration = sfx_generator.generate(
                prompt=rec.prompt,
                out_path=out_file,
                category=rec.category,
                variation_salt=variation_salt,
            )
        elif rec.category == "ambience":
            size, duration = ambience_generator.generate(
                prompt=rec.prompt,
                out_path=out_file,
                duration=16.0,
                variation_salt=variation_salt,
            )
        else:
            raise ValueError(f"Unknown category: {rec.category}")

        rec.status = "ready"
        rec.duration = round(duration, 2)
        rec.file_path = rel_path
        db.commit()

        audio_url = f"/api/voice/asset-file/{rec.id}"
        return AudioAssetOut(
            id=rec.id,
            game_id=rec.game_id,
            category=rec.category,
            item_id=rec.item_id,
            name=rec.name,
            description=rec.description,
            prompt=rec.prompt,
            model=rec.model,
            voice=rec.voice,
            speed=rec.speed,
            status=rec.status,
            duration=rec.duration,
            file_path=rec.file_path,
            audio_url=audio_url,
        )

    except Exception as e:
        rec.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=500, detail=f"Local audio generation failed: {str(e)}"
        )


@router.post("/generate-all/{game_id}")
def generate_all_game_assets(
    game_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Batch generate all planned assets for a given game."""
    records = db.scalars(
        select(AudioAssetRecord)
        .where(
            AudioAssetRecord.game_id == game_id,
            AudioAssetRecord.user_id == current_user.id,
        )
    ).all()

    if not records:
        raise HTTPException(status_code=404, detail="No assets found for game")

    results = []
    for rec in records:
        if rec.status == "ready":
            results.append({"id": rec.id, "status": "ready"})
            continue
        try:
            dest_dir = Path(settings.GENERATED_DIR) / str(current_user.id) / game_id / rec.category
            dest_dir.mkdir(parents=True, exist_ok=True)
            out_file = dest_dir / f"{rec.item_id}.wav"
            rel_path = f"generated/{current_user.id}/{game_id}/{rec.category}/{rec.item_id}.wav"

            if rec.category in ("voice", "dialogue"):
                _, dur = voice_generator.generate(
                    rec.prompt, out_file, voice=rec.voice or "am_michael", speed=rec.speed, pitch=rec.pitch
                )
            elif rec.category == "music":
                _, dur = music_generator.generate(rec.prompt, out_file, duration=16.0)
            elif rec.category == "sfx":
                _, dur = sfx_generator.generate(rec.prompt, out_file, category=rec.category)
            elif rec.category == "ambience":
                _, dur = ambience_generator.generate(rec.prompt, out_file, duration=16.0)
            else:
                dur = 1.0

            rec.status = "ready"
            rec.duration = round(dur, 2)
            rec.file_path = rel_path
            db.commit()
            results.append({"id": rec.id, "status": "ready"})
        except Exception as e:
            rec.status = "failed"
            db.commit()
            results.append({"id": rec.id, "status": "failed", "error": str(e)})

    return {"game_id": game_id, "generated": len(results), "details": results}


@router.get("/asset-file/{asset_id}")
def stream_asset_file(
    asset_id: str,
    db: Session = Depends(get_db),
):
    """Stream generated WAV file for browser playback."""
    rec = db.get(AudioAssetRecord, asset_id)
    if not rec or not rec.file_path:
        raise HTTPException(status_code=404, detail="Audio file not found")

    full_path = Path(BASE_DIR) / rec.file_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Audio file missing on disk")

    return FileResponse(
        path=full_path,
        media_type="audio/wav",
        filename=f"{rec.name}.wav",
    )


@router.get("/games/{game_id}")
def get_game_plan(
    game_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Load a previously generated game and its assets."""
    game = db.get(Game, game_id)
    if not game or game.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Game not found")

    plan_record = db.scalars(
        select(AudioPlanRecord).where(AudioPlanRecord.game_id == game_id)
    ).first()

    raw_plan = json.loads(plan_record.plan_json) if plan_record else {}
    assets = db.scalars(
        select(AudioAssetRecord).where(AudioAssetRecord.game_id == game_id)
    ).all()

    asset_map = {}
    for a in assets:
        asset_map[a.id] = {
            "status": a.status,
            "duration": a.duration,
            "audio_url": f"/api/voice/asset-file/{a.id}" if a.status == "ready" else "",
            "file_path": a.file_path,
        }

    return {
        "game": {
            "id": game.id,
            "title": game.title,
            "genre": game.genre,
            "idea": game.idea,
            "language": game.language,
            "style": game.style,
            "budget": game.budget,
            "audio_direction": game.audio_direction,
            "primary_mood": game.primary_mood.split(", ") if game.primary_mood else [],
            "environment": game.environment,
            "voice_style": game.voice_style,
            "music_direction": game.music_direction,
        },
        "source": plan_record.source if plan_record else "mistral",
        "plan": raw_plan,
        "assets": asset_map,
    }


@router.get("/games/{game_id}/export-roblox")
def export_roblox(
    game_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export project audio into a Roblox Studio ready package with manifest.json and organized WAV assets."""
    game = db.get(Game, game_id)
    if not game or game.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Game not found")

    assets = db.scalars(
        select(AudioAssetRecord).where(
            AudioAssetRecord.game_id == game_id,
            AudioAssetRecord.user_id == current_user.id,
        )
    ).all()

    # Build ZIP in memory
    zip_buffer = io.BytesIO()
    manifest_assets = []

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for a in assets:
            clean_filename = f"{a.item_id}.wav"
            zip_rel_path = f"audio/{a.category}/{clean_filename}"

            roblox_props = {
                "SoundGroup": "Voice" if a.category in ("voice", "dialogue") else (a.category.upper()),
                "Looped": a.category in ("music", "ambience"),
                "Volume": 0.5 if a.category == "ambience" else (0.7 if a.category == "music" else 1.0),
            }

            manifest_assets.append({
                "id": a.id,
                "name": a.name,
                "category": a.category,
                "description": a.description,
                "prompt": a.prompt,
                "file": zip_rel_path,
                "duration": a.duration,
                "status": a.status,
                "roblox_properties": roblox_props,
            })

            # Check if file exists on disk
            if a.file_path:
                disk_path = Path(BASE_DIR) / a.file_path
                if disk_path.exists():
                    zip_file.write(disk_path, arcname=f"ForgeCraft_{game.id}/{zip_rel_path}")

        # Manifest
        manifest = {
            "game": {
                "id": game.id,
                "title": game.title,
                "genre": game.genre,
                "audio_direction": game.audio_direction,
                "environment": game.environment,
            },
            "export_format": "roblox_audio_package_v1",
            "asset_count": len(manifest_assets),
            "assets": manifest_assets,
        }

        zip_file.writestr(
            f"ForgeCraft_{game.id}/manifest.json",
            json.dumps(manifest, indent=2),
        )

    zip_buffer.seek(0)
    filename = f"ForgeCraft_{game.id}_RobloxAudio.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )