---
"kibi-opencode": patch
---

Add dynamic Kibi enforcement guidance with contextual prompts, .kb edit warnings, and path classification for code/KB/requirement edits.

- Implement dynamic prompt builder with contextual guidance blocks
- Add path-kind classifier for edit type detection (code, requirement, KB doc, .kb)
- Add knowledge classifier for FACT-first domain routing
- Add workspace health detector for bootstrap nudges
- Update REQ-opencode-kibi-plugin-v1 to include enforcement features
- Add SCEN-opencode-enforcement for enforcement workflow
- Update TEST-opencode-kibi-plugin-v1 to cover enforcement features
- Update CHANGELOG.md for v0.4.0
