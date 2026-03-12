import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface NumericInputProps {
  id?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  style?: React.CSSProperties;
}

export function NumericInput({
  id,
  value,
  min,
  max,
  onChange,
  style,
}: NumericInputProps) {
  const [raw, setRaw] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sync when parent value changes (e.g. BPM auto-detected from MIDI file).
  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const parsed = Number(raw);
  const isValid =
    raw.trim() !== "" && !isNaN(parsed) && parsed >= min && parsed <= max;
  const showSnackbar = isFocused && !isValid;

  return (
    <>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={raw}
        style={
          isValid
            ? style
            : { ...style, borderColor: "var(--error-border)", outline: "none" }
        }
        onChange={(e) => {
          const next = e.target.value;
          setRaw(next);
          const n = Number(next);
          if (next.trim() !== "" && !isNaN(n) && n >= min && n <= max) {
            onChange(n);
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          if (!isValid) setRaw(String(value));
        }}
      />
      {showSnackbar &&
        createPortal(
          <div className="snackbar snackbar-error">
            Enter a value between {min} and {max}.
          </div>,
          document.body,
        )}
    </>
  );
}
