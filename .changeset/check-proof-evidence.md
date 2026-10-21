---
"kibi-cli": patch
---

`kibi check` no longer keeps `coverage_depth_review` on a requirement whose scenario test has a current passing end-to-end proof receipt. The CLI check never read the workspace snapshot, so its quality diagnostics ran without the proof evidence `kibi coverage` uses and the receipt could not clear the review. `kb_check` over MCP was not affected.
