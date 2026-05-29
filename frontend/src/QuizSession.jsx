import { useState, useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "./useIsMobile";
import { api } from "./api";

function speakWord(word) {
  return new Promise((resolve) => {
    if (word.audio_file) {
      const audio = new Audio(api.getAudioUrl(word.id));
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play();
    } else if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(word.word);
      utt.lang = "en-US";
      utt.onend = resolve;
      utt.onerror = resolve;
      window.speechSynthesis.speak(utt);
    } else {
      resolve();
    }
  });
}

function speakTranslation(text) {
  return new Promise((resolve) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "ru-RU";
      utt.onend = resolve;
      utt.onerror = resolve;
      window.speechSynthesis.speak(utt);
    } else {
      resolve();
    }
  });
}

function playWord(word) {
  speakWord(word);
}

const SpeakerIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6H1v4h2l4 3V3L3 6z"/>
    <path d="M11.5 4.5a5 5 0 0 1 0 7"/>
    <path d="M9 6.5a2.5 2.5 0 0 1 0 3"/>
  </svg>
);

const PART_COLORS = {
  noun:"#6c7fff", verb:"#51cf66", adjective:"#ff9f43", adverb:"#ff6b9d",
  pronoun:"#a29bfe", preposition:"#74b9ff", conjunction:"#fd79a8",
  interjection:"#ffd43b", phrasal_verb:"#00cec9", other:"#636e72",
};

