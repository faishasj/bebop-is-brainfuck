import { useRef, useState } from "react";

interface InlineEditProps {
  value: string;
  onCommit: (trimmed: string) => void;
  onCancel?: () => void;
  inputClassName?: string;
  inputStyle?: React.CSSProperties;
  selectOnOpen?: "all" | "stem";
  children: (props: {
    onActivate: (e: React.MouseEvent) => void;
  }) => React.ReactNode;
}

export function InlineEdit({
  value,
  onCommit,
  onCancel,
  inputClassName,
  inputStyle,
  selectOnOpen = "all",
  children,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function activate(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(value);
    setIsEditing(true);
    setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      if (selectOnOpen === "stem") {
        const dot = input.value.lastIndexOf(".");
        input.setSelectionRange(0, dot > 0 ? dot : input.value.length);
      } else {
        input.select();
      }
    }, 0);
  }

  function commit() {
    onCommit(draft.trim());
    setIsEditing(false);
  }

  function cancel() {
    setIsEditing(false);
    onCancel?.();
  }

  if (!isEditing) {
    return <>{children({ onActivate: activate })}</>;
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      className={inputClassName}
      style={inputStyle}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
      }}
      autoFocus
    />
  );
}
