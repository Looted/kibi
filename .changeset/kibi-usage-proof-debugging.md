---
"kibi-zcode": patch
---

The bundled kibi-usage skill now documents how to debug proof-ratchet regressions: when `kibi prove` or the proof baseline check fails, follow the new "Debugging proof regressions" section in `resources/proof.md`. It explains how to read the failure with `kibi proof explain`, compare current proof state against the committed `proof/baseline.json` ratchet with `kibi proof impact`, and resolve regressions by restoring real coverage (tests, symbol ownership, fresh receipts) instead of lowering the baseline. Agent sessions get a canonical recovery path instead of improvising around proof failures.

- Add "Debugging proof regressions" guidance to `kibi-usage/resources/proof.md`
- Point `kibi-usage/SKILL.md` at the new section and bump the skill version to 2.1.3
