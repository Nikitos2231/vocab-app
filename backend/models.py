from sqlalchemy import Column, Integer, String, DateTime, Float, Enum as SAEnum
from sqlalchemy.sql import func
import enum
from database import Base


class SpeechPart(str, enum.Enum):
    noun = "noun"
    verb = "verb"
    adjective = "adjective"
    adverb = "adverb"
    pronoun = "pronoun"
    preposition = "preposition"
    conjunction = "conjunction"
    interjection = "interjection"
    phrasal_verb = "phrasal_verb"
    other = "other"


class EntryType(str, enum.Enum):
    word = "word"
    phrase = "phrase"


class Word(Base):
    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)
    word = Column(String, nullable=False, index=True)
    translation = Column(String, nullable=False)
    speech_part = Column(SAEnum(SpeechPart), nullable=True)
    entry_type = Column(SAEnum(EntryType), nullable=False, default=EntryType.word)
    example = Column(String, nullable=True)
    mastery = Column(Float, nullable=False, default=30.0)
    audio_file = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
