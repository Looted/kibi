---
"kibi-cli": patch
---

The env references reader no longer refuses a file that only tests the global object or an alias of it for presence: `if (view)`, `!view`, `view === undefined`, `view ? a : b`, `view && view.x` and loop conditions now read nothing. The global object handed on (`f(globalThis)`, a default parameter `host = globalThis`, `view || other`, `view ?? other`) stays refused, since the receiver can read `process.env` through it.
