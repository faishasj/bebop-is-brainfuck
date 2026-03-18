type IconName = "chevron-down" | "pencil" | "trash" | "check" | "undo" | "redo" | "bars";

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
  }
  return null;
}
