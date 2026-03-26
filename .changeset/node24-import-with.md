---
"kibi-cli": patch
"kibi-mcp": patch
---

Fix Node.js v24 compatibility by replacing deprecated `import ... assert` with `import ... with`

Node.js v24 rejects the `assert` keyword in import attributes (`import ... assert { type: "json" }`), causing CI test failures in tests that spawn node subprocesses. Replaced with the standard `with` keyword per the TC39 Import Attributes proposal. This also fixes the built `dist/` output used by kibi-mcp when spawning CLI subprocesses.
