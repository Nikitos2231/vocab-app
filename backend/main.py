from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_, asc, desc, text
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from sqlalchemy import func as sqlfunc
import random
import math
import csv
import io
import os
import uuid
import models
import schemas
from database import engine, get_db, Base
from auth import verify_password, create_token, get_current_user, APP_USERNAME, APP_PASSWORD_HASH

AUDIO_DIR = "/app/audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

Base.metadata.create_all(bind=engine)

# migrate: add audio_file column if not exists
with engine.connect() as conn:
    conn.execute(text(
        "ALTER TABLE words ADD COLUMN IF NOT EXISTS audio_file VARCHAR"
    ))
    conn.commit()

app = FastAPI(title="Vocab App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    if form.username != APP_USERNAME or not verify_password(form.password, APP_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return {"access_token": create_token(form.username), "token_type": "bearer"}


@app.get("/api/words", response_model=List[schemas.WordOut])
def list_words(
    search: Optional[str] = Query(None),
    speech_part: Optional[models.SpeechPart] = Query(None),
    entry_type: Optional[models.EntryType] = Query(None),
    sort: str = Query("created_at_desc"),
    mastery_min: Optional[float] = Query(None),
    mastery_max: Optional[float] = Query(None),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    q = db.query(models.Word)

    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                models.Word.word.ilike(like),
                models.Word.translation.ilike(like),
            )
        )

    if speech_part:
        q = q.filter(models.Word.speech_part == speech_part)

    if entry_type:
        q = q.filter(models.Word.entry_type == entry_type)

    if mastery_min is not None:
        q = q.filter(models.Word.mastery >= mastery_min)

    if mastery_max is not None:
        q = q.filter(models.Word.mastery <= mastery_max)

    sort_map = {
        "updated_at_desc": desc(models.Word.updated_at),
        "updated_at_asc": asc(models.Word.updated_at),
        "created_at_desc": desc(models.Word.created_at),
        "created_at_asc": asc(models.Word.created_at),
        "word_asc": asc(models.Word.word),
        "word_desc": desc(models.Word.word),
        "mastery_asc": asc(models.Word.mastery),
        "mastery_desc": desc(models.Word.mastery),
    }
    q = q.order_by(sort_map.get(sort, desc(models.Word.updated_at)))

    return q.all()


