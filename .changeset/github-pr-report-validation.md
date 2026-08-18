---
"kibi-cli": patch
---

Pull requests now generate and validate the Kibi requirement-health report without publishing it. Reviewers can download the candidate HTML report and badge as a workflow artifact, while GitHub Pages still shows only the repository default-branch snapshot.

- Run the canonical `kibi-report.yml` (and badge-only) workflow on `pull_request` as well as default-branch push and `workflow_dispatch`.
- Upload `kibi-pr-report` from pull requests; skip Pages configure/upload/deploy on `pull_request`.
- Keep `pages: write` and `id-token: write` on the deploy job only. Do not use `pull_request_target`.
