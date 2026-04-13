import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import * as React from "react";

const ComboboxAnchorContext = React.createContext<React.RefObject<HTMLDivElement | null> | null>(
  null,
);

export function ComboboxWithAnchor({
  children,
  ...props
}: Readonly<React.ComponentProps<typeof ComboboxPrimitive.Root>>) {
  const anchorRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <ComboboxAnchorContext.Provider value={anchorRef}>
      <ComboboxPrimitive.Root {...props}>{children}</ComboboxPrimitive.Root>
    </ComboboxAnchorContext.Provider>
  );
}

export function useComboboxAnchorRef() {
  return React.useContext(ComboboxAnchorContext);
}
