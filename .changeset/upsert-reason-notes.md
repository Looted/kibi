---
"kibi-cli": minor
"kibi-mcp": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

kb_upsert now says when a requirement it writes records no reason. Creating a human- or agent-authored requirement, changing its statement, or changing a fact value it is grounded on, while it has no rationale, no Why, Rationale or Context section and no linked ADR, adds a note asking for the person's own words and saying not to write a reason of one's own. When a fact value changes under a requirement that does record a reason, the note quotes that reason and asks whether it still holds. The `rationale` field description now says to send it in the same write whenever the person gave a reason.
