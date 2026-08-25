---
title: Coordinate persistence and approved repair
status: active
id: SCEN-generated-coordinate-repair
type: scenario
---
# Coordinate persistence and approved repair

Given a source-linked symbol with generated coordinates persisted, when a same-identity source-first upsert omits caller coordinate fields, then compiled RDF retains valid coordinates while the authored manifest stays coordinate-free.

Given RDF coordinates missing while source, artifact, and warm cache still agree, when a plain sync runs, it stays an honest no-op; when the exact automatic coordinate-refresh action is explicitly applied, the symbol repersists and symbol coverage no longer reports the gap.