export function QuizSession({ words: initialWords, blindMode = false, onFinish }) {
  const isMobile = useIsMobile();
  const [words, setWords] = useState(initialWords);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState([]);
  const [answering, setAnswering] = useState(false);
  const [done, setDone] = useState(false);
  const [cardKey, setCardKey] = useState(0);

  // swipe tracking
  const touchStart = useRef(null);
  const swipeLocked = useRef(false);

  const current = words[index];

  const answer = useCallback(async (correct) => {
    if (answering) return;
    setAnswering(true);
    try {
      const updated = await api.updateMastery(current.id, correct);
      setWords((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setResults((prev) => [...prev, { word: current, correct }]);
      if (index + 1 >= words.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
        setRevealed(false);
        setCardKey((k) => k + 1);
      }
    } finally {
      setAnswering(false);
    }
  }, [answering, current, index, words.length]);

  const reveal = useCallback(() => {
    if (revealed) return;
    setRevealed(true);
    if (blindMode) speakTranslation(current.translation);
  }, [revealed, blindMode, current]);

  // auto-play word when card changes in blind mode
  useEffect(() => {
    if (!blindMode || done) return;
    speakWord(current);
  }, [cardKey, blindMode, done]);

  // swipe handlers
  const onTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipeLocked.current = false;
  };
  const onTouchEnd = (e) => {
    if (!blindMode || !touchStart.current || swipeLocked.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);

    if (absDx < 10 && absDy < 10) {
      // tap
      reveal();
      return;
    }
    if (absDx > absDy && absDx > 40) {
      // horizontal swipe — only if revealed
      if (!revealed) return;
      swipeLocked.current = true;
      answer(dx > 0);
    }
  };

  if (done) {
    const correctCount = results.filter((r) => r.correct).length;
    const pct = Math.round((correctCount / results.length) * 100);
    const scoreColor = pct >= 70 ? "var(--success)" : pct >= 40 ? "var(--warning)" : "var(--danger)";
    return (
      <div style={{ ...styles.overlay, ...(isMobile ? styles.overlayMobile : {}) }}>
        <div style={{ ...styles.modal, ...(isMobile ? styles.modalMobile : {}) }} className="fade-in">
          <div style={styles.doneHeader}>
            <div style={styles.doneEmoji}>{pct >= 70 ? "🎉" : pct >= 40 ? "💪" : "📚"}</div>
            <h2 style={styles.title}>Тест завершён</h2>
            <p style={{ ...styles.score, color: scoreColor }}>
              {correctCount} <span style={styles.scoreSep}>/</span> {results.length}
              <span style={styles.scoreLabel}> правильно</span>
            </p>
          </div>
          <div style={styles.resultList}>
            {results.map((r, i) => {
              const finalMastery = words.find((w) => w.id === r.word.id)?.mastery;
              const mColor = finalMastery >= 80 ? "var(--success)" : finalMastery >= 50 ? "var(--warning)" : "var(--danger)";
              return (
                <div key={i} style={styles.resultRow}>
                  <span style={{ ...styles.resultMark, color: r.correct ? "var(--success)" : "var(--danger)" }}>
                    {r.correct ? "✓" : "✗"}
                  </span>
                  <span style={styles.resultWord}>{r.word.word}</span>
                  <span style={styles.resultTranslation}>{r.word.translation}</span>
                  {finalMastery != null && (
                    <span style={{ ...styles.resultMastery, color: mColor }}>{finalMastery.toFixed(0)}%</span>
                  )}
                </div>
              );
            })}
          </div>
          <div style={styles.doneActions}>
            <button className="btn-primary" style={styles.finishBtn} onClick={onFinish}>Закрыть</button>
          </div>
        </div>
      </div>
    );
  }

  const mastery = current.mastery ?? 30;
  const masteryColor = mastery >= 80 ? "#51cf66" : mastery >= 50 ? "#ffd43b" : "#ff6b6b";
  const partColor = PART_COLORS[current.speech_part] ?? "#636e72";
  const progress = (index / words.length) * 100;

  return (
    <div
      style={{ ...styles.overlay, ...(isMobile ? styles.overlayMobile : {}) }}
      onTouchStart={blindMode ? onTouchStart : undefined}
      onTouchEnd={blindMode ? onTouchEnd : undefined}
    >
      <div style={{ ...styles.modal, ...(isMobile ? styles.modalMobile : {}) }} className="fade-in">
        {/* progress */}
        <div style={styles.progressWrap}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <span style={styles.progressText}>{index + 1} / {words.length}</span>
          {blindMode && <HeadphonesIcon />}
        </div>

        {/* card */}
        <div key={cardKey} style={styles.cardArea} className="fade-slide">
          <div style={styles.wordRow}>
            <p style={styles.wordText}>{current.word}</p>
            <button
              className="btn-ghost"
              style={styles.speakerBtn}
              onClick={() => playWord(current)}
              title={current.audio_file ? "Воспроизвести (файл)" : "Произнести (TTS)"}
            >
              <SpeakerIcon />
            </button>
          </div>

          <div style={{ ...styles.translationSlot, ...(revealed ? styles.translationVisible : styles.translationHidden) }}>
            <div style={styles.divider} />
            <div style={styles.translationRow}>
              <p style={styles.translation}>{current.translation}</p>
              <button
                className="btn-ghost"
                style={styles.speakerBtn}
                onClick={() => speakTranslation(current.translation)}
                title="Произнести перевод"
              >
                <SpeakerIcon />
              </button>
            </div>
            {current.example && <p style={styles.example}>"{current.example}"</p>}
          </div>

          {/* blind mode gesture hints */}
          {blindMode && (
            <div style={styles.gestureHints}>
              {!revealed
                ? <p style={styles.gestureHint}>👆 тап — открыть перевод</p>
                : <p style={styles.gestureHint}>← не знаю &nbsp;·&nbsp; знаю →</p>
              }
            </div>
          )}
        </div>

        {/* actions */}
        {!blindMode && (
          <div style={styles.bottomArea}>
            {!revealed && (
              <button className="btn-ghost" style={styles.revealBtn} onClick={() => setRevealed(true)}>
                <EyeIcon /> Показать перевод
              </button>
            )}
            <div style={styles.answerRow}>
              <button
                className="btn-danger-filled"
                style={styles.answerBtn}
                onClick={() => answer(false)}
                disabled={answering}
              >
                ✗ Не знаю
              </button>
              <button
                className="btn-success-filled"
                style={styles.answerBtn}
                onClick={() => answer(true)}
                disabled={answering}
              >
                ✓ Знаю
              </button>
            </div>
          </div>
        )}
        {blindMode && revealed && (
          <div style={styles.bottomArea}>
            <div style={styles.answerRow}>
              <button
                className="btn-danger-filled"
                style={styles.answerBtn}
                onClick={() => answer(false)}
                disabled={answering}
              >
                ✗ Не знаю
              </button>
              <button
                className="btn-success-filled"
                style={styles.answerBtn}
                onClick={() => answer(true)}
                disabled={answering}
              >
                ✓ Знаю
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/>
    <circle cx="8" cy="8" r="2"/>
  </svg>
);

const HeadphonesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)", flexShrink: 0 }}>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
  </svg>
);

const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100, padding: 16,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    width: "100%", maxWidth: 480,
    display: "flex", flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  },
  title: { fontSize: 18, fontWeight: 700, color: "var(--text)" },
  progressWrap: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 20px 12px",
    borderBottom: "1px solid var(--border)",
  },
  progressBar: { flex: 1, height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, var(--accent), var(--accent-hover))",
    borderRadius: 3, transition: "width 0.4s ease",
    boxShadow: "0 0 8px rgba(108,127,255,0.5)",
  },
  progressText: { fontSize: 12, color: "var(--text-muted)", flexShrink: 0, fontWeight: 600 },
  cardArea: {
    padding: "20px 24px",
    display: "flex", flexDirection: "column", gap: 10,
    minHeight: 200, flex: 1,
  },
  tags: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" },
  tag: {
    fontSize: 11, fontWeight: 600, height: 22, padding: "0 8px", borderRadius: 20,
    background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)",
    display: "inline-flex", alignItems: "center",
  },
  wordRow: { display: "flex", alignItems: "center", gap: 10 },
  translationRow: { display: "flex", alignItems: "center", gap: 8 },
  wordText: { fontSize: 30, fontWeight: 800, color: "var(--text)", lineHeight: 1.25, letterSpacing: "-0.3px" },
  speakerBtn: { padding: "0 7px", height: 32, flexShrink: 0 },
  translationSlot: {
    display: "flex", flexDirection: "column", gap: 6,
    overflow: "hidden",
    transition: "max-height 0.28s ease, opacity 0.22s ease",
  },
  translationVisible: { maxHeight: 200, opacity: 1 },
  translationHidden: { maxHeight: 0, opacity: 0 },
  divider: { height: 1, background: "var(--border)", marginBottom: 2 },
  translation: { fontSize: 20, color: "var(--text)", fontWeight: 500 },
  example: { fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" },
  bottomArea: {
    padding: "12px 20px 20px",
    display: "flex", flexDirection: "column", gap: 10,
    borderTop: "1px solid var(--border)", flexShrink: 0,
  },
  revealBtn: { width: "100%", gap: 8 },
  answerRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  answerBtn: { height: 46, fontSize: 15, fontWeight: 700, letterSpacing: "0.02em" },
  doneHeader: { padding: "24px 24px 0", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" },
  doneEmoji: { fontSize: 40, lineHeight: 1, marginBottom: 4 },
  score: { fontSize: 28, fontWeight: 800 },
  scoreSep: { color: "var(--text-muted)", fontWeight: 400 },
  scoreLabel: { fontSize: 16, fontWeight: 400, color: "var(--text-muted)" },
  resultList: {
    display: "flex", flexDirection: "column", gap: 0,
    padding: "16px 24px", maxHeight: 320, overflowY: "auto",
  },
  resultRow: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 13, padding: "6px 0",
    borderBottom: "1px solid var(--border)",
  },
  resultMark: { fontWeight: 700, width: 16, flexShrink: 0, fontSize: 15 },
  resultWord: { fontWeight: 600, minWidth: 110, color: "var(--text)" },
  resultTranslation: { color: "var(--text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  resultMastery: { fontWeight: 700, fontSize: 12, flexShrink: 0 },
  doneActions: { padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" },
  finishBtn: { minWidth: 100 },
  overlayMobile: { padding: 0, alignItems: "stretch" },
  modalMobile: { borderRadius: 0, maxWidth: "100%", width: "100%", height: "100%", maxHeight: "100%" },

  gestureHints: { marginTop: "auto", paddingTop: 16, display: "flex", justifyContent: "center" },
  gestureHint: { fontSize: 13, color: "var(--text-muted)", textAlign: "center" },
};
