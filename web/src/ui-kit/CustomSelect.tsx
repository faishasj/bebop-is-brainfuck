import { useRef, useState } from "react";
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
  columns?: number;
  style?: React.CSSProperties;
  menuStyle?: React.CSSProperties;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function CustomSelect<T extends string | number>({
  value,
  options,
  onChange,
  columns,
  style,
  menuStyle,
  disabled,
  size = "md",
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? String(value);

  useClickOutside(containerRef, () => setOpen(false), open);

  const needsScroll = options.length > 10;
  const computedMenuStyle: React.CSSProperties = {
    ...(needsScroll ? { maxHeight: "240px", overflowY: "auto" } : {}),
    ...(columns
      ? { display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, minWidth: "280px" }
      : {}),
    ...menuStyle,
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-flex", ...style }}
    >
      <button
        className={`custom-select-trigger${size === "sm" ? " custom-select-trigger--sm" : ""}`}
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        type="button"
      >
        <span>{selectedLabel}</span>
        <Icon name="chevron-down" />
      </button>
      {open && (
        <div className="ide-dropdown" style={computedMenuStyle}>
          {options.map((o) => (
            <div
              key={String(o.value)}
              className={`ide-dropdown-item${o.value === value ? " ide-dropdown-item--active" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
