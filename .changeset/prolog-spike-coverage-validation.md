---
"kibi-core": patch
---

Kibi's Prolog coverage runner now runs every test file named by `--test`. A failure in a later file fails validation, and its directory appears in annotated coverage output. This improves pre-release verification; the installed `kibi-core` Prolog modules are unchanged, and the SWI-Prolog bundle has not shipped yet.

- kibi-core: add a regression for repeated test files and distinct coverage roots.
- Coverage runner: enumerate all requested test files and their directories.
