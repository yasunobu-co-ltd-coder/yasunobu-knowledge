"use client";

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "14px 16px",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 50, height: 18, background: "#e2e8f0", borderRadius: 4 }} />
        <div style={{ width: 80, height: 18, background: "#e2e8f0", borderRadius: 4 }} />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 14,
            background: "#f1f5f9",
            borderRadius: 4,
            marginBottom: 6,
            width: i === lines - 1 ? "60%" : "100%",
          }}
        />
      ))}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  );
}

export function SkeletonList({ count = 3, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}
