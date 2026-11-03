---
"kibi-cli": patch
---

Conditional requirements such as "orders may ship only when the order total is 10 or more" (or "4 or fewer") are now read as one comparison and become a rule, instead of being rejected as a disjunction.
