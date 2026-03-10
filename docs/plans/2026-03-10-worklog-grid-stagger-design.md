# Worklog Grid Stagger Design

## Overview

Update the Worklog week and period day-card grids to use Motion-driven grid-aware entrance timing instead of simple index-based staggering.

## Approved Decisions

- Keep using Motion for React for the card entrance animation.
- Use the top-left visible card as the stagger origin.
- Make the animation ripple outward across the grid based on grid position rather than raw array order.
- Apply the behavior to both the week grid and the period daily breakdown grid.
- Keep the existing entrance style subtle: opacity plus a small vertical lift.

## Implementation Notes

- Replace index-based delays in `src/features/dashboard/week-view.tsx` with delays derived from the cards' measured rendered positions.
- Use the actual top-left card position as the origin instead of assuming a column count from responsive classes.
- Use Motion's `stagger()` utility to distribute delays once cards are ranked by physical distance from that measured origin.
- Keep the period summary stat cards unchanged; only the day-card grids need the ripple behavior.

## Success Criteria

- Week and period day cards animate from the top-left card outward.
- The stagger feels grid-aware rather than list-like.
- Existing layout, selection, and click behavior remain unchanged.
