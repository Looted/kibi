---
"kibi-cli": patch
---

`kibi init --github` keeps the repository name's case in the README badge and report URLs. GitHub Pages project paths are case-sensitive, so a repository such as `Owner/MyRepo` now gets `https://owner.github.io/MyRepo/kibi-report/badge.svg` instead of a lower-cased URL that returned 404. The owner host is still lower-cased, and owner sites (`<owner>.github.io`) are detected case-insensitively. The GitHub integration guide now says `REPOSITORY` must match the repository name exactly.
