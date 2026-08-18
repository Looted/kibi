# Kibi Brand Guide

Kibi is an agent-native requirements compiler and enforcement layer. Its visual identity should feel precise, calm, inspectable, and earned: product intent enters as a human signal, travels through a traceable system, and exits through a deterministic proof gate.

## Core idea: the proof rail

The logo is the design system in miniature:

- The circle is human intent and durable project memory.
- The horizontal rail is compilation, traceability, and evidence flow.
- The terminal gate is deterministic enforcement: proof either clears it or it does not.

Use this node → rail → gate grammar for progress, dividers, timelines, proof stages, and data relationships. Kibi should look like an evidence instrument, not a generic AI dashboard. Avoid neon gradients, ornamental glow, glass panels, and decorative “magic” imagery.

## Marks

The canonical files are [`assets/logo.svg`](../assets/logo.svg) and [`assets/wordmark.svg`](../assets/wordmark.svg). Use both together in primary product headers. The compact logo may stand alone where the wordmark would be unreadable, while the wordmark may stand alone in wide, brand-led contexts.

- Keep one intent-node radius of clear space around either mark.
- Use the logo at 24 px or larger and the wordmark at 72 px wide or larger on screen.
- Preserve the geometry, proportions, and internal color relationship.
- Do not recreate the wordmark with a font, add effects, rotate the gate, or place the marks on visually noisy backgrounds.

## Color

| Token | Value | Use |
|---|---:|---|
| Carbon | `#1d1e23` | Logo ground, primary surfaces |
| Deep carbon | `#111318` | Dark canvas |
| Panel | `#191c22` | Raised evidence surfaces |
| Ice | `#a2d3f4` | Wordmark, intent nodes, primary text accents |
| Signal blue | `#3e8ed6` | Rails, focus, active traceability |
| Snow | `#f4f8fb` | Primary dark-theme text |
| Mist | `#aab8c2` | Secondary text |
| Rail | `#34434f` | Inactive structure and borders |
| Proven | `#63c99a` | Complete proof only |
| Warning | `#f2b84b` | Stale, incomplete, or attention-needed evidence |
| Contradiction | `#f07178` | Contradictions, failed evidence, and materially low proof health |

Semantic color is never the only signal; pair it with text, counts, or symbols. On colored status surfaces in the HTML report, use deep-carbon text. Reserve green for fully satisfied proof—not generic positive decoration.

README and Pages badges follow the Codecov/Shields convention so they sit in a row with CI and coverage badges: 20px height, regular 11px `DejaVu Sans`/Verdana, a `#555` label pane, white status text with a 1px shadow, a light vertical sheen, 3px corners, and reserved horizontal padding. Keep the canonical logo on the label with the carbon ground blended into the label fill; do not use bold type or carbon as the label fill.

## Typography and shape

Use the platform UI sans-serif stack for prose and the platform monospace stack for requirement IDs, snapshots, evidence ages, percentages, and gate counts. The custom SVG wordmark supplies the distinctive display lettering; reports must not fetch web fonts.

Use restrained 8–14 px corner radii, thin rails, circular nodes, and compact status caps. Large soft cards and pill-heavy layouts dilute the logo’s mechanical clarity. Data should align to a visible rail or baseline wherever possible.

## Composition and data

Lead report-like surfaces with the exact result and the path that produced it. The preferred hierarchy is wordmark → health score → sequential proof rail → supporting metrics → detailed ledger. Marketing language may explain the value, but it must not displace the evidence in the first viewport.

Proof percentages are conservative: fully proven current requirements divided by all current requirements. Show the numerator and denominator beside the percentage. When useful, show sequential gate counts so an honest 0% is distinguishable from missing or broken reporting.

## Voice

Write in short, declarative, evidence-led sentences. Prefer “11 requirements are waiting on fresh evidence” to “Proof quality could potentially be improved.” State uncertainty and missing knowledge directly. Do not describe structural coverage, passing unit tests, or a pending receipt as proof.

Canonical shorthand: **Prompt the intent. Kibi makes the agent remember it—and prove the implementation.**

## Accessibility and delivery

Screen text and interactive controls must meet WCAG AA contrast. Preserve visible keyboard focus, do not rely on color alone, honor reduced-motion preferences, and provide a legible light print treatment. Generated reports and badges remain self-contained: inline the canonical mark geometry and use no network fonts, scripts, images, or styles.
