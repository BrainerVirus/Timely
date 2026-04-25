import Eye from "lucide-react/dist/esm/icons/eye.js";
import Pencil from "lucide-react/dist/esm/icons/pencil.js";
import {
  lazy,
  Suspense,
  useMemo,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type MutableRefObject,
  type MouseEvent,
  type SyntheticEvent,
} from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { DEFAULT_ISSUE_CODE_THEME } from "@/features/issues/lib/issue-code-theme";
import { IssueMarkdownPreview } from "@/features/issues/ui/IssueMarkdownPreview/IssueMarkdownPreview";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/Button/Button";

import type { IssueComposerMode } from "@/features/issues/types/issue-details";
import type { IssueCodeTheme } from "@/shared/types/dashboard";
import type { MDEditorProps } from "@uiw/react-md-editor";

function useHtmlDataTheme(): "light" | "dark" {
  return useSyncExternalStore(
    (onChange) => {
      const node = document.documentElement;
      const observer = new MutationObserver(() => onChange());
      observer.observe(node, { attributes: true, attributeFilter: ["data-theme"] });
      return () => observer.disconnect();
    },
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => "dark",
  );
}

const MDEditor = lazy(async () => {
  await import("@uiw/react-md-editor/markdown-editor.css");
  await import("@uiw/react-markdown-preview/markdown.css");
  const mod = await import("@uiw/react-md-editor");
  return { default: mod.default };
});

interface IssueMarkdownFieldProps {
  value: string;
  onChange: (value: string) => void;
  codeTheme?: IssueCodeTheme;
  mode?: IssueComposerMode;
  onModeChange?: (mode: IssueComposerMode) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  height?: number;
}

export function IssueMarkdownField({
  value,
  onChange,
  codeTheme = DEFAULT_ISSUE_CODE_THEME,
  mode = "write",
  onModeChange,
  disabled,
  placeholder,
  className,
  height = 440,
}: Readonly<IssueMarkdownFieldProps>) {
  const { t } = useI18n();
  const colorMode = useHtmlDataTheme();
  const selectionRef = useRef({ start: value.length, end: value.length });
  const editorProps = useMemo(
    () =>
      ({
        value,
        onChange: (nextValue) => onChange(typeof nextValue === "string" ? nextValue : ""),
        visibleDragbar: false,
        enableScroll: true,
        hideToolbar: mode === "preview",
        preview: "edit",
        height,
        textareaProps: {
          placeholder,
          disabled,
          onClick: (event: MouseEvent<HTMLTextAreaElement>) => {
            updateSelection(event.currentTarget, value, selectionRef);
          },
          onKeyUp: (event: KeyboardEvent<HTMLTextAreaElement>) => {
            updateSelection(event.currentTarget, value, selectionRef);
          },
          onSelect: (event: SyntheticEvent<HTMLTextAreaElement>) => {
            updateSelection(event.currentTarget, value, selectionRef);
          },
        },
        extraCommands: [],
      }) satisfies MDEditorProps,
    [disabled, height, mode, onChange, placeholder, value],
  );

  const selectionStart = Math.max(selectionRef.current.start, value.length);
  const quickActionQuery = getQuickActionQuery(value, selectionStart);

  return (
    <div
      className={cn(
        "issue-md-editor overflow-hidden rounded-[1.5rem] border-2 border-border-subtle bg-field shadow-clay-inset",
        className,
      )}
      data-color-mode={colorMode}
      data-issue-code-theme={codeTheme}
    >
      <div className="flex items-center justify-between border-b border-border-subtle bg-tray/90 px-3 py-2">
        <span className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Markdown
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-lg px-3"
          onClick={() => onModeChange?.(mode === "preview" ? "write" : "preview")}
        >
          {mode === "preview" ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {mode === "preview" ? t("issues.composerModeWrite") : t("issues.composerModePreview")}
        </Button>
      </div>

      {mode === "preview" ? (
        <IssueMarkdownPreview
          source={value}
          codeTheme={codeTheme}
          className="min-h-[440px] rounded-none border-0 bg-field p-5 shadow-none"
        />
      ) : (
        <div className="relative">
          <Suspense
            fallback={
              <div
                className="flex items-center justify-center bg-field text-sm text-muted-foreground"
                style={{ height }}
              >
                {t("common.loading")}
              </div>
            }
          >
            <MDEditor {...editorProps} />
          </Suspense>

          {quickActionQuery !== null ? (
            <div className="absolute right-3 bottom-3 z-10 rounded-2xl border-2 border-border-subtle bg-popover p-2 shadow-clay">
              <button
                type="button"
                className="rounded-xl border-2 border-primary/35 bg-primary/12 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/18"
                onClick={() => {
                  onChange(insertQuickAction(value, selectionStart, "/spend 1h "));
                }}
              >
                /spend 1h
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function updateSelection(
  textArea: HTMLTextAreaElement,
  value: string,
  selectionRef: MutableRefObject<{ start: number; end: number }>,
) {
  const start = textArea.selectionStart ?? value.length;
  const end = textArea.selectionEnd ?? start;
  selectionRef.current = { start, end };
}

function getQuickActionQuery(value: string, selectionStart: number) {
  const beforeCursor = value.slice(0, selectionStart);
  const slashIndex = Math.max(beforeCursor.lastIndexOf(" "), beforeCursor.lastIndexOf("\n"));
  const token = beforeCursor.slice(slashIndex + 1);

  if (token.length === 0 || !token.startsWith("/")) {
    return null;
  }

  return "/spend".startsWith(token.toLowerCase()) ? token : null;
}

function insertQuickAction(value: string, selectionStart: number, quickAction: string) {
  const beforeCursor = value.slice(0, selectionStart);
  const slashIndex = Math.max(beforeCursor.lastIndexOf(" "), beforeCursor.lastIndexOf("\n"));
  const tokenStart = slashIndex + 1;
  return `${value.slice(0, tokenStart)}${quickAction}${value.slice(selectionStart)}`;
}
