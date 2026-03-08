import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  variant?: "default" | "destructive";
  children: React.ReactNode;
}

export function AccordionItem({
  title,
  summary,
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
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
      >
        <span
          className={cn(
            "font-display text-sm font-semibold",
            variant === "destructive" && "text-destructive",
          )}
        >
          {title}
        </span>

        {summary && (
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{summary}</span>
        )}

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
            <div className="px-4 pb-4">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
