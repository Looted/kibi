---
"kibi-cli": patch
---

The merge train action reads `checks` and `train-checks` one name per line when they span several lines, so a check whose name holds a comma (such as "Secrets, dependencies, code") can be required. Before, every comma split the name, the check never matched, and no pull request boarded. A single line is still comma separated.
