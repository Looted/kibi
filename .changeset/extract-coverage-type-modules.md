---
"kibi-cli": patch
---

Type-only CLI contracts now live in dedicated type modules so unit coverage measures executable logic instead of interface declarations. Public imports stay the same. Agents and CI still see the same runtime behavior.

- Move telemetry, proof-protocol, apply-plan, and engine types into sibling `*-types.ts` files
- Re-export those types from the original modules so public paths do not change
