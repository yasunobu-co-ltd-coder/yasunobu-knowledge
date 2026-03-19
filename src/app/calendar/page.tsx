"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import type { CalendarEvent } from "@/app/api/calendar/route";

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  memo: { bg: "#dbeafe", text: "#1d4ed8", label: "メモ" },
  todo: { bg: "#fefce8", text: "#a16207", label: "TODO" },
  decision: { bg: "#dcfce7", text: "#15803d", label: "決定" },
  minutes: { bg: "#f3e8ff", text: "#7c3aed", label: "次回MTG" },
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: events } = useSWR<CalendarEvent[]>(
    `/api/calendar?year=${year}&month=${month}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  // 日付 → イベント配列
  const eventMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    if (events) {
      for (const ev of events) {
        (map[ev.date] ||= []).push(ev);
      }
    }
    return map;
  }, [events]);

  // カレンダーグリッド生成
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDow = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
    setSelectedDate(null);
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedEvents = selectedDate ? (eventMap[selectedDate] || []) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={prevMonth} style={navBtnStyle}>&lt;</button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: 0 }}>
          {year}年{month}月
        </h1>
        <button onClick={nextMonth} style={navBtnStyle}>&gt;</button>
      </div>

      {/* 凡例 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {Object.entries(TYPE_COLORS).map(([key, c]) => (
          <span
            key={key}
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 10,
              background: c.bg,
              color: c.text,
              fontWeight: 600,
            }}
          >
            {c.label}
          </span>
        ))}
      </div>

      {/* 曜日ヘッダー */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" }}>
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "#64748b",
              padding: "4px 0",
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
        }}
      >
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEvents = eventMap[dateStr] || [];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dow = i % 7;

          return (
            <div
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              style={{
                minHeight: 52,
                background: isSelected ? "#f0fdf4" : "#fff",
                border: isToday
                  ? "2px solid #15803d"
                  : isSelected
                    ? "2px solid #86efac"
                    : "1px solid #e2e8f0",
                borderRadius: 6,
                padding: "2px 3px",
                cursor: "pointer",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: isToday ? 700 : 400,
                  color: dow === 0 ? "#ef4444" : dow === 6 ? "#3b82f6" : "#334155",
                  textAlign: "right",
                  lineHeight: 1,
                  padding: "2px 2px 0 0",
                }}
              >
                {day}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 1 }}>
                {dayEvents.slice(0, 3).map((ev) => {
                  const c = TYPE_COLORS[ev.type] || TYPE_COLORS.memo;
                  return (
                    <div
                      key={ev.id}
                      style={{
                        background: c.bg,
                        borderRadius: 3,
                        padding: "0 3px",
                        fontSize: 8,
                        color: c.text,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        lineHeight: "14px",
                        opacity: ev.status === "done" || ev.status === "cancelled" ? 0.4 : 1,
                      }}
                    >
                      {ev.label}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div style={{ fontSize: 8, color: "#94a3b8", textAlign: "center" }}>
                    +{dayEvents.length - 3}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 選択日の詳細 */}
      {selectedDate && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: 0 }}>
            {selectedDate.replace(/-/g, "/")} の予定 ({selectedEvents.length}件)
          </h2>
          {selectedEvents.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>
              この日の予定はありません
            </p>
          ) : (
            selectedEvents.map((ev) => {
              const c = TYPE_COLORS[ev.type] || TYPE_COLORS.memo;
              return (
                <div
                  key={ev.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "10px 12px",
                    opacity: ev.status === "done" || ev.status === "cancelled" ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        borderRadius: 4,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 600,
                        background: c.bg,
                        color: c.text,
                      }}
                    >
                      {c.label}
                    </span>
                    {ev.client_name && (
                      <a
                        href={`/clients/${encodeURIComponent(ev.client_name)}`}
                        style={{ fontSize: 11, color: "#15803d", textDecoration: "none", fontWeight: 600 }}
                      >
                        {ev.client_name}
                      </a>
                    )}
                    {ev.status && (
                      <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: "auto" }}>
                        {ev.status}
                      </span>
                    )}
                  </div>
                  <p style={{ marginTop: 6, fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                    {ev.label}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "6px 14px",
  fontSize: 16,
  cursor: "pointer",
  color: "#334155",
  fontWeight: 700,
};
