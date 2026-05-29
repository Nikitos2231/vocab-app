import { useEffect, useState } from "react";
import { api } from "./api";

export function Stats({ refreshKey }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, [refreshKey]);

  if (!stats || stats.total === 0) return null;

  const { total, avg_mastery, learned, added_7d, new_count, learning_count, learned_count } = stats;

  const newPct      = total ? (new_count / total) * 100 : 0;
  const learningPct = total ? (learning_count / total) * 100 : 0;
  const learnedPct  = total ? (learned_count / total) * 100 : 0;

  return (
    <div style={s.wrap}>
      {/* ── stat cards ── */}
      <div style={s.cards}>
        <StatCard
          value={total}
          label="всего слов"
          color="#6c7fff"
          icon={<BookIcon />}
        />
        <StatCard
          value={`${avg_mastery}%`}
          label="средняя изученность"
          color="#a29bfe"
          icon={<ChartIcon />}
        />
        <StatCard
          value={learned}
          label="выучено"
          color="#51cf66"
          icon={<CheckIcon />}
        />
        <StatCard
          value={`+${added_7d}`}
          label="за 7 дней"
          color="#74b9ff"
          icon={<PlusIcon />}
        />
      </div>

      {/* ── stacked bar ── */}
      <div style={s.barWrap}>
        <div style={s.barTrack}>
          {newPct > 0 && (
            <div
              style={{ ...s.barSeg, width: `${newPct}%`, background: "#ff6b6b" }}
              title={`Новые: ${new_count}`}
            />
          )}
          {learningPct > 0 && (
            <div
              style={{ ...s.barSeg, width: `${learningPct}%`, background: "#ffd43b" }}
              title={`Учатся: ${learning_count}`}
            />
          )}
          {learnedPct > 0 && (
            <div
              style={{ ...s.barSeg, width: `${learnedPct}%`, background: "#51cf66" }}
              title={`Выучены: ${learned_count}`}
            />
          )}
        </div>
        <div style={s.legend}>
          <LegendItem color="#ff6b6b" label="Новые" count={new_count} pct={newPct} />
          <LegendItem color="#ffd43b" label="Учатся" count={learning_count} pct={learningPct} />
          <LegendItem color="#51cf66" label="Выучены" count={learned_count} pct={learnedPct} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, color, icon }) {
  return (
    <div style={{ ...s.card, borderColor: color + "33", "--card-color": color }}>
      <div style={{ ...s.cardIcon, background: color + "18", color }}>{icon}</div>
      <div style={s.cardBody}>
        <span style={{ ...s.cardValue, color }}>{value}</span>
        <span style={s.cardLabel}>{label}</span>
      </div>
    </div>
  );
}

function LegendItem({ color, label, count, pct }) {
  return (
    <div style={s.legendItem}>
      <span style={{ ...s.legendDot, background: color }} />
      <span style={s.legendLabel}>{label}</span>
      <span style={s.legendCount}>{count}</span>
      <span style={s.legendPct}>{pct.toFixed(0)}%</span>
    </div>
  );
}

// icons
const BookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3a1 1 0 011-1h4a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zM8 3a1 1 0 011-1h4a1 1 0 011 1v10a1 1 0 01-1 1H9a1 1 0 01-1-1V3z"/>
  </svg>
);
const ChartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12l3-4 3 2 3-5 3 3"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8l3.5 3.5L13 4"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M8 3v10M3 8h10"/>
  </svg>
);

const s = {
  wrap: {
    display: "flex", flexDirection: "column", gap: 12,
    marginBottom: 20,
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
  },
  card: {
    background: "var(--surface)",
    border: "1px solid",
    borderRadius: "var(--radius-lg)",
    padding: "12px 14px",
    display: "flex", alignItems: "center", gap: 10,
    boxShadow: "var(--shadow-card)",
    transition: "transform 0.15s, box-shadow 0.15s",
    cursor: "default",
  },
  cardIcon: {
    width: 36, height: 36, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0 },
  cardValue: { fontSize: 22, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.5px" },
  cardLabel: { fontSize: 11, color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  barWrap: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "14px 16px",
    display: "flex", flexDirection: "column", gap: 10,
    boxShadow: "var(--shadow-card)",
  },
  barTrack: {
    height: 10, borderRadius: 6,
    display: "flex", overflow: "hidden",
    background: "var(--border)",
    gap: 1,
  },
  barSeg: {
    height: "100%",
    transition: "width 0.6s ease",
    minWidth: 2,
  },
  legend: { display: "flex", gap: 16 },
  legendItem: { display: "flex", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  legendLabel: { fontSize: 12, color: "var(--text-muted)" },
  legendCount: { fontSize: 12, fontWeight: 700, color: "var(--text)" },
  legendPct: { fontSize: 11, color: "var(--text-muted)" },
};
