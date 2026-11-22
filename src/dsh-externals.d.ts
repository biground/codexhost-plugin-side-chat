/**
 * Minimal ambient type declarations for CodexHost / DSH platform externals
 * so the standalone plugin repository typechecks without the host monorepo.
 */
declare module "@deepseek-ai/cordis" {
  export interface Context {
    effect(callback: () => void | (() => void), label?: string): () => void;
    on(event: string, listener: (...args: unknown[]) => void): () => void;
  }
}

declare module "@deepseek-ai/dsh-client-store" {
  export type StoreSelector<TState, TResult> = (state: TState) => TResult;
  export interface StoreLike<TState = Record<string, unknown>> {
    getState(): TState;
    subscribe(listener: () => void): () => void;
  }
}

declare module "@deepseek-ai/dsh-client-ui-slots" {
  import type { ComponentType } from "react";

  export interface SlotRegistration {
    id: string;
    component: ComponentType<Record<string, unknown>>;
    order?: number;
  }

  export interface SlotsService {
    register(slotName: string, registration: SlotRegistration): () => void;
  }
}

declare module "@deepseek-ai/dsh-client-ui-primitives" {
  import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

  export function Button(
    props: ButtonHTMLAttributes<HTMLButtonElement> & {
      variant?: string;
      size?: string;
      children?: ReactNode;
    },
  ): ReactNode;

  export function Input(
    props: InputHTMLAttributes<HTMLInputElement> & {
      className?: string;
    },
  ): ReactNode;
}

declare module "@deepseek-ai/dsh-client-ui-dockkit" {
  import type { ReactNode } from "react";

  export interface DockPanelProps {
    title?: string;
    children?: ReactNode;
  }

  export function DockPanel(props: DockPanelProps): ReactNode;
}
