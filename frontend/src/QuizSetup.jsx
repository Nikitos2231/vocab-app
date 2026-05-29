import { useState } from "react";
import { SPEECH_PARTS, ENTRY_TYPES } from "./constants";
import { RangeSlider } from "./RangeSlider";

const MASTERY_MIN = 20;
const MASTERY_MAX = 100;
const STORAGE_KEY = "quiz_last_params";

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveParams(params) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(params)); } catch {}
}

export function QuizSetup({ onStart, onCancel }) {
  const saved = loadSaved();
  const [count, setCount] = useState(saved?.count ?? 10);
  const [speechParts, setSpeechParts] = useState(saved?.speechParts ?? []);
  const [entryTypes, setEntryTypes] = useState(saved?.entryTypes ?? []);
  const [dateFrom, setDateFrom] = useState(saved?.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(saved?.dateTo ?? "");
  const [masteryRange, setMasteryRange] = useState(saved?.masteryRange ?? [MASTERY_MIN, MASTERY_MAX]);

  const toggleSpeechPart = (val) =>
    setSpeechParts((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    );

  const toggleEntryType = (val) =>
    setEntryTypes((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    );

  const masteryFiltered = masteryRange[0] !== MASTERY_MIN || masteryRange[1] !== MASTERY_MAX;

  const handleReset = () => {
    setCount(10);
    setSpeechParts([]);
    setEntryTypes([]);
    setDateFrom("");
    setDateTo("");
    setMasteryRange([MASTERY_MIN, MASTERY_MAX]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isDefault = count == 10 && !speechParts.length && !entryTypes.length
    && !dateFrom && !dateTo && !masteryFiltered;

  const handleStart = () => {
    saveParams({ count, speechParts, entryTypes, dateFrom, dateTo, masteryRange });
    onStart({
      count: Math.max(1, Number(count)),
      speech_parts: speechParts.length ? speechParts : null,
      entry_types: entryTypes.length ? entryTypes : null,
      date_from: dateFrom || null,
      date_to: dateTo || null,
      mastery_min: masteryFiltered ? masteryRange[0] : null,
      mastery_max: masteryFiltered ? masteryRange[1] : null,
    });
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={styles.modal} className="fade-in">
        <div style={styles.modalHeader}>
          <h2 style={styles.title}>Настройка теста</h2>
          <button className="btn-ghost" style={styles.closeBtn} onClick={onCancel}>✕</button>
        </div>

        <div style={styles.body}>
          <div style={styles.field}>
            <label style={styles.label}>Количество слов</label>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              style={styles.numberInput}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Части речи <span style={styles.hint}>(не выбрано — все)</span></label>
            <div style={styles.chips}>
              {SPEECH_PARTS.map((x) => (
                <button
                  key={x.value}
                  type="button"
                  onClick={() => toggleSpeechPart(x.value)}
                  className={speechParts.includes(x.value) ? "chip chip-active" : "chip"}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Тип <span style={styles.hint}>(не выбрано — все)</span></label>
            <div style={styles.chips}>
              {ENTRY_TYPES.map((x) => (
                <button
                  key={x.value}
                  type="button"
                  onClick={() => toggleEntryType(x.value)}
                  className={entryTypes.includes(x.value) ? "chip chip-active" : "chip"}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Период добавления <span style={styles.hint}>(пусто — за всё время)</span></label>
            <div style={styles.dateRow}>
              <div style={styles.dateField}>
                <span style={styles.dateLabel}>с</span>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={styles.dateInput}
                />
              </div>
              <div style={styles.dateField}>
                <span style={styles.dateLabel}>по</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={styles.dateInput}
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={styles.clearBtn}
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                >✕</button>
              )}
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Изученность <span style={styles.hint}>(пусто — все)</span></label>
            <RangeSlider
              value={masteryRange}
              onChange={setMasteryRange}
              min={MASTERY_MIN}
              max={MASTERY_MAX}
            />
          </div>
        </div>

        <div style={styles.actions}>
          <button type="button" className="btn-ghost" onClick={onCancel}>Отмена</button>
          <button type="button" className="btn-ghost" onClick={handleReset} style={styles.resetBtn} disabled={isDefault}>
            Сбросить
          </button>
          <button type="button" className="btn-primary" onClick={handleStart} style={styles.startBtn}>
            Начать тест
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.65)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100,
    padding: 16,
    backdropFilter: "blur(2px)",
  },
  modal: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    width: "100%", maxWidth: 500,
    maxHeight: "calc(100vh - 32px)",
    display: "flex", flexDirection: "column",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 24px 0",
    flexShrink: 0,
  },
  title: { fontSize: 18, fontWeight: 700, color: "var(--text)" },
  closeBtn: { padding: "0 8px", height: 28, fontSize: 12, flexShrink: 0 },
  body: {
    display: "flex", flexDirection: "column", gap: 18,
    padding: "20px 24px",
    overflowY: "auto",
  },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 12, color: "var(--text-muted)", fontWeight: 500 },
  hint: { opacity: 0.6, fontWeight: 400 },
  numberInput: { width: 90 },
  chips: { display: "flex", flexWrap: "wrap", gap: 6 },
  dateRow: { display: "flex", gap: 8, alignItems: "center" },
  dateField: { display: "flex", alignItems: "center", gap: 6, flex: 1 },
  dateLabel: { fontSize: 12, color: "var(--text-muted)", flexShrink: 0 },
  dateInput: { flex: 1, minWidth: 0 },
  clearBtn: { height: 28, padding: "0 8px", fontSize: 11, flexShrink: 0 },
  actions: {
    display: "flex", gap: 8, justifyContent: "flex-end",
    padding: "16px 24px",
    borderTop: "1px solid var(--border)",
    flexShrink: 0,
  },
  startBtn: { minWidth: 120 },
  resetBtn: { marginRight: "auto" },
};
