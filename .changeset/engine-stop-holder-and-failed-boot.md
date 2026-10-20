---
"kibi-cli": patch
"kibi-runtime": patch
---

When `kibi engine stop` finds the branch store held by an engine it cannot reach, it now names that engine's process instead of its SWI-Prolog child. An engine daemon that fails to attach its branch store (for example with `store_locked`) now stops its SWI-Prolog child and exits, instead of staying alive with no socket.
