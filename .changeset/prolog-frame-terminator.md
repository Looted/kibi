---
"kibi-cli": patch
---

A Prolog query now completes only once SWI-Prolog's whole answer frame has been read, including the toplevel's own answer to the frame marker. Before, the last few bytes of each answer could still be in flight when the caller replied. On a host running under Bun, those bytes could make the runtime stop reading the Prolog child: the next answer was never read, and the engine daemon's shutdown save then timed out.
