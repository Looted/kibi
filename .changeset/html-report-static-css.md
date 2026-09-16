---
"kibi-cli": patch
---

The HTML health report now loads its stylesheet from a static CSS file instead of inlining hundreds of CSS lines in TypeScript. The rendered report looks the same for operators. Unit coverage no longer treats those stylesheet lines as executable TypeScript, so the number reflects real report logic.

- Extract report CSS to `html-report.css` with brand token placeholders
- Copy the stylesheet into `dist/report` during the `kibi-cli` build
