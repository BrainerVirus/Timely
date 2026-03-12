import XIcon from "lucide-react/dist/esm/icons/x.js";
import { Dialog as SheetPrimitive } from "radix-ui";
import * as React from "react";
import { getCompactIconButtonClassName } from "@/lib/control-styles";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=closed]:[animation:backdropOut_200ms_ease-in_both] data-[state=open]:[animation:backdropIn_250ms_ease-out_both]",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
}) {
  const { t } = useI18n();

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          "fixed z-50 flex flex-col gap-4 border-2 border-border bg-background shadow-[var(--shadow-clay)]",
          side === "right" &&
            "inset-y-0 right-0 h-full w-3/4 rounded-l-2xl data-[state=closed]:[animation:sheetSlideOutRight_250ms_ease-in_both] data-[state=open]:[animation:sheetSlideInRight_300ms_ease-out_both] sm:max-w-sm",
          side === "left" &&
            "inset-y-0 left-0 h-full w-3/4 rounded-r-2xl data-[state=closed]:[animation:sheetSlideOutLeft_250ms_ease-in_both] data-[state=open]:[animation:sheetSlideInLeft_300ms_ease-out_both] sm:max-w-sm",
          side === "top" &&
            "inset-x-0 top-0 h-auto rounded-b-2xl data-[state=closed]:[animation:sheetSlideOutTop_250ms_ease-in_both] data-[state=open]:[animation:sheetSlideInTop_300ms_ease-out_both]",
          side === "bottom" &&
            "inset-x-0 bottom-0 h-auto rounded-t-2xl data-[state=closed]:[animation:sheetSlideOutBottom_250ms_ease-in_both] data-[state=open]:[animation:sheetSlideInBottom_300ms_ease-out_both]",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            className={cn(
              "absolute top-4 right-4",
              getCompactIconButtonClassName(false, "bg-background"),
            )}
          >
            <XIcon className="size-4" />
            <span className="sr-only">{t("ui.close")}</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
