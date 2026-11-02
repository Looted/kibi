---
"kibi-runtime": minor
"kibi-cli": minor
"kibi-codex": minor
"kibi-claude": minor
"kibi-cursor": minor
"kibi-zcode": minor
"kibi-opencode": patch
---

New bundled skill `kibi-provable-code` for writing code that implements a requirement.

It teaches general design practices that make code easier to review, test and replace and that also let Kibi prove claims exactly: state each decision once as data, name dependencies and configuration keys literally, read configuration at one boundary, keep deciders pure with effects at the edge, make states and transitions explicit, name failures, and declare routes, middleware and schemas in one place. It draws the line between a good refactor and a change made only for the tool (no duplicated constants, unrolled loops or dropped proof files), says when dynamic code is the design (plugins, serialization, registries, dependency injection) and how to fence it, and treats generated and vendored code as a boundary: mark it, change the generator input instead of the output, prove claims over the input and the hand-written wrapper, and cover the output with tests. It also says what to do when a source read is refused for a computed name, dynamic import, reflection or eval.

`kibi-usage` and the OpenCode guidance point to the new skill.
