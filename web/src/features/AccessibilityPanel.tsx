import { useRef } from "react";
import { useAccessibility } from "../context/AccessibilityContext.js";
import { useFocusTrap } from "../hooks/useFocusTrap.js";

interface AccessibilityPanelProps {
  onClose: () => void;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  id: string;
}

function ToggleRow({ label, description, checked, onToggle, id }: ToggleRowProps) {
  return (
    <div className="a11y-toggle-row">
      <div className="a11y-toggle-text">
        <span className="a11y-toggle-label" id={`${id}-label`}>{label}</span>
        <span className="a11y-toggle-desc" id={`${id}-desc`}>{description}</span>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-desc`}
        className={`a11y-switch${checked ? " a11y-switch--on" : ""}`}
        onClick={onToggle}
      >
        <span className="a11y-switch-thumb" />
      </button>
    </div>
  );
}

export function AccessibilityPanel({ onClose }: AccessibilityPanelProps) {
  const { prefs, toggle } = useAccessibility();
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap({ containerRef: dialogRef, isActive: true });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-dialog a11y-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="a11y-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="a11y-panel-header">
          <div className="modal-title" id="a11y-panel-title">Accessibility</div>
          <button
            className="modal-btn"
            onClick={onClose}
            aria-label="Close accessibility settings"
          >
            ×
          </button>
        </div>
        <div className="a11y-panel-body">
          <ToggleRow
            id="a11y-hc"
            label="High contrast"
            description="Increase text and border contrast for better visibility"
            checked={prefs.highContrast}
            onToggle={() => toggle("highContrast")}
          />
          <ToggleRow
            id="a11y-rm"
            label="Reduce motion"
            description="Disable animations and transitions"
            checked={prefs.reduceMotion}
            onToggle={() => toggle("reduceMotion")}
          />
          <ToggleRow
            id="a11y-df"
            label="Dyslexia-friendly font"
            description="Use Lexend for body text to improve readability"
            checked={prefs.dyslexiaFont}
            onToggle={() => toggle("dyslexiaFont")}
          />
          <ToggleRow
            id="a11y-hl"
            label="Hint labels"
            description="Show tooltips on buttons and interactive controls"
            checked={prefs.hintLabels}
            onToggle={() => toggle("hintLabels")}
          />
        </div>
      </div>
    </div>
  );
}
