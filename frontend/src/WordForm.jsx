import { useState, useRef } from "react";
import { useIsMobile } from "./useIsMobile";
import { SPEECH_PARTS, ENTRY_TYPES } from "./constants";
import { api } from "./api";

const empty = { word: "", translation: "", speech_part: "noun", entry_type: "word", example: "" };

const isPhrase = (form) => form.entry_type === "phrase";

export function WordForm({ initial, onSave, onCancel }) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState(initial || empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [audioWord, setAudioWord] = useState(initial || null);
  const [audioUploading, setAudioUploading] = useState(false);
  const audioInputRef = useRef(null);

  const set = (k) => (e) => setForm((f) => {
    const updated = { ...f, [k]: e.target.value };
    if (k === "entry_type" && e.target.value === "phrase") updated.speech_part = null;
    if (k === "entry_type" && e.target.value === "word" && !updated.speech_part) updated.speech_part = "noun";
    return updated;
  });

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !initial?.id) return;
    setAudioUploading(true);
    setError(null);
    try {
      const updated = await api.uploadAudio(initial.id, file);
      setAudioWord(updated);
      onSave(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setAudioUploading(false);
      e.target.value = "";
    }
  };

  const handleAudioDelete = async () => {
    if (!initial?.id) return;
    setAudioUploading(true);
    setError(null);
    try {
      const updated = await api.deleteAudio(initial.id);
      setAudioWord(updated);
      onSave(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setAudioUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.word.trim() || !form.translation.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, example: form.example.trim() || null };
      const saved = initial?.id
        ? await api.updateWord(initial.id, payload)
        : await api.createWord(payload);
      onSave(saved);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={isMobile ? styles.rowMobile : styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Слово (EN)</label>
          <input
            value={form.word}
            onChange={set("word")}
            placeholder="e.g. serendipity"
            required
            autoComplete="off"
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Перевод (RU)</label>
          <input
            value={form.translation}
            onChange={set("translation")}
            placeholder="e.g. счастливая случайность"
            required
            autoComplete="off"
          />
        </div>
      </div>
      <div style={isMobile ? styles.rowMobile : styles.row}>
        <div style={styles.field}>
          <label style={{ ...styles.label, opacity: isPhrase(form) ? 0.4 : 1 }}>Часть речи</label>
          <select
            value={form.speech_part || ""}
            onChange={set("speech_part")}
            disabled={isPhrase(form)}
          >
            {isPhrase(form)
              ? <option value="">—</option>
              : SPEECH_PARTS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)
            }
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Тип</label>
          <select value={form.entry_type} onChange={set("entry_type")}>
            {ENTRY_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </div>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Пример использования (необязательно)</label>
        <textarea
          value={form.example || ""}
          onChange={set("example")}
          placeholder="e.g. It was pure serendipity that we met."
          rows={2}
        />
      </div>
      {initial?.id && (
        <div style={styles.field}>
          <label style={styles.label}>Аудио произношение</label>
          <div style={styles.audioRow}>
            {audioWord?.audio_file ? (
              <>
                <audio controls src={api.getAudioUrl(initial.id)} style={styles.audioPlayer} />
                <button
                  type="button"
                  className="btn-ghost"
                  style={styles.audioBtn}
                  onClick={() => audioInputRef.current?.click()}
                  disabled={audioUploading}
                >
                  Заменить
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  style={styles.audioBtn}
                  onClick={handleAudioDelete}
                  disabled={audioUploading}
                >
                  Удалить
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-ghost"
                style={styles.audioBtn}
                onClick={() => audioInputRef.current?.click()}
                disabled={audioUploading}
              >
                {audioUploading ? "Загрузка…" : "Загрузить файл"}
              </button>
            )}
            <input
              ref={audioInputRef}
              type="file"
              accept=".mp3,.wav,.ogg,.webm,.m4a,audio/*"
              style={{ display: "none" }}
              onChange={handleAudioUpload}
            />
          </div>
        </div>
      )}
      {/* reserve space for error so form doesn't jump */}
      <div style={styles.errorSlot}>
        {error && <p style={styles.error}>{error}</p>}
      </div>
      <div style={styles.actions}>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
            Отмена
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={saving} style={styles.submitBtn}>
          {saving ? "Сохранение…" : initial?.id ? "Сохранить" : "Добавить"}
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  rowMobile: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 12, color: "var(--text-muted)", fontWeight: 500, transition: "opacity 0.15s" },
  errorSlot: { minHeight: 20 },
  error: { color: "var(--danger)", fontSize: 13 },
  actions: { display: "flex", gap: 8, justifyContent: "flex-end" },
  submitBtn: { minWidth: 110 },
  audioRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  audioPlayer: { height: 32, flex: 1, minWidth: 0 },
  audioBtn: { height: 32, fontSize: 12, padding: "0 10px", flexShrink: 0 },
};
