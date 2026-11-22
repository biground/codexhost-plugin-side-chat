/**
 * Right-sidebar guide entry card for launching a Side Chat tab.
 */
import type { ReactNode } from "react";
import type {
  ClientShortcutCatalogEntry,
  ClientSidebarTabInfo,
} from "../types.ts";
import { SideChatGuideArtwork } from "./icons.tsx";

export interface SideChatGuideProps {
  readonly entryId: string;
  readonly kind: string;
  readonly title: string;
  readonly description?: string;
  readonly useTabInfo: () => ClientSidebarTabInfo;
  readonly useShortcuts?: <R>(
    selector: (entries: readonly ClientShortcutCatalogEntry[]) => R,
  ) => R;
}

export function SideChatGuide({
  title,
  description,
  kind,
  useTabInfo,
  useShortcuts,
}: SideChatGuideProps): ReactNode {
  const { tab } = useTabInfo();
  const shortcut = useShortcuts?.((entries) =>
    entries.find((entry) => entry.id === "sidechat.new"),
  );

  return (
    <button
      type="button"
      className="csc-guide-entry"
      data-sidebar-right-guide-entry={kind}
      aria-label={description === undefined ? title : `${title} ${description}`}
      aria-keyshortcuts={shortcut?.aria}
      onClick={() => {
        tab.actions.openTab("sidechat", { replaceTab: true });
      }}
    >
      <span className="csc-guide-icon" aria-hidden="true">
        <SideChatGuideArtwork size={description === undefined ? 22 : 26} />
      </span>
      <span className="csc-guide-text">
        <span className="csc-guide-title">{title}</span>
        {description !== undefined && (
          <span className="csc-guide-desc">{description}</span>
        )}
      </span>
      {shortcut !== undefined && shortcut.keys.length > 0 && (
        <span className="csc-guide-keys" aria-hidden="true">
          {shortcut.keys.map((keyLabel, index) => (
            <kbd key={`${keyLabel}-${index}`} className="csc-kbd">
              {keyLabel}
            </kbd>
          ))}
        </span>
      )}
    </button>
  );
}
