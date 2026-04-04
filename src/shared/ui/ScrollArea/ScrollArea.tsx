import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

type ScrollAreaRootProps = React.ComponentProps<typeof ScrollAreaPrimitive.Root>;

export type ScrollAreaProps = ScrollAreaRootProps & {
  viewportRef?: React.Ref<HTMLDivElement>;
  viewportClassName?: string;
  onViewportScroll?: React.UIEventHandler<HTMLDivElement>;
  /** Vertical only (default) or both axes for two-way scrollports. */
  scrollbars?: "vertical" | "both";
  /** Merged onto the Radix thumb (e.g. stronger contrast on dense canvases). */
  scrollbarThumbClassName?: string;
  viewportProps?: Omit<
    React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Viewport>,
    "children" | "ref"
  >;
};

function ScrollArea({
  className,
  children,
  viewportRef,
  viewportClassName,
  onViewportScroll,
  scrollbars = "vertical",
  scrollbarThumbClassName,
  viewportProps,
  ...props
}: Readonly<ScrollAreaProps>) {
  const { className: viewportPropsClassName, ...restViewportProps } = viewportProps ?? {};

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        onScroll={onViewportScroll}
        {...restViewportProps}
        className={cn(
          "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
          viewportClassName,
          viewportPropsClassName,
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {scrollbars === "both" ? (
        <>
          <ScrollBar orientation="horizontal" thumbClassName={scrollbarThumbClassName} />
          <ScrollBar orientation="vertical" thumbClassName={scrollbarThumbClassName} />
        </>
      ) : (
        <ScrollBar orientation="vertical" thumbClassName={scrollbarThumbClassName} />
      )}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  thumbClassName,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> & {
  thumbClassName?: string;
}) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className={cn(
          "relative flex-1 rounded-full bg-muted-foreground/48 hover:bg-muted-foreground/72 active:bg-muted-foreground/78",
          thumbClassName,
        )}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea };
