---
"kibi-cli": patch
---

The merge train action reads check runs with a new `checks-token` input, which defaults to the workflow's own token. Fine-grained personal access tokens have no Checks permission, so a train whose `github-token` was one failed every step with HTTP 403; give the job `checks: read` and it now works.
