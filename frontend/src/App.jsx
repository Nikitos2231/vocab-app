import { useState, useCallback, useRef } from "react";
import { useIsMobile } from "./useIsMobile";
import { WordForm } from "./WordForm";
import { WordCard } from "./WordCard";
import { LoginPage } from "./LoginPage";
import { QuizSetup } from "./QuizSetup";
import { QuizSession } from "./QuizSession";
import { RangeSlider } from "./RangeSlider";
import { Stats } from "./Stats";
import { useWords } from "./useWords";
import { getToken, clearToken } from "./auth";
import { SPEECH_PARTS, ENTRY_TYPES, SORT_OPTIONS } from "./constants";
import { api } from "./api";

const MASTERY_MIN = 20;
const MASTERY_MAX = 100;

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getToken()));

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  return <WordsApp onLogout={() => { clearToken(); setAuthed(false); }} />;
}

function WordsApp({ onLogout }) {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [speechPart, setSpeechPart] = useState("");
  const [entryType, setEntryType] = useState("");
  const [sort, setSort] = useState("updated_at_desc");
  const [masteryRange, setMasteryRange] = useState([MASTERY_MIN, MASTERY_MAX]);
  const [showForm, setShowForm] = useState(false);
  const [blurTranslations, setBlurTranslations] = useState(false);
  const [quizMode, setQuizMode] = useState(null);
  const [importState, setImportState] = useState(null);
  const [statsKey, setStatsKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const importRef = useRef(null);

  const masteryFiltered = masteryRange[0] !== MASTERY_MIN || masteryRange[1] !== MASTERY_MAX;
  const filters = {
    search, speech_part: speechPart, entry_type: entryType, sort,
    mastery_min: masteryFiltered ? masteryRange[0] : null,
    mastery_max: masteryFiltered ? masteryRange[1] : null,
  };
  const { words, loading, error, refresh } = useWords(filters);

  const bumpStats = useCallback(() => setStatsKey((k) => k + 1), []);
  const handleCreate = useCallback(() => { setShowForm(false); refresh(); bumpStats(); }, [refresh, bumpStats]);
  const handleUpdate = useCallback(() => { refresh(); bumpStats(); }, [refresh, bumpStats]);
  const handleDelete = useCallback(() => { refresh(); bumpStats(); }, [refresh, bumpStats]);

  const resetFilters = () => {
    setSpeechPart("");
    setEntryType("");
    setSort("updated_at_desc");
    setMasteryRange([MASTERY_MIN, MASTERY_MAX]);
  };

  const hasFilters = speechPart || entryType || sort !== "updated_at_desc" || masteryFiltered;

  const startQuiz = async (params) => {
    const quizWords = await api.getQuizWords(params);
    if (!quizWords.length) {
      alert("Не нашлось слов по заданным параметрам.");
      return;
    }
    setQuizMode({ words: quizWords, blindMode: params.blindMode ?? false });
  };

  const finishQuiz = () => { setQuizMode(null); refresh(); bumpStats(); };

  const handleExport = async () => {
    try {
      const { blob, filename } = await api.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Ошибка экспорта: " + e.message);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportState("loading");
    try {
      const result = await api.importCsv(file);
      setImportState(result);
      refresh();
      bumpStats();
    } catch (e) {
      alert("Ошибка импорта: " + e.message);
      setImportState(null);
    }
  };

  return (
    <div style={styles.page}>
      {quizMode === "setup" && (
        <QuizSetup onStart={startQuiz} onCancel={() => setQuizMode(null)} />
      )}
      {quizMode?.words && (
        <QuizSession words={quizMode.words} blindMode={quizMode.blindMode} onFinish={finishQuiz} />
      )}
      {importState && importState !== "loading" && (
        <ImportToast result={importState} onClose={() => setImportState(null)} />
      )}

      {/* ── top bar ── */}
      <header style={styles.topbar}>
        <h1 style={styles.title}><span style={styles.titleAccent}>V</span>ocab</h1>
        <input ref={importRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportFile} />

        {isMobile ? (
          <button className="btn-primary" style={styles.addBtnMobile} onClick={() => setShowForm(true)}>+ Добавить</button>
        ) : (
          <div style={styles.topbarActions}>
            <button className="btn-ghost" onClick={() => setQuizMode("setup")}><ZapIcon /> Тест</button>
            <button
              className={blurTranslations ? "btn-primary" : "btn-ghost"}
              onClick={() => setBlurTranslations((v) => !v)}
              title="Скрыть/показать переводы"
            >
              <EyeIcon open={!blurTranslations} /> {blurTranslations ? "Переводы скрыты" : "Скрыть переводы"}
            </button>
            <button className="btn-ghost" onClick={handleExport}><DownloadIcon /> Экспорт</button>
            <button className="btn-ghost" onClick={() => importRef.current?.click()}><UploadIcon /> Импорт</button>
            <button className="btn-primary" onClick={() => setShowForm(true)}>+ Добавить</button>
            <button className="btn-ghost" onClick={onLogout} style={styles.logoutBtn}><LogoutIcon /></button>
          </div>
        )}
      </header>

      {/* ── mobile bottom bar ── */}
      {isMobile && (
        <nav style={styles.bottomBar}>
          <BottomBarBtn icon={<ZapIcon />} label="Тест" onClick={() => setQuizMode("setup")} />
          <BottomBarBtn
            icon={<EyeIcon open={!blurTranslations} />}
            label={blurTranslations ? "Переводы" : "Скрыть"}
            onClick={() => setBlurTranslations((v) => !v)}
            active={blurTranslations}
          />
          <BottomBarBtn icon={<DownloadIcon />} label="Экспорт" onClick={handleExport} />
          <BottomBarBtn icon={<UploadIcon />} label="Импорт" onClick={() => importRef.current?.click()} />
          <BottomBarBtn icon={<LogoutIcon />} label="Выйти" onClick={onLogout} />
        </nav>
      )}

      {/* ── add-word modal ── */}
      {showForm && (
        <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ ...styles.modalBox, ...(isMobile ? styles.modalBoxMobile : {}) }} className="fade-in">
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Новое слово</h2>
              <button className="btn-ghost" style={styles.modalClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <WordForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
            </div>
          </div>
        </div>
      )}

      {/* ── body: cards + sidebar ── */}
      <div style={isMobile ? styles.bodyMobile : styles.body}>

        {/* mobile: collapsible filters above cards */}
        {isMobile && (
          <div style={styles.mobileFilterWrap}>
            <button
              className={hasFilters ? "btn-primary" : "btn-ghost"}
              style={styles.mobileFilterBtn}
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <FilterIcon /> Фильтры {sidebarOpen ? "▲" : "▼"}
            </button>
            {sidebarOpen && (
              <div style={styles.mobileFilterPanel}>
                <SidebarSection label="Часть речи" icon={<TagIcon />}>
                  <select value={speechPart} onChange={(e) => setSpeechPart(e.target.value)}>
                    <option value="">Все</option>
                    {SPEECH_PARTS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </SidebarSection>
                <SidebarSection label="Тип" icon={<TypeIcon />}>
                  <select value={entryType} onChange={(e) => setEntryType(e.target.value)}>
                    <option value="">Слова и фразы</option>
                    {ENTRY_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </SidebarSection>
                <SidebarSection label="Сортировка" icon={<SortIcon />}>
                  <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    {SORT_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </SidebarSection>
                <SidebarSection label="Изученность" icon={<StarIcon />}>
                  <RangeSlider value={masteryRange} onChange={setMasteryRange} min={MASTERY_MIN} max={MASTERY_MAX} />
                </SidebarSection>
                {hasFilters && (
                  <button className="btn-ghost" style={styles.resetBtn} onClick={resetFilters}>✕ Сбросить фильтры</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* cards area */}
        <main style={styles.main}>
          <input
            style={styles.searchInput}
            placeholder="Поиск по слову или переводу…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Stats refreshKey={statsKey} isMobile={isMobile} />
          {loading && (
            <div style={styles.stateWrap}><div style={styles.spinner} /></div>
          )}
          {!loading && error && <p style={styles.stateText}>Ошибка: {error}</p>}
          {!loading && !error && words.length === 0 && (
            <p style={styles.stateText}>
              {search || hasFilters ? "Ничего не найдено." : "Добавьте первое слово!"}
            </p>
          )}
          {!loading && (
            <div style={isMobile ? styles.gridMobile : styles.grid}>
              {words.map((w) => (
                <WordCard key={w.id} word={w} onUpdate={handleUpdate} onDelete={handleDelete} blurTranslation={blurTranslations} />
              ))}
            </div>
          )}
          {!loading && words.length > 0 && (
            <p style={styles.count}>
              {words.length} {plural(words.length, ["запись", "записи", "записей"])}
            </p>
          )}
        </main>

        {/* desktop sidebar */}
        {!isMobile && (
          <aside style={styles.sidebar}>
            <SidebarSection label="Часть речи" icon={<TagIcon />}>
              <select value={speechPart} onChange={(e) => setSpeechPart(e.target.value)}>
                <option value="">Все</option>
                {SPEECH_PARTS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </SidebarSection>
            <SidebarSection label="Тип" icon={<TypeIcon />}>
              <select value={entryType} onChange={(e) => setEntryType(e.target.value)}>
                <option value="">Слова и фразы</option>
                {ENTRY_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </SidebarSection>
            <SidebarSection label="Сортировка" icon={<SortIcon />}>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORT_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </SidebarSection>
            <SidebarSection label="Изученность" icon={<StarIcon />}>
              <RangeSlider value={masteryRange} onChange={setMasteryRange} min={MASTERY_MIN} max={MASTERY_MAX} />
            </SidebarSection>
            {hasFilters && (
              <button className="btn-ghost" style={styles.resetBtn} onClick={resetFilters}>✕ Сбросить фильтры</button>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function BottomBarBtn({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{ ...bbs.btn, ...(active ? bbs.btnActive : {}) }}
    >
      <span style={bbs.icon}>{icon}</span>
      <span style={bbs.label}>{label}</span>
    </button>
  );
}

const bbs = {
  btn: {
    flex: 1,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 3,
    background: "transparent", border: "none",
    color: "var(--text-muted)",
    padding: "6px 0",
    cursor: "pointer",
    borderRadius: 0,
    height: "100%",
    transition: "color 0.15s",
  },
  btnActive: { color: "var(--accent)" },
  icon: { display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20 },
  label: { fontSize: 10, fontWeight: 500, letterSpacing: "0.02em", whiteSpace: "nowrap" },
};

function SidebarSection({ label, icon, children }) {
  return (
    <div style={ss.section}>
      <div style={ss.labelRow}>
        {icon && <span style={ss.icon}>{icon}</span>}
        <span style={ss.label}>{label}</span>
      </div>
      {children}
    </div>
  );
}

const ss = {
  section: { display: "flex", flexDirection: "column", gap: 7 },
  labelRow: { display: "flex", alignItems: "center", gap: 5 },
  icon: { color: "var(--accent)", display: "flex", alignItems: "center", opacity: 0.8 },
  label: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" },
};

// ── icons ──
const EyeIcon = ({ open }) => open ? (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="8" cy="8" rx="6" ry="4"/>
    <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
) : (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 2l12 12M6.5 6.6A3 3 0 009.4 9.5M4.1 4.2C2.8 5.1 2 6.5 2 8c0 2.2 2.7 4 6 4 1.2 0 2.3-.3 3.2-.7M6 4.2C6.6 4.1 7.3 4 8 4c3.3 0 6 1.8 6 4 0 .8-.3 1.6-.9 2.2"/>
  </svg>
);

const ZapIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 1L3 9h5l-1 6 7-9h-5l1-5z" fill="currentColor" stroke="none" opacity="0.9"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M8 2v8M5 7l3 3 3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1"/>
  </svg>
);
const UploadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M8 10V2M5 5l3-3 3 3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3M10 5l3 3-3 3M13 8H6"/>
  </svg>
);
const TagIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M9 2H14v5l-7 7-5-5 7-7z"/><circle cx="12" cy="5" r="1" fill="currentColor"/>
  </svg>
);
const TypeIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M2 4h12M2 8h8M2 12h5"/>
  </svg>
);
const SortIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M2 4h12M4 8h8M6 12h4"/>
  </svg>
);
const StarIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" stroke="none">
    <path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.4l-3.7 2 .7-4.1L2 5.4l4.2-.8L8 1z"/>
  </svg>
);
const FilterIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M2 4h12M5 8h6M7 12h2"/>
  </svg>
);

function ImportToast({ result, onClose }) {
  return (
    <div style={toastStyles.wrap} className="fade-in">
      <div style={toastStyles.toast}>
        <div style={toastStyles.body}>
          <span style={{ color: "var(--success)", fontWeight: 600 }}>+{result.added}</span>
          <span style={toastStyles.text}> добавлено</span>
          {result.skipped > 0 && (
            <><span style={toastStyles.sep}>·</span><span style={{ color: "var(--text-muted)" }}>{result.skipped} пропущено</span></>
          )}
          {result.errors?.length > 0 && (
            <><span style={toastStyles.sep}>·</span><span style={{ color: "var(--danger)" }}>{result.errors.length} ошибок</span></>
          )}
        </div>
        <button className="btn-ghost" style={toastStyles.close} onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

const toastStyles = {
  wrap: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 200, pointerEvents: "none" },
  toast: {
    pointerEvents: "all", display: "flex", alignItems: "center", gap: 12,
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "10px 16px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontSize: 14, whiteSpace: "nowrap",
  },
  body: { display: "flex", alignItems: "center", gap: 4 },
  text: { color: "var(--text)" },
  sep: { color: "var(--text-muted)", margin: "0 2px" },
  close: { height: 24, padding: "0 6px", fontSize: 11, flexShrink: 0 },
};

function plural(n, forms) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

const TOPBAR_HEIGHT = 60;

const styles = {
  page: { minHeight: "100vh", display: "flex", flexDirection: "column" },

  topbar: {
    position: "sticky", top: 0, zIndex: 10,
    height: TOPBAR_HEIGHT,
    background: "var(--bg)",
    borderBottom: "1px solid var(--border)",
    display: "flex", alignItems: "center", gap: 12,
    padding: "0 20px",
  },
  title: { fontSize: 20, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.3px", flexShrink: 0 },
  titleAccent: { color: "var(--accent)" },
  topbarActions: { display: "flex", gap: 8, alignItems: "center", marginLeft: "auto", flexShrink: 0 },
  addBtnMobile: { marginLeft: "auto", flexShrink: 0 },
  logoutBtn: { padding: "0 10px" },

  bottomBar: {
    position: "fixed", bottom: 0, left: 0, right: 0,
    height: 56,
    background: "var(--surface)",
    borderTop: "1px solid var(--border)",
    display: "flex", alignItems: "stretch",
    zIndex: 20,
    boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
  },
  searchInput: { display: "block", width: "100%", marginBottom: 16 },

  modalOverlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100, padding: 16,
    backdropFilter: "blur(4px)",
  },
  modalBox: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    width: "100%", maxWidth: 520,
    display: "flex", flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  },
  modalBoxMobile: {
    maxWidth: "100%",
    borderRadius: "var(--radius)",
    maxHeight: "calc(100vh - 32px)",
    overflowY: "auto",
  },
  modalHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px 24px 0",
    flexShrink: 0,
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "var(--text)" },
  modalClose: { padding: "0 8px", height: 28, fontSize: 12, flexShrink: 0 },
  modalBody: { padding: "16px 24px 24px" },

  body: {
    display: "flex", alignItems: "flex-start",
    flex: 1,
    padding: "20px 20px 60px",
    gap: 20,
    maxWidth: 1200, margin: "0 auto", width: "100%",
  },
  bodyMobile: {
    display: "flex", flexDirection: "column",
    flex: 1,
    padding: "12px 12px 72px",
    gap: 0,
    width: "100%",
  },

  main: { flex: 1, minWidth: 0 },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 12,
  },
  gridMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },

  mobileFilterWrap: { marginBottom: 12 },
  mobileFilterBtn: { width: "100%", gap: 6 },
  mobileFilterPanel: {
    marginTop: 6,
    display: "flex", flexDirection: "column", gap: 12,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: 14,
  },

  sidebar: {
    flexShrink: 0,
    width: 224,
    position: "sticky",
    top: TOPBAR_HEIGHT + 20,
    display: "flex", flexDirection: "column", gap: 18,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "18px 16px",
    alignSelf: "flex-start",
    boxShadow: "var(--shadow-card)",
  },

  resetBtn: { width: "100%", fontSize: 13 },

  stateWrap: { display: "flex", justifyContent: "center", padding: "80px 0" },
  stateText: { color: "var(--text-muted)", textAlign: "center", padding: "80px 0" },
  spinner: {
    width: 28, height: 28,
    border: "2.5px solid var(--border)",
    borderTopColor: "var(--accent)",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  count: { marginTop: 20, color: "var(--text-muted)", fontSize: 12, textAlign: "center" },
};
