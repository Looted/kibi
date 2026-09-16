---
"kibi-cli": patch
---

`kibi init --github` now recognizes GitHub remotes that include HTTPS
credentials, such as `https://x-access-token:…@github.com/owner/repo`. CI
and Cloud Agent checkouts rewrite remotes that way, so the README badge
URL is written instead of being skipped as an unknown repository.

- Accept optional userinfo on HTTPS GitHub remotes in `parseGitHubRemote`.
