---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

An idle connection to the engine daemon no longer keeps its client process alive. `kibi-mcp` now exits once its input closes, also after tool calls that went through the engine such as `kb_model` analyze; before, it stayed running until killed. A failed `kibi sync` now prints its error once; before, the same error block appeared twice.
