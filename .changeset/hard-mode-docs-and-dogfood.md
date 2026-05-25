---
"kibi-opencode": patch
---

The kibi-opencode README now fully documents the three smart-enforcement modes so users can choose the right posture for their workflow. This repository's dogfood configuration has also switched to `hard` mode, which means authoritative roots and linked git worktrees will fail closed until the Kibi checkpoint passes.

Technical summary:
- Document `advisory`, `strict`, and `hard` modes in the Smart Enforcement section with authoritative-root and linked-worktree fail-closed semantics.
- Update the config keys table to list `advisory`, `strict`, and `hard` as valid values for `guidance.smartEnforcement.mode`.
- Update the Hook Policy section to clarify that enforcement is advisory by default with opt-in strict and hard modes available.
- Change `.opencode/kibi.json` dogfood config from `mode: "advisory"` to `mode: "hard"`.
