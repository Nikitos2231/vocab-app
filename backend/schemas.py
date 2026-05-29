from pydantic import BaseModel, model_validator
from datetime import datetime
from typing import Optional, List
from models import SpeechPart, EntryType


class WordBase(BaseModel):
    word: str
    translation: str
    speech_part: Optional[SpeechPart] = None
    entry_type: EntryType = EntryType.word
    example: Optional[str] = None

    @model_validator(mode="after")
    def validate_speech_part(self):
        if self.entry_type == EntryType.word and self.speech_part is None:
            raise ValueError("speech_part is required for entry_type=word")
        if self.entry_type == EntryType.phrase and self.speech_part is not None:
            raise ValueError("speech_part must be null for entry_type=phrase")
        return self


class WordCreate(WordBase):
    pass


class WordUpdate(BaseModel):
    word: Optional[str] = None
    translation: Optional[str] = None
    speech_part: Optional[SpeechPart] = None
    entry_type: Optional[EntryType] = None
    example: Optional[str] = None


class WordOut(WordBase):
    id: int
    mastery: float
    audio_file: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuizParams(BaseModel):
    count: int = 10
    speech_parts: Optional[List[SpeechPart]] = None
    entry_types: Optional[List[EntryType]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    mastery_min: Optional[float] = None
    mastery_max: Optional[float] = None


class MasteryUpdate(BaseModel):
    correct: bool
