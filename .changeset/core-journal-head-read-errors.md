---
"kibi-core": patch
---

Attaching a journaled KB store whose `CURRENT` head file exists but cannot be read now fails with the read error. Before, the store was attached as if it had no commit history (generation 1, sequence 0), and the next save overwrote the head with that restarted numbering.
