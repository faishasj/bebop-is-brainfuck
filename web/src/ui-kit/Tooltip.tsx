import { useState } from "react";
import { createPortal } from "react-dom";
import { useAccessibility } from "../context/AccessibilityContext.js";

type TooltipPlacement = "right" | "below" | "left" | "below-left";

interface TooltipProps {
  content: string;
  placement?: TooltipPlacement;
  children: React.ReactNode;
}

function getStyle(
  placement: TooltipPlacement,
  x: number,
  y: number,
): React.CSSProperties {
  switch (placement) {
    case "below":
      return { left: x + 14, top: y + 14 };
    case "left":
      // Anchor by right edge so the tooltip sits to the left of the cursor.
      // For position:fixed, `right` is distance from the viewport right edge.
      return { right: window.innerWidth - x + 8, top: Math.max(8, y - 16) };
    case "below-left":
      return { right: window.innerWidth - x + 8, top: y + 14 };
    default: // "right"
      return { left: x + 14, top: Math.max(8, y - 32) };
  }
}

export function Tooltip({
  content,
  placement = "right",
  children,
}: TooltipProps) {
  const { prefs } = useAccessibility();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <span
      style={{ display: "contents" }}
      onMouseEnter={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {prefs.hintLabels && pos !== null &&
        createPortal(
          <div
            className="ide-tooltip"
            style={getStyle(placement, pos.x, pos.y)}
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}
