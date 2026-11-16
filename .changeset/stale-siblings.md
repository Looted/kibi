---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": patch
---

`kb_upsert` now refuses a fact write that makes two current requirements grounded on the fact contradict, with `SEMANTIC_CONTRADICTION` naming every pair, as it already refused a requirement write. Changing one requirement's value fact used to be accepted even when a second requirement on the same quantity could no longer hold. A contradiction the KB already held does not block an unrelated edit of the fact, and the dry run refuses the same write. `kb_apply_plan` (and any batched commit) now runs the contradiction check once after every step, so a fact and the requirement it would conflict with can change together. A value fact write that changes the value, or creates the fact, returns `siblings`: every other current requirement grounded on the fact or on another fact of the same quantity, with its title, firmness, value and claim text, and `statesOldValue` when the claim still states the value from before the write. Each sibling is also the first warning lines and a required `nextActions` entry, so an agent updates or asks about it before stopping.
