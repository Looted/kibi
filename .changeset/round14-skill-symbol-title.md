---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The kibi-usage skill (2.15.0) now tells agents to title a symbol after the behavioral member the extractor can find (`ClassName.methodName`, an exported function, or a class). It also explains that linking a coarse file- or module-level symbol to a requirement is refused when the file already has granular behavioral symbols, unless the symbol sets `granularity_reason`, so agents stop retrying refused symbol writes.

Technical summary: the "Symbol-First Traceability" section of `kibi-usage/SKILL.md` gains one paragraph on `title` and the granularity gate, listing the allowed `granularity_reason` values (`config-artifact`, `module-level-behavior`, `extractor-miss`, `legacy-link`, `test-suite`). Host skill copies are regenerated.
