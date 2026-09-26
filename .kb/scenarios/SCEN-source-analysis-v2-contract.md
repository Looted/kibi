---
title: V2 source analysis preserves completeness and validated symbol identity
status: open
text_ref: packages/plugin-sdk/tests/sdk.test.ts; packages/plugin-builtin/tests/builtin.test.ts; packages/cli/tests/plugins/source-analysis-v2.test.ts; packages/plugin-treesitter/tests/plugin.test.mjs
tags:
  - multilingual
  - source-analysis
  - v2
id: SCEN-source-analysis-v2-contract
type: scenario
---
# V2 source analysis preserves completeness and validated symbol identity

Given supplied source content containing CRLF line endings and non-BMP characters, when a v2 extractor returns ranges, the host validates their one-based line and zero-based UTF-16 column positions against those exact bytes without rewriting the content.

Given nested declarations, when parser metadata identifies qualified/container names, the host treats those names as locators and preserves authored symbol identity only when the locator is unambiguous.

Given an extractor result, `ok` with an empty declaration list remains valid; `partial` reports diagnostics and uncovered ranges; `unsupported` and `failed` results do not expose symbols as a complete analysis.