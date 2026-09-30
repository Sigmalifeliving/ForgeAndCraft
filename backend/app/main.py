from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text as sql_text

from .api import assets, audio, auth, gui, jobs, three_d, voice
from .database import Base, engine

Base.metadata.create_all(bind=engine)


def _migrate():
    with engine.connect() as conn:
        for table in ("jobs", "assets"):
            rows = conn.execute(sql_text(f"PRAGMA table_info({table})")).fetchall()
            columns = {row[1] for row in rows}
            if table == "jobs":
                add = (
                    ("voice", "ALTER TABLE jobs ADD COLUMN voice VARCHAR(30) DEFAULT ''"),
                    ("speed", "ALTER TABLE jobs ADD COLUMN speed FLOAT DEFAULT 1.0"),
                    ("name", "ALTER TABLE jobs ADD COLUMN name VARCHAR(120) DEFAULT ''"),
                    ("reference_image", "ALTER TABLE jobs ADD COLUMN reference_image TEXT DEFAULT ''"),
                    ("style", "ALTER TABLE jobs ADD COLUMN style VARCHAR(120) DEFAULT ''"),
                )
            else:
                add = (
                    ("duration", "ALTER TABLE assets ADD COLUMN duration FLOAT DEFAULT 0.0"),
                    ("prompt", "ALTER TABLE assets ADD COLUMN prompt TEXT DEFAULT ''"),
                    ("model", "ALTER TABLE assets ADD COLUMN model VARCHAR(50) DEFAULT ''"),
                )
            for name, ddl in add:
                if name not in columns:
                    conn.execute(sql_text(ddl))
        conn.commit()


_migrate()

app = FastAPI(title="ForgeCraft API", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(three_d.router, prefix="/api")
app.include_router(voice.router, prefix="/api")
app.include_router(audio.music_router, prefix="/api")
app.include_router(audio.sfx_router, prefix="/api")
app.include_router(audio.ambience_router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(gui.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "forgecraft", "version": app.version}