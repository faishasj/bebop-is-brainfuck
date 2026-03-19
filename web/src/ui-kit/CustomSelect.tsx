import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon.js";
import { useClickOutside } from "../hooks/useClickOutside.js";

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface CustomSelectProps<T extends string | number> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  columns?: number;
  style?: React.CSSProperties;
  menuStyle?: React.CSSProperties;
  disabled?: boolean;
  size?: "sm" | "md";
}

let selectIdCounter = 0;

export function CustomSelect<T extends string | number>({
  value,
  options,
  onChange,
  label,
  columns,
  style,
  menuStyle,
  disabled,
  size = "md",
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [instanceId] = useState(() => `csel-${++selectIdCounter}`);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? String(value);

  useClickOutside(containerRef, () => setOpen(false), open);

  // Reset focused index when opening
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  }, [open]);

  // Scroll focused option into view
  useEffect(() => {
    if (!open || focusedIndex < 0) return;
    const item = listRef.current?.children[focusedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, open]);

  function selectOption(opt: SelectOption<T>) {
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setFocusedIndex((i) => Math.min(i + 1, options.length - 1));
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
          selectOption(options[focusedIndex]);
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
      case "Home":
        if (open) {
          e.preventDefault();
          setFocusedIndex(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setFocusedIndex(options.length - 1);
        }
        break;
    }
  }

  const needsScroll = options.length > 10;
  const computedMenuStyle: React.CSSProperties = {
    ...(needsScroll ? { maxHeight: "240px", overflowY: "auto" } : {}),
    ...(columns
      ? { display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, minWidth: "280px" }
      : {}),
    ...menuStyle,
  };

  const listboxId = `${instanceId}-listbox`;

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-flex", ...style }}
    >
      <button
        ref={triggerRef}
        className={`custom-select-trigger${size === "sm" ? " custom-select-trigger--sm" : ""}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && focusedIndex >= 0 ? `${instanceId}-opt-${focusedIndex}` : undefined}
        aria-label={label}
      >
        <span>{selectedLabel}</span>
        <Icon name="chevron-down" />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          className="ide-dropdown"
          style={computedMenuStyle}
          role="listbox"
          aria-label={label}
        >
          {options.map((o, i) => (
            <li
              key={String(o.value)}
              id={`${instanceId}-opt-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={`ide-dropdown-item${o.value === value ? " ide-dropdown-item--active" : ""}${i === focusedIndex ? " ide-dropdown-item--focused" : ""}`}
              onClick={() => selectOption(o)}
              onMouseEnter={() => setFocusedIndex(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
