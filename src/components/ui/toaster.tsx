import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  const theme =
    globalThis.window !== undefined && typeof globalThis.matchMedia === "function"
      ? "system"
      : "light";

  return (
    <SonnerToaster
      position="bottom-right"
      theme={theme}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-start gap-3 rounded-xl border-2 border-[color:var(--color-border-strong)] bg-[color:var(--color-popover)] p-4 shadow-[var(--shadow-clay-popup)] text-sm font-body text-foreground w-[356px]",
          title: "font-display font-semibold text-foreground",
          description: "text-muted-foreground text-xs mt-0.5",
          actionButton:
            "whitespace-nowrap rounded-xl border-2 border-primary/80 bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground cursor-pointer shadow-[1px_1px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none",
          cancelButton:
            "rounded-xl border-2 border-[color:var(--color-border-subtle)] px-3 py-1.5 text-xs font-bold text-muted-foreground cursor-pointer shadow-[var(--shadow-clay)] active:translate-y-[1px] active:shadow-none",
          success: "border-accent/30",
          error: "border-destructive/30",
          info: "border-primary/30",
          loading: "border-secondary/30",
        },
      }}
    />
  );
}
