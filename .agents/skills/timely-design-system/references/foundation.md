# Foundation

## Visual identity

Timely uses a claymorphism-inspired desktop UI with warm OKLCH surfaces, chunky radii, visible borders, and tactile depth.

- Prefer theme tokens from `src/styles/globals.css` instead of ad hoc colors.
- Use `border-2` on primary surfaces and controls.
- Use `rounded-xl` for most controls and `rounded-2xl` for card-like surfaces.
- Keep the orange primary and blue accent balance defined by the theme.

## Depth model

- **Fields and triggers** use inset depth: `shadow-[var(--shadow-clay-inset)]`.
- **Cards and panels** use raised depth: `shadow-[var(--shadow-clay)]`.
- **Floating overlays** use popup depth: `shadow-[var(--shadow-clay-popup)]`.
- **Buttons** use visible offset shadows, not barely perceptible tinting.

## Button depth rules

- `primary` buttons should use `var(--shadow-button-primary)`.
- `soft` buttons should use `var(--shadow-button-soft)`.
- `destructive` buttons should use `var(--shadow-button-destructive)`.
- `ghost` buttons use a neutral border-colored offset shadow when they behave like tactile controls.
- Pressed state should generally be `active:translate-y-[1px] active:shadow-none`.

## Typography and emphasis

- Use `font-display` for headings and high-emphasis labels.
- Use `text-sm` as the default control text size.
- Use `text-xs` for compact controls, dense utility controls, and metadata.

## Surface rules

- Inputs/triggers: `bg-muted` or equivalent field surface.
- Cards: `bg-card`.
- Subtle emphasized panels: light tint backgrounds such as `bg-primary/5`, `bg-accent/5`, `bg-destructive/5` with matching borders.

## Scroll containers

- Any intentional scroll container should also include `scroll-smooth` and `overscroll-contain`.
- Apply this to `overflow-y-auto`, `overflow-x-auto`, and `overflow-auto` surfaces unless there is a deliberate behavior reason not to.
- Treat this as the default Timely scroll behavior for panels, dialogs, popovers, lists, and page content shells.

## Anti-patterns

- Do not introduce flat, shadowless controls beside clay controls.
- Do not use thin `border` for controls where the system uses `border-2`.
- Do not invent per-feature colors when a token already exists.
- Do not rely on opacity-only close buttons when the rest of the app uses tactile controls.
