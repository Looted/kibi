---
"kibi-opencode": patch
---

Kibi brief toasts now show the specific entity-level knowledge base changes that triggered the notification (e.g. "Added requirement REQ-009", "Modified fact FACT-002") instead of a generic "Why it matters" message that always read the same. Toast and full brief now come from the same persisted reason data so the brief is always a deeper view of the same content surfaced by the toast. Automatic zero-change notifications are now suppressed — Kibi will not send a "Knowledge Update" toast or brief when no meaningful entity changes, validations, or briefing impacts occurred. The `kibi-brief` command is now available as a TUI alias to open the latest full brief without typing the full route.

- Persist `deliveryReasons` model on brief envelopes to support unified rendering.
- Consolidate toast and full brief content generation from a single source of truth.
- Implement zero-change suppression logic in `generateIdleBrief` and `announceBriefTui` to eliminate redundant notifications.
- Register `kibi-brief` TUI alias for direct access to the latest briefing output.
