---
"kibi-cli": patch
---

Kibi now explains when a symbol needs an authored anchor before its coordinates can be refreshed. Python methods such as `Service.decide` no longer silently repeat an ineffective automatic repair, while symbols that extraction can locate still receive automatic refresh guidance.

- Count text-heuristic coordinate misses as failures, including non-JS/TS sources.
- Inspect current extraction and explicit coarse anchors before classifying requirement and symbol coordinate repairs as automatic.
- Cover repeated refreshes, authored coarse-anchor recovery, mixed repair batches, and supported text/AST extraction.
- Restore the CLI test helper exit code explicitly so expected error-path assertions do not leave a failing process status.
