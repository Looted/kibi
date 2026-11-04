---
"kibi-cli": patch
---

An `env` source proof over browser code no longer fails on ordinary feature checks. Since 2.40 the `references` reader refused every `typeof window`, `'Notification' in window` and any local variable that happens to be called `window`, `self` or `global`, so a claim such as "the app reads only these variables" could not be proved on an Angular or React app at all. Handing the global object on (`send(window)`, `const w = window`, `'process' in window`) still fails the read with its place.

Technical summary: `typeof` of a global or environment object is not a hand-on. A literal key tested with `in` against `globalThis`, `global`, `window` or `self` is not a hand-on unless the key is `process` or `Bun`; a computed key, and `in` on `process.env` itself, still refuse. A variable declaration whose initializer binds no name (`const window = pick()`) now shadows the global in its scope; only declarations that bind a name (`const g = globalThis`, `const p = require("node:process")`) stay file-wide aliases.
