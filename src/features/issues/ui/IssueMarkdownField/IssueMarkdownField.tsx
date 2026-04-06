import { lazy, Suspense, useMemo, useSyncExternalStore } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
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
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function IssueMarkdownField({
  value,
  onChange,
  disabled,
  placeholder,
  className,
}: Readonly<IssueMarkdownFieldProps>) {
  const { t } = useI18n();
  const colorMode = useHtmlDataTheme();
  const editorProps = useMemo(
    () =>
      ({
        value,
        onChange: (v) => onChange(typeof v === "string" ? v : ""),
        visibleDragbar: true,
        height: 440,
        enableScroll: true,
        textareaProps: {
          placeholder,
          disabled,
        },
      }) satisfies MDEditorProps,
    [disabled, onChange, placeholder, value],
  );

  return (
    <div
      className={cn("issue-md-editor min-h-[440px] rounded-2xl border-2 border-border-subtle", className)}
      data-color-mode={colorMode}
    >
      <Suspense
        fallback={
          <div className="flex h-[440px] items-center justify-center rounded-xl bg-field text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        }
      >
        <MDEditor {...editorProps} />
      </Suspense>
    </div>
  );
}
