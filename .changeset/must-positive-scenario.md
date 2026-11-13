---
"kibi-cli": minor
"kibi-core": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-claude": minor
"kibi-codex": minor
"kibi-cursor": minor
"kibi-zcode": minor
---

A must requirement written from now on states the behaviour it promises as a success scenario on its subjects, so a prose requirement that quietly contradicts a modeled one is refused by `scenario-feasibility` instead of passing unnoticed.

- New blocking rule `must-positive-scenario`: a current must requirement needs an active scenario with `expects: success` that it links through `specified_by` and that `assumes` a fact on one of its subjects or a narrower one. The finding says which part is missing: the requirement names no subject yet, no success scenario specifies it, or its success scenarios assume nothing on its subjects.
- KB schema 17: `kibi migrate --yes` records every current must requirement in `.kb/manifest.json` (`positiveScenarioAcknowledged`). Those stay exempt; no scenario is written for them, because Kibi never invents the behaviour a requirement promises. Only must requirements written after the upgrade are judged.
- `kibi-usage` and `kibi-decisions` tell agents to write the success scenario for a new must requirement and to ask the person which rule holds when feasibility refuses it.
