# Components

## Shared primitives first

Before creating custom classes, check:

- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/input-group.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/combobox.tsx`
- `src/components/ui/tabs.tsx`
- `src/lib/control-styles.ts`

## Preferred patterns

### Buttons

- Use `Button` for standard CTA, ghost, soft, and destructive actions.
- Avoid hand-rolled CTA buttons unless they are truly custom surfaces.

### Segmented controls

- Use helpers from `src/lib/control-styles.ts` for segmented and choice controls.
- Prefer shared segmented styles over repeated `rounded-xl border-2 px-* py-*` bundles.

### Compact action buttons

- Use shared compact helpers for tray actions, utility actions, icon buttons, and pager internals.
- Keep compact buttons clearly secondary to standard CTAs.

### Icon buttons

- Dialog and sheet close buttons should still feel tactile.
- Pager arrows and calendar triggers should use the same compact icon-button language when possible.

## Consistency checklist

- Does this control match the nearest comparable Timely control?
- Is the height appropriate for its role?
- Is the depth model correct: inset for field, raised for surface, offset for button?
- Is the button state visible enough in both light and dark themes?
- Should this styling live in a shared helper instead of staying local?

## When custom is allowed

Custom styling is acceptable for:

- card-like action surfaces
- navigation items with bespoke motion/active indicators
- calendar grid internals
- specialized disclosure headers like accordions/log panels

Even then, reuse Timely tokens for border, radius, focus, and shadow behavior.
