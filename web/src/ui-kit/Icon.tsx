type IconName =
  | "chevron-down"
  | "pencil"
  | "trash"
  | "check"
  | "undo"
  | "redo"
  | "bars"
  | "file"
  | "music"
  | "bug"
  | "help-circle"
  | "info-circle"
  | "play"
  | "pause"
  | "skip-back"
  | "activity"
  | "zap";

interface IconProps {
  name: IconName;
}

export function Icon({ name }: IconProps) {
  if (name === "chevron-down") {
    return (
      <svg
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M1 1L5 5L9 1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  } else if (name === "pencil") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8.5 1L11 3.5L4.5 10L1.5 10.5L2 7.5L8.5 1Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M7 2.5L9.5 5" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  } else if (name === "trash") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4.5 1H7.5V3H4.5V1Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M0.5 3H11.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path
          d="M2 3L2.5 11.5H9.5L10 3"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M4.5 5V9.5M7.5 5V9.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  } else if (name === "check") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M1.5 6L4.5 9.5L10.5 2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  } else if (name === "undo") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 4H7.5C9.43 4 11 5.57 11 7.5S9.43 11 7.5 11H3"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M4.5 1.5L2 4L4.5 6.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  } else if (name === "redo") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M10 4H4.5C2.57 4 1 5.57 1 7.5S2.57 11 4.5 11H9"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M7.5 1.5L10 4L7.5 6.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  } else if (name === "bars") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <rect x="1" y="8" width="2" height="3" rx="0.5" fill="currentColor" />
        <rect x="4.5" y="5" width="2" height="6" rx="0.5" fill="currentColor" />
        <rect x="8" y="2" width="2" height="9" rx="0.5" fill="currentColor" />
      </svg>
    );
  } else if (name === "file") {
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 1H7.5L10 3.5V11H2V1Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 1V3.5H10"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    );
  } else if (name === "music") {
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 9V3L10 2V7.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="3.5"
          cy="9"
          r="1.5"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <circle
          cx="8.5"
          cy="7.5"
          r="1.5"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    );
  } else if (name === "bug") {
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="6" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M4.5 2L3 1M7.5 2L9 1"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <ellipse
          cx="6"
          cy="7.5"
          rx="2.5"
          ry="3"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M3.5 6L1.5 5.5M3.5 7.5L1.5 7.5M3.5 9L1.5 9.5M8.5 6L10.5 5.5M8.5 7.5L10.5 7.5M8.5 9L10.5 9.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  } else if (name === "help-circle") {
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M4.5 4.5C4.5 3.67 5.17 3 6 3C6.83 3 7.5 3.67 7.5 4.5C7.5 5.5 6 6 6 7"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <circle cx="6" cy="9" r="0.6" fill="currentColor" />
      </svg>
    );
  } else if (name === "info-circle") {
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="6" cy="3.5" r="0.6" fill="currentColor" />
        <path
          d="M6 5.5V9"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  } else if (name === "play") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M3 2L10 6L3 10V2Z" fill="currentColor" />
      </svg>
    );
  } else if (name === "pause") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <rect x="2.5" y="2" width="2.5" height="8" rx="0.5" fill="currentColor" />
        <rect x="7" y="2" width="2.5" height="8" rx="0.5" fill="currentColor" />
      </svg>
    );
  } else if (name === "skip-back") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2.5 2V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10 2.5L4.5 6L10 9.5V2.5Z" fill="currentColor" />
      </svg>
    );
  } else if (name === "activity") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M1 6H3L4.5 2L7 10L8.5 6H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  } else if (name === "zap") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M7 1L2.5 7H5.5L5 11L9.5 5H6.5L7 1Z" fill="currentColor" />
      </svg>
    );
  }
  return null;
}
