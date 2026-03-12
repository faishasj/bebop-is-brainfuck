import { useRef, useState } from "react";
import { TrackMeta } from "../context/TracksContext";
import { useClickOutside } from "../hooks/useClickOutside";
import { Icon } from "./Icon";

interface TrackSelectProps {
  tracks: TrackMeta[];
  programTrackId: number;
  value: number;
  onChange: (id: number) => void;
  onAdd: () => void;
  onDelete: (track: TrackMeta) => void;
}

export function TrackSelect({
  tracks,
  programTrackId,
  value,
  onChange,
  onAdd,
  onDelete,
}: TrackSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false), open);

  const current = tracks.find((t) => t.id === value);
  const label = current
    ? current.id === programTrackId
      ? `${current.name} ★`
      : current.name
    : "";

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-flex", width: 150 }}
    >
      <button
        className="custom-select-trigger"
        style={{ width: "100%" }}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span>{label}</span>
        <Icon name="chevron-down" />
      </button>
      {open && (
        <div className="ide-dropdown" style={{ width: "100%" }}>
          {tracks.map((t) => (
            <div
              key={t.id}
              className={`ide-dropdown-item${t.id === value ? " ide-dropdown-item--active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => {
                onChange(t.id);
                setOpen(false);
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.id === programTrackId ? `${t.name} ★` : t.name}
              </span>
              {t.id !== programTrackId && (
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "0 2px",
                    lineHeight: 1,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(t);
                    setOpen(false);
                  }}
                  title={`Delete ${t.name}`}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color =
                      "var(--error-text)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color =
                      "var(--text-muted)")
                  }
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <div
            className="ide-dropdown-item"
            style={{
              color: "var(--text-muted)",
              borderTop: "1px solid var(--border)",
            }}
            onClick={() => {
              onAdd();
              setOpen(false);
            }}
          >
            + Track
          </div>
        </div>
      )}
    </div>
  );
}
