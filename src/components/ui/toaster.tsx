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
            "flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card text-sm font-body text-foreground w-[356px]",
          title: "font-display font-semibold text-foreground",
          description: "text-muted-foreground text-xs mt-0.5",
          actionButton:
            "rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground cursor-pointer",
          cancelButton:
            "rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground cursor-pointer",
          success: "border-accent/30",
          error: "border-destructive/30",
          info: "border-primary/30",
          loading: "border-secondary/30",
        },
      }}
    />
  );
}
