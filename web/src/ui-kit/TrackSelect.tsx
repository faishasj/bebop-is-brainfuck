import { useEffect, useRef, useState } from "react";
import { TrackMeta } from "../context/TracksContext.js";
import { useClickOutside } from "../hooks/useClickOutside.js";
import { Icon } from "./Icon.js";

interface TrackSelectProps {
  tracks: TrackMeta[];
  programTrackId: number;
  value: number;
  onChange: (id: number) => void;
  onAdd: () => void;
  onDelete: (track: TrackMeta) => void;
  label?: string;
}

let trackSelectIdCounter = 0;

export function TrackSelect({
  tracks,
  programTrackId,
  value,
  onChange,
  onAdd,
  onDelete,
  label = "Track",
}: TrackSelectProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [instanceId] = useState(() => `tsel-${++trackSelectIdCounter}`);

  useClickOutside(containerRef, () => setOpen(false), open);

  const current = tracks.find((t) => t.id === value);
  const triggerLabel = current
    ? current.id === programTrackId
      ? `${current.name} ★`
      : current.name
    : "";

  // Total items = tracks + "add track" button
  const totalItems = tracks.length + 1;

  useEffect(() => {
    if (open) {
      const idx = tracks.findIndex((t) => t.id === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || focusedIndex < 0) return;
    const item = listRef.current?.children[focusedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setFocusedIndex((i) => Math.min(i + 1, totalItems - 1));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) {
          setFocusedIndex((i) => Math.max(i - 1, 0));
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open && focusedIndex >= 0) {
          if (focusedIndex < tracks.length) {
            onChange(tracks[focusedIndex].id);
            setOpen(false);
            triggerRef.current?.focus();
          } else {
            onAdd();
            setOpen(false);
            triggerRef.current?.focus();
          }
        } else {
          setOpen(true);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
        break;
      case "Tab":
        if (open) setOpen(false);
        break;
    }
  }

  const listboxId = `${instanceId}-listbox`;

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-flex", width: 150 }}
    >
      <button
        ref={triggerRef}
        className="custom-select-trigger"
        style={{ width: "100%" }}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && focusedIndex >= 0 ? `${instanceId}-opt-${focusedIndex}` : undefined}
        aria-label={label}
      >
        <span>{triggerLabel}</span>
        <Icon name="chevron-down" />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          className="ide-dropdown"
          style={{ width: "100%" }}
          role="listbox"
          aria-label={label}
        >
          {tracks.map((t, i) => (
            <li
              key={t.id}
              id={`${instanceId}-opt-${i}`}
              role="option"
              aria-selected={t.id === value}
              className={`ide-dropdown-item${t.id === value ? " ide-dropdown-item--active" : ""}${i === focusedIndex ? " ide-dropdown-item--focused" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => {
                onChange(t.id);
                setOpen(false);
              }}
              onMouseEnter={() => setFocusedIndex(i)}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.id === programTrackId ? (
                  <>
                    {t.name} <span aria-hidden="true">★</span>
                    <span className="sr-only">(program track)</span>
                  </>
                ) : (
                  t.name
                )}
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
                  aria-label={`Delete track ${t.name}`}
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
            </li>
          ))}
          <li
            id={`${instanceId}-opt-${tracks.length}`}
            role="option"
            aria-selected={false}
            className={`ide-dropdown-item${tracks.length === focusedIndex ? " ide-dropdown-item--focused" : ""}`}
            style={{
              color: "var(--text-muted)",
              borderTop: "1px solid var(--border)",
            }}
            onClick={() => {
              onAdd();
              setOpen(false);
            }}
            onMouseEnter={() => setFocusedIndex(tracks.length)}
          >
            + Track
          </li>
        </ul>
      )}
    </div>
  );
}
