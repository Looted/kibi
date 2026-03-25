---
id: FACT-ARC-002
title: Styling system based on Tailwind CSS v4
status: active
tags: [architecture, styling, tailwind, css]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

The project uses Tailwind CSS v4 as the primary styling system, migrating away from plain CSS and SCSS for better maintainability and developer experience.

## Migration Approach

Tailwind CSS v4 was chosen to replace SCSS and plain CSS approaches:

- Utility classes (e.g., `bg-void`, `text-text-primary`) for consistent theming
- Component variants for different UI states (hover, focus, disabled)
- Responsive design utilities for breakpoints
- Dark mode support via CSS variables

## Key Features

**Utility Classes**
Core color and spacing tokens are defined as CSS variables (e.g., `--color-void`, `--color-text-primary`) and exposed via Tailwind classes.
Components can use variant modifiers (e.g., `bg-void`, `text-muted`) to adapt to different contexts.
Responsive design uses prefixes like `md:`, `lg:`, `xl:`, `2xl:` for different screen sizes.

**Component Variants**
UI components support variant attributes (e.g., `bg-void`, `variant="outline"`) for different visual styles (default, outline, ghost).
Buttons use `variant` attribute (default, primary, destructive, ghost).

**Configuration**
`styles.css` configures theme with `@theme` directive to register CSS variables and extend Tailwind.
Tailwind processes are integrated via the Angular CLI build.

## Integration with Angular

Tailwind integrates seamlessly with Angular's component ecosystem:

- Styling can be applied via class or style bindings in templates
- Utility classes work with signal-based components and OnPush change detection
- Build process compiles Tailwind CSS from SCSS source files during Angular build

**Design System Alignment**

The Tailwind implementation aligns with the "Professional's Cockpit" design philosophy:

- Colors use warm charcoal (#181818) instead of pure black (#000000)
- Panel colors use slightly lighter charcoal (#252525)
- Text uses soft white (#E0E0E0) with charcoal adjustment for reduced eye strain
- High-contrast colors used sparingly for actions and active states
- This creates a warm, professional look that works well in both dark and light video environments

The styling system is designed to be:

- Optically Recessive: UI elements fade to keep video content as hero
- Cognitively Cheap: Low panel contrast to reduce eye strain while maintaining data visibility
- Technically Aggressive: High contrast feedback for user actions ensures immediate visibility

This color palette approach avoids harsh "OLED black" smearing and provides better visibility across diverse video footage (snowy caves, gyms, etc.).

## Usage Patterns

**Backgrounds**: Use canonical Tailwind classes (bg-void, bg-panel, text-text-primary) instead of arbitrary values.
**Text**: Use text-text-primary for body text, text-text-secondary for metadata.
**Borders**: Use border-border for separators instead of arbitrary colors.

**Dark Mode**: The project likely supports or will support dark mode through CSS variables.
