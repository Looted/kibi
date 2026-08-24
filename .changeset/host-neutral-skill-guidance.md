---
"kibi-cli": patch
---

Canonical Kibi skill guidance no longer names specific agent hosts or editor products.

Users running SkillOpt trust-plane scans (or anyone redistributing the bundled skills) previously hit hard failures because baseline skill text mentioned a specific host by name while candidate validation forbids host/provider claims in optimized bodies. The guidance now says "hosts may expose prefixed identifiers" and "editor dot-directories", keeping the same operational advice without naming any product. No workflow steps changed; only two sentences were reworded.

- kibi-usage SKILL.md: host-prefix sentence made host-neutral
- kibi-freshness SKILL.md: dirty-worktree example path made product-neutral
