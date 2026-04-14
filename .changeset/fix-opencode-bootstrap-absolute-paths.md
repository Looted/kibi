---
"kibi-opencode": patch
"kibi-cli": patch
---

fix(opencode): respect absolute configured KB doc roots in bootstrap detection

- Treat absolute `paths.*` entries in `.kb/config.json` as authoritative when checking whether a workspace is bootstrapped.
- Add a regression test covering healthy absolute custom doc roots while preserving the existing missing-target bootstrap warning.

fix(cli): restore prolog codec exports

- Regenerate the checked-in `src/prolog/codec.js` artifact so `toPrologString` and `toPrologAtom` are available as named exports at runtime, fixing CLI traceability test imports.
