import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

interface AccordionItemProps {
  title: string;
  summary?: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  variant?: "default" | "destructive";
  children: React.ReactNode;
}

export function AccordionItem({
  title,
  summary,
  icon: Icon,
  defaultOpen = false,
  variant = "default",
  children,
}: Readonly<AccordionItemProps>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border-2 border-border bg-card shadow-[var(--shadow-clay)]">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 px-4 py-3 transition-colors",
          isOpen ? "rounded-t-2xl" : "rounded-2xl",
          "hover:bg-muted/50",
        )}
      >
        {/* Icon badge */}
        {Icon && (
          <div
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2",
              variant === "destructive"
                ? "border-destructive/20 bg-destructive/10"
                : "border-primary/20 bg-primary/10",
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5",
                variant === "destructive" ? "text-destructive" : "text-primary",
              )}
            />
          </div>
        )}

        {/* Title */}
        <span
          className={cn(
            "font-display text-sm font-semibold",
            variant === "destructive" && "text-destructive",
          )}
        >
          {title}
        </span>

        {/* Summary (pushed right) */}
        {summary ? (
          <span className="ml-auto min-w-0 flex-1 truncate text-right text-xs text-muted-foreground">
            {summary}
          </span>
        ) : (
          <span className="ml-auto" />
        )}

        {/* Chevron */}
        <m.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          className="shrink-0"
        >
          <ChevronDown className="size-4 text-muted-foreground" />
        </m.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <m.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t-2 border-border/50 px-4 pb-4 pt-4">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
