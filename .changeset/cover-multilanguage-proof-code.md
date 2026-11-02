---
"kibi-cli": patch
"kibi-plugin-treesitter": patch
"kibi-agent-core": patch
---

Remove unreachable branches found while covering the multi-language proof code with unit tests. Behavior is unchanged:

- The type-position check of the TypeScript references reader stops at the enclosing statement without a trailing fallback.
- Source classification reads the two ambiguous extensions (`.pl`, `.h`) without a third, impossible case.
- A symbol refresh failure no longer has a message for a coarse symbol, which is anchored to its whole file and never reported.
- The tree-sitter reference reader's first-error search and its `System.Environment` check drop branches no input can reach.
- `kibi-agent-core` exports `moduleFileFromUrl`, which telemetry uses to find its own module file when a bundle drops `import.meta.url`.
