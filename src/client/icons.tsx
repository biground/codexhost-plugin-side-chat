/**
 * Inline SVG glyphs for Side Chat sidebar, guide card, slash menu, and tool cards.
 */
import type { ReactNode } from "react";

export interface SideChatIconProps {
  readonly size?: number;
  readonly className?: string;
}

export function SideChatIcon({ size = 16, className }: SideChatIconProps): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M12 4v16" />
      <path d="M15.2 10h2.8" />
      <path d="M15.2 14h2" />
      <path d="M6.5 9.5h2.8" />
      <path d="M6.5 13.5h2" />
    </svg>
  );
}

export function SideChatGuideArtwork({ size = 26, className }: SideChatIconProps): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4.5"
        width="22"
        height="19"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M14.5 4.5v19" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <rect x="6" y="9" width="5.5" height="2" rx="1" fill="currentColor" opacity="0.55" />
      <rect x="6" y="13" width="4" height="2" rx="1" fill="currentColor" opacity="0.4" />
      <path
        d="M17.2 10.5a2 2 0 0 1 2-2h2.2a2 2 0 0 1 2 2v3.6a2 2 0 0 1-2 2h-1.6l-1.8 1.6v-1.6h-.8a2 2 0 0 1-2-2v-3.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PlusIcon({ size = 14, className }: SideChatIconProps): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 3.2v9.6M3.2 8h9.6" />
    </svg>
  );
}

export function TrashIcon({ size = 14, className }: SideChatIconProps): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.8 4.4h10.4M6.2 4.4V3a.8.8 0 0 1 .8-.8h2a.8.8 0 0 1 .8.8v1.4" />
      <path d="M4.2 4.4l.7 8.4a1 1 0 0 0 1 .9h4.2a1 1 0 0 0 1-.9l.7-8.4" />
    </svg>
  );
}

export function RefreshIcon({ size = 14, className }: SideChatIconProps): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M13 8a5 5 0 1 1-1.4-3.5L13 6" />
      <path d="M13 3.2V6h-2.8" />
    </svg>
  );
}

export function ChevronIcon({
  size = 13,
  expanded = false,
  className,
}: SideChatIconProps & { readonly expanded?: boolean }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.12s ease",
        flex: "none",
      }}
      aria-hidden="true"
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

export function StopIcon({ size = 13, className }: SideChatIconProps): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="9" height="9" rx="1.6" />
    </svg>
  );
}

export function SendIcon({ size = 13, className }: SideChatIconProps): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 12.8V3.2M4 7.2 8 3.2l4 4" />
    </svg>
  );
}
