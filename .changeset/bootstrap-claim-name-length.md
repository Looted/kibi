---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Bootstrap plans no longer turn a whole clause into a subject key. A key such as `support_inbox.update_in_real_time_when_a_new_ticket_is_assigned_to_the_agent_without_a_page_refresh` is now planned as `support_inbox.update_in_real_time`, and the plan diagnostics name the original key so the operator can pick a better name before approving. Two different subjects that would share a shortened key get distinct keys instead of colliding.

An aspect longer than four words or 40 characters is shortened deterministically: the words before the first clause boundary (`when`, `while`, `for`, `and`, ...) without leading or trailing stop words, then, if still too long, its content words, then the first and last two content words. Each shortening adds a `subject-key-shortened:` diagnostic; a collision between different subjects adds a third segment from the later claim's wording (or a short digest) and a `subject-key-disambiguated:` diagnostic, while claims about the same subject keep sharing one key. One registry per plan covers repository Markdown and declared intent claims. The kibi-bootstrap skill (3.7.0) and `docs/mcp-reference.md` explain how components are supplied and how aspects are derived.
