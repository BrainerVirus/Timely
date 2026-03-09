import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-start gap-3 rounded-xl border-2 border-border bg-card p-4 shadow-[var(--shadow-clay)] text-sm font-body text-foreground w-[356px]",
          title: "font-display font-semibold text-foreground",
          description: "text-muted-foreground text-xs mt-0.5",
          actionButton:
            "whitespace-nowrap rounded-xl border-2 border-primary/80 bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground cursor-pointer shadow-[1px_1px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none",
          cancelButton:
            "rounded-xl border-2 border-border px-3 py-1.5 text-xs font-bold text-muted-foreground cursor-pointer shadow-[1px_1px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none",
          success: "border-accent/30",
          error: "border-destructive/30",
          info: "border-primary/30",
          loading: "border-secondary/30",
        },
      }}
    />
  );
}
