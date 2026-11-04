---
"kibi-cli": patch
---

`kibi proof inspect` now reports `npm` as a build system when `package.json` declares `dependencies`; it previously looked for a script named `dependencies` and only noticed `devDependencies`.
