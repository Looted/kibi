---
"kibi-core": patch
"kibi-cli": patch
---

`kibi check` no longer reports `must-priority-coverage` for a requirement with `status: retired`. A retired requirement no longer governs, so it owes no scenario or test, the same way `current_req/1` already treats it. Before, the only way to clear the finding was to keep tests attached to the retired requirement, which `retired-owner-only` then reported, so a KB that retired a must-priority requirement could not reach zero findings.
