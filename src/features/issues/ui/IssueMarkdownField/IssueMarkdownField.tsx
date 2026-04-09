import { lazy, Suspense, useMemo, useSyncExternalStore } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { IssueMarkdownPreview } from "@/features/issues/ui/IssueMarkdownPreview/IssueMarkdownPreview";
import { cn } from "@/shared/lib/utils";

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
  mode?: "write" | "preview" | "split";
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  height?: number;
}

export function IssueMarkdownField({
  value,
  onChange,
  mode = "split",
  disabled,
  placeholder,
  className,
  height = 440,
}: Readonly<IssueMarkdownFieldProps>) {
  const { t } = useI18n();
  const colorMode = useHtmlDataTheme();
  const editorProps = useMemo(
    () =>
      ({
        value,
        onChange: (v) => onChange(typeof v === "string" ? v : ""),
        visibleDragbar: true,
        height,
        enableScroll: true,
        preview: mode === "split" ? "live" : "edit",
        textareaProps: {
          placeholder,
          disabled,
        },
      }) satisfies MDEditorProps,
    [disabled, height, mode, onChange, placeholder, value],
  );

  if (mode === "preview") {
    return <IssueMarkdownPreview source={value} className={className} />;
  }

  return (
    <div
      className={cn(
        "issue-md-editor min-h-[440px] rounded-2xl border-2 border-border-subtle",
        className,
      )}
      data-color-mode={colorMode}
    >
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center rounded-xl bg-field text-sm text-muted-foreground"
            style={{ height }}
          >
            {t("common.loading")}
          </div>
        }
      >
        <MDEditor {...editorProps} />
      </Suspense>
    </div>
  );
}
