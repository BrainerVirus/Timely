import { cva } from "class-variance-authority";
import { Toaster as SonnerToaster } from "sonner";

const toastVariants = cva(
  "flex w-89 items-start gap-3 rounded-xl border-2 bg-popover p-4 font-body text-sm text-foreground shadow-clay-popup",
  {
    variants: {
      variant: {
        default: "border-border-strong",
        success: "border-success/35",
        error: "border-destructive/35",
        info: "border-accent/35",
        loading: "border-secondary/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const buttonVariants = cva(
  "cursor-pointer rounded-xl border-2 px-3 py-1.5 text-xs font-bold whitespace-nowrap active:translate-y-px",
  {
    variants: {
      type: {
        action:
          "border-primary/80 bg-primary text-primary-foreground shadow-[1px_1px_0_0_var(--color-border)] active:shadow-none",
        cancel: "border-border-subtle text-muted-foreground shadow-clay active:shadow-none",
      },
    },
    defaultVariants: {
      type: "action",
    },
  },
);

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
          toast: toastVariants(),
          title: "font-display font-semibold text-foreground",
          description: "text-xs mt-0.5 leading-[1.55]",
          actionButton: buttonVariants({ type: "action" }),
          cancelButton: buttonVariants({ type: "cancel" }),
          /* Surface + title/icon colors: globals.css (unstyled toasts) */
          success: "",
          error: "",
          info: "",
          loading: "border-secondary/30",
        },
      }}
    />
  );
}
