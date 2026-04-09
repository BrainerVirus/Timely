import { lazy, Suspense, useMemo, useSyncExternalStore } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { cn } from "@/shared/lib/utils";

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

const Markdown = lazy(async () => {
  await import("@uiw/react-markdown-preview/markdown.css");
  const mod = await import("@uiw/react-md-editor");
  return { default: mod.default.Markdown };
});

interface IssueMarkdownPreviewProps {
  source: string;
  className?: string;
}

export function IssueMarkdownPreview({ source, className }: Readonly<IssueMarkdownPreviewProps>) {
  const { t } = useI18n();
  const colorMode = useHtmlDataTheme();
  const normalizedSource = useMemo(
    () => (source.trim().length > 0 ? source : t("issues.markdownPreviewEmpty")),
    [source, t],
  );

  return (
    <div
      className={cn(
        "issue-md-preview min-h-[220px] rounded-2xl border-2 border-border-subtle bg-panel p-4",
        className,
      )}
      data-color-mode={colorMode}
    >
      <Suspense
        fallback={
          <div className="flex min-h-[220px] items-center justify-center rounded-xl bg-field text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        }
      >
        <Markdown source={normalizedSource} />
      </Suspense>
    </div>
  );
}
