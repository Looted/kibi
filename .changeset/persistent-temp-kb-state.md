---
"kibi-cli": patch
---

Temporary KB validation now keeps one persistent Prolog session for the full staged-check flow, so entities and relationships written early in the flow remain visible to later queries. This prevents staged proof checks from losing their in-memory state between writes and reads.

Technical summary: request `oneShot: false` from the temporary KB Prolog factory and cover staged write visibility across multiple queries.
