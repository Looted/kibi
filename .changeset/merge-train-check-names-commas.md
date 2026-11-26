---
"kibi-cli": patch
---

The merge train action reads `checks` and `train-checks` one name per line when the value contains a newline (including a single-entry YAML block scalar), so a check whose name holds a comma (such as "Secrets, dependencies, code") can be required even when it is the only check. Before, every comma split the name, the check never matched, and no pull request boarded. A single line without newlines is still comma separated.
