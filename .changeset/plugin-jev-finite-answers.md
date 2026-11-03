---
"kibi-plugin-jev": patch
---

Treat a non-finite Jev answer as malformed. A `NaN` noul answer, or a `NaN` choice confidence in vocabulary alignment, used to flow through as a `NaN` confidence; the noul case is now rejected as `malformed`, and a non-finite confidence falls back to the chosen option's probability (or 0.5), as the semantic classifier already did.