@app.post("/api/words", response_model=schemas.WordOut, status_code=201)
def create_word(
    payload: schemas.WordCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    word = models.Word(**payload.model_dump())
    db.add(word)
    db.commit()
    db.refresh(word)
    return word


@app.get("/api/words/{word_id}", response_model=schemas.WordOut)
def get_word(word_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    word = db.get(models.Word, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Not found")
    return word


@app.patch("/api/words/{word_id}", response_model=schemas.WordOut)
def update_word(
    word_id: int,
    payload: schemas.WordUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    word = db.get(models.Word, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(word, field, value)
    word.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(word)
    return word


@app.delete("/api/words/{word_id}", status_code=204)
def delete_word(word_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    word = db.get(models.Word, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(word)
    db.commit()


ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4"}
ALLOWED_AUDIO_EXTS = {".mp3", ".wav", ".ogg", ".webm", ".m4a"}


@app.post("/api/words/{word_id}/audio", response_model=schemas.WordOut)
def upload_audio(
    word_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    word = db.get(models.Word, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Not found")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_AUDIO_EXTS:
        raise HTTPException(status_code=400, detail="Only .mp3, .wav, .ogg, .webm, .m4a files are accepted")

    # remove old file if exists
    if word.audio_file:
        old_path = os.path.join(AUDIO_DIR, word.audio_file)
        if os.path.exists(old_path):
            os.remove(old_path)

    filename = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(AUDIO_DIR, filename)
    with open(dest, "wb") as f:
        f.write(file.file.read())

    word.audio_file = filename
    word.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(word)
    return word


@app.delete("/api/words/{word_id}/audio", response_model=schemas.WordOut)
def delete_audio(
    word_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    word = db.get(models.Word, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Not found")
    if word.audio_file:
        path = os.path.join(AUDIO_DIR, word.audio_file)
        if os.path.exists(path):
            os.remove(path)
        word.audio_file = None
        word.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(word)
    return word


@app.get("/api/words/{word_id}/audio")
def get_audio(
    word_id: int,
    db: Session = Depends(get_db),
):
    word = db.get(models.Word, word_id)
    if not word or not word.audio_file:
        raise HTTPException(status_code=404, detail="No audio")
    path = os.path.join(AUDIO_DIR, word.audio_file)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    ext = os.path.splitext(word.audio_file)[1].lower()
    media_type_map = {".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".webm": "audio/webm", ".m4a": "audio/mp4"}
    media_type = media_type_map.get(ext, "audio/mpeg")
    return FileResponse(path, media_type=media_type, headers={"Accept-Ranges": "bytes"})


@app.post("/api/quiz", response_model=List[schemas.WordOut])
def get_quiz_words(
    params: schemas.QuizParams,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    q = db.query(models.Word)

    if params.speech_parts:
        q = q.filter(models.Word.speech_part.in_(params.speech_parts))

    if params.entry_types:
        q = q.filter(models.Word.entry_type.in_(params.entry_types))

    if params.date_from:
        q = q.filter(models.Word.created_at >= params.date_from)
    if params.date_to:
        q = q.filter(models.Word.created_at < params.date_to + timedelta(days=1))

    if params.mastery_min is not None:
        q = q.filter(models.Word.mastery >= params.mastery_min)
    if params.mastery_max is not None:
        q = q.filter(models.Word.mastery <= params.mastery_max)

    words = q.all()
    if not words:
        return []

    exp = math.log(30) / math.log(5)

    def weighted_sample_no_replace(population, weights, k):
        # reservoir / key-based algorithm: assign each item a random key u^(1/w)
        # and take the top-k. Produces weighted sample without replacement.
        keys = [random.random() ** (1.0 / w) for w in weights]
        ranked = sorted(zip(keys, population), reverse=True)
        return [item for _, item in ranked[:k]]

    weights = [1.0 / ((w.mastery / 20.0) ** exp) for w in words]
    k = min(params.count, len(words))
    return weighted_sample_no_replace(words, weights, k)


@app.post("/api/words/{word_id}/mastery", response_model=schemas.WordOut)
def update_mastery(
    word_id: int,
    payload: schemas.MasteryUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    word = db.get(models.Word, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Not found")
    if payload.correct:
        word.mastery = min(100.0, word.mastery + 3.0)
    else:
        word.mastery = max(20.0, word.mastery - 10.0)
    word.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(word)
    return word


CSV_FIELDS = ["word", "translation", "speech_part", "entry_type", "example", "mastery"]


@app.get("/api/export/csv")
def export_csv(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    words = db.query(models.Word).order_by(asc(models.Word.word)).all()
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=CSV_FIELDS, lineterminator="\n")
    writer.writeheader()
    for w in words:
        writer.writerow({
            "word": w.word,
            "translation": w.translation,
            "speech_part": w.speech_part.value if w.speech_part else "",
            "entry_type": w.entry_type.value,
            "example": w.example or "",
            "mastery": round(w.mastery, 1),
        })
    buf.seek(0)
    filename = f"vocab_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/import/csv")
def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    content = file.file.read().decode("utf-8-sig")  # handle BOM
    reader = csv.DictReader(io.StringIO(content))

    missing = [f for f in ("word", "translation", "entry_type") if f not in (reader.fieldnames or [])]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(missing)}")

    existing = {w.word.lower() for w in db.query(models.Word.word).all()}
    added, skipped, errors = 0, 0, []

    for i, row in enumerate(reader, start=2):
        word_val = (row.get("word") or "").strip()
        translation_val = (row.get("translation") or "").strip()
        if not word_val or not translation_val:
            errors.append(f"row {i}: empty word or translation")
            continue

        if word_val.lower() in existing:
            skipped += 1
            continue

        entry_type_raw = (row.get("entry_type") or "word").strip()
        try:
            entry_type = models.EntryType(entry_type_raw)
        except ValueError:
            entry_type = models.EntryType.word

        speech_part = None
        if entry_type == models.EntryType.word:
            speech_part_raw = (row.get("speech_part") or "").strip()
            try:
                speech_part = models.SpeechPart(speech_part_raw)
            except ValueError:
                speech_part = models.SpeechPart.other

        try:
            mastery = float(row.get("mastery") or 30.0)
            mastery = max(20.0, min(100.0, mastery))
        except (ValueError, TypeError):
            mastery = 30.0

        example = (row.get("example") or "").strip() or None

        db.add(models.Word(
            word=word_val,
            translation=translation_val,
            speech_part=speech_part,
            entry_type=entry_type,
            example=example,
            mastery=mastery,
        ))
        existing.add(word_val.lower())
        added += 1

    db.commit()
    return {"added": added, "skipped": skipped, "errors": errors}


@app.get("/api/stats")
def get_stats(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    words = db.query(models.Word).all()
    total = len(words)
    if total == 0:
        return {
            "total": 0, "avg_mastery": 0,
            "learned": 0, "added_7d": 0,
            "new_count": 0, "learning_count": 0, "learned_count": 0,
        }

    avg_mastery = sum(w.mastery for w in words) / total
    learned = sum(1 for w in words if w.mastery >= 80)
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    added_7d = sum(1 for w in words if w.created_at and w.created_at >= cutoff)
    new_count = sum(1 for w in words if w.mastery < 50)
    learning_count = sum(1 for w in words if 50 <= w.mastery < 80)
    learned_count = sum(1 for w in words if w.mastery >= 80)

    return {
        "total": total,
        "avg_mastery": round(avg_mastery, 1),
        "learned": learned,
        "added_7d": added_7d,
        "new_count": new_count,
        "learning_count": learning_count,
        "learned_count": learned_count,
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}
