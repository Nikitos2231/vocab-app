import { useState, useEffect, useRef } from "react";
import { SPEECH_PART_LABELS, ENTRY_TYPE_LABELS } from "./constants";
import { WordForm } from "./WordForm";
import { api } from "./api";

const PART_COLORS = {
  noun:        "#6c7fff",
  verb:        "#51cf66",
  adjective:   "#ff9f43",
  adverb:      "#ff6b9d",
  pronoun:     "#a29bfe",
  preposition: "#74b9ff",
  conjunction: "#fd79a8",
  interjection:"#ffd43b",
  phrasal_verb:"#00cec9",
  other:       "#636e72",
};

const SpeakerIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6H1v4h2l4 3V3L3 6z"/>
    <path d="M11.5 4.5a5 5 0 0 1 0 7"/>
    <path d="M9 6.5a2.5 2.5 0 0 1 0 3"/>
  </svg>
);

// SVG icon helpers
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.8 7.5h6.4L11 4"/>
  </svg>
);

function playWord(word) {
  if (word.audio_file) {
    const audio = new Audio(api.getAudioUrl(word.id));
    audio.play();
  } else if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word.word);
    utt.lang = "en-US";
    window.speechSynthesis.speak(utt);
  }
}

export function WordCard({ word, onUpdate, onDelete, blurTranslation = false }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { if (!blurTranslation) setRevealed(false); }, [blurTranslation]);

  const handleSave = (updated) => { setEditing(false); onUpdate(updated); };

  const handleDelete = async () => {
    if (!confirm("Удалить запись?")) return;
    setDeleting(true);
    try {
      await api.deleteWord(word.id);
      onDelete(word.id);
    } finally {
      setDeleting(false);
    }
  };

  const color = PART_COLORS[word.speech_part] ?? "#636e72";
  const date = new Date(word.updated_at || word.created_at).toLocaleDateString("ru-RU");
  const mastery = word.mastery ?? 30;
  const masteryColor = mastery >= 80 ? "#51cf66" : mastery >= 50 ? "#ffd43b" : "#ff6b6b";

  return (
    <>
      {editing && (
        <div style={modal.overlay} onClick={(e) => e.target === e.currentTarget && setEditing(false)}>
          <div style={modal.box} className="fade-in">
            <div style={modal.header}>
              <h2 style={modal.title}>Редактировать слово</h2>
              <button className="btn-ghost" style={modal.close} onClick={() => setEditing(false)}>✕</button>
            </div>
            <div style={modal.body}>
              <WordForm initial={word} onSave={handleSave} onCancel={() => setEditing(false)} />
            </div>
          </div>
        </div>
      )}
      <div className="word-card" style={{ ...styles.card, borderColor: color + "33" }}>
      <div style={styles.header}>
        <div style={styles.wordLine}>
          <span style={styles.word}>{word.word}</span>
          <button
            className="btn-ghost"
            style={styles.speakerBtn}
            onClick={() => playWord(word)}
            title={word.audio_file ? "Воспроизвести (файл)" : "Произнести (TTS)"}
          >
            <SpeakerIcon />
          </button>
          {word.speech_part && (
            <span style={{ ...styles.badge, background: color + "1a", color, borderColor: color + "44" }}>
              {SPEECH_PART_LABELS[word.speech_part]}
            </span>
          )}
          {word.entry_type === "phrase" && (
            <span style={styles.phraseTag}>фраза</span>
          )}
        </div>
        <div className="card-actions" style={styles.headerActions}>
          <button className="btn-ghost" style={styles.iconBtn} onClick={() => setEditing(true)} title="Редактировать">
            <EditIcon />
          </button>
          <button className="btn-danger" style={styles.iconBtn} onClick={handleDelete} disabled={deleting} title="Удалить">
            <TrashIcon />
          </button>
        </div>
      </div>

      <p
        style={{ ...styles.translation, ...((blurTranslation && !revealed) ? styles.translationBlurred : {}) }}
        onClick={blurTranslation && !revealed ? () => setRevealed(true) : undefined}
        title={blurTranslation && !revealed ? "Нажмите, чтобы показать" : undefined}
      >{word.translation}</p>
      {word.example && <p style={styles.example}>"{word.example}"</p>}

      <div style={styles.cardFooter}>
        <p style={styles.date}>{date}</p>
        <div style={styles.masteryWrap} title={`Изученность: ${mastery.toFixed(0)}%`}>
          <div style={styles.masteryBar}>
            <div style={{
              ...styles.masteryFill,
              width: `${mastery}%`,
              background: `linear-gradient(90deg, ${masteryColor}99, ${masteryColor})`,
              boxShadow: `0 0 6px ${masteryColor}66`,
            }} />
          </div>
          <span style={{ ...styles.masteryLabel, color: masteryColor }}>{mastery.toFixed(0)}%</span>
        </div>
      </div>
    </div>
    </>
  );
}

const modal = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100, padding: 16,
    backdropFilter: "blur(4px)",
  },
  box: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    width: "100%", maxWidth: 520,
    display: "flex", flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px 24px 0", flexShrink: 0,
  },
  title: { fontSize: 17, fontWeight: 700, color: "var(--text)" },
  close: { padding: "0 8px", height: 28, fontSize: 12, flexShrink: 0 },
  body: { padding: "16px 24px 24px" },
};

const styles = {
  card: {
    background: "var(--surface)",
    border: "1px solid",
    borderRadius: "var(--radius-lg)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    boxShadow: "var(--shadow-card)",
    cursor: "default",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  wordLine: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, minWidth: 0 },
  word: { fontSize: 17, fontWeight: 700, color: "var(--text)", wordBreak: "break-word" },
  badge: {
    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
    flexShrink: 0, border: "1px solid",
  },
  phraseTag: {
    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
    background: "rgba(108,127,255,0.1)", color: "var(--accent)", border: "1px solid rgba(108,127,255,0.25)",
  },
  headerActions: { display: "flex", gap: 4, flexShrink: 0, marginTop: -2 },
  iconBtn: { padding: "0 7px", fontSize: 13, height: 28 },
  speakerBtn: { padding: "0 5px", height: 24, fontSize: 12, flexShrink: 0 },
  translation: { color: "var(--text)", fontSize: 14, transition: "filter 0.2s" },
  translationBlurred: { filter: "blur(6px)", cursor: "pointer", userSelect: "none" },
  example: { color: "var(--text-muted)", fontSize: 13, fontStyle: "italic", lineHeight: 1.5 },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  date: { color: "var(--text-muted)", fontSize: 11 },
  masteryWrap: { display: "flex", alignItems: "center", gap: 6 },
  masteryBar: { width: 56, height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" },
  masteryFill: { height: "100%", borderRadius: 2, transition: "width 0.5s ease", animation: "mastery-fill 0.8s ease" },
  masteryLabel: { fontSize: 11, fontWeight: 600, minWidth: 28, textAlign: "right" },
};
