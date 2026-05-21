---
"kibi-opencode": patch
---

OpenCode users can now see which kibi-opencode version started because the startup toast includes the version when available. This helps confirm local dogfood or package wiring after upgrades, making it immediately obvious if an older version is still running.

- Pass the kibi-opencode package version into startup notification config.
- Append the version to the startup toast message when available.
- Cover version-present and version-absent paths in startup notifier tests.
