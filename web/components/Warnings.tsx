import type { Warning } from "@/lib/lifecycle";

// Comparability guards — differences surfaced, never hidden.
export default function Warnings({ items }: { items: Warning[] }) {
  if (!items.length) return null;
  return (
    <div className="warnings">
      {items.map((w, i) => (
        <p key={i} className={w.level === "warn" ? "warn" : "info"}>
          {w.level === "warn" ? "⚠ " : "ⓘ "}
          {w.text}
        </p>
      ))}
    </div>
  );
}
