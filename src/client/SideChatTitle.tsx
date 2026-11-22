/**
 * Live Side Chat tab chip title with persistent/ephemeral indicator dot and
 * double-click inline rename (with IME composition guard).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ClientSidebarTabInfo, ClientTranslateFn } from "../types.ts";
import { SideChatIcon } from "./icons.tsx";
import {
  wrapHostTranslator,
  type SideChatTranslate,
} from "./locales.ts";
import type { SideChatLocale } from "./protocol.ts";
import type { SideChatTabTitleSnapshot } from "./tab-manager.ts";

export interface SideChatTitleProps {
  readonly useTabInfo: () => ClientSidebarTabInfo;
  readonly useSideChatTitle: <R>(
    key: string,
    selector: (value: SideChatTabTitleSnapshot | undefined) => R,
  ) => R;
  readonly renameTab: (key: string, nextTitle: string) => Promise<void>;
  readonly getLocale: () => SideChatLocale;
  readonly t: ClientTranslateFn | SideChatTranslate;
}

export function SideChatTitle({
  useTabInfo,
  useSideChatTitle,
  renameTab,
  getLocale,
  t: hostT,
}: SideChatTitleProps): ReactNode {
  const { tab } = useTabInfo();
  const titleState = useSideChatTitle(tab.id, (value) => value);
  const t = wrapHostTranslator(hostT as ClientTranslateFn, getLocale());
  const displayTitle = titleState?.title || tab.title || t("tab.title");
  const mode = titleState?.mode ?? null;

  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (editing || !titleState?.threadId) return;
    const chip = labelRef.current?.closest?.("[data-dockkit-tab], [data-dockkit-float-grip]");
    if (!chip) return;
    const onDblClick = (event: Event): void => {
      event.stopPropagation();
      cancelledRef.current = false;
      setEditing(true);
    };
    chip.addEventListener("dblclick", onDblClick);
    return () => {
      chip.removeEventListener("dblclick", onDblClick);
    };
  }, [editing, titleState?.threadId]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  return (
    <span className="csc-tab-title-wrap">
      <SideChatIcon size={14} />
      {editing ? (
        <input
          ref={inputRef}
          className="csc-tab-title-input"
          defaultValue={displayTitle}
          maxLength={120}
          aria-label={t("tab.renameAria")}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onBlur={(event) => {
            setEditing(false);
            const next = event.currentTarget.value.trim();
            if (!cancelledRef.current && next !== "" && next !== displayTitle) {
              void renameTab(tab.id, next).catch(() => undefined);
            }
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            const native = event.nativeEvent as { isComposing?: boolean; keyCode?: number } | undefined;
            if (native?.isComposing || event.keyCode === 229 || native?.keyCode === 229) return;
            if (event.key === "Escape") {
              cancelledRef.current = true;
              event.currentTarget.blur();
            } else if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
      ) : (
        <span ref={labelRef} className="csc-tab-title-text">
          {displayTitle}
        </span>
      )}
      {mode && (
        <span
          className="csc-tab-mode-dot"
          data-csc-mode={mode}
          title={t(mode === "persistent" ? "mode.persistent.badge" : "mode.ephemeral.badge")}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
