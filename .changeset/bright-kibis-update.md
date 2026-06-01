---
"kibi-opencode": minor
---

OpenCode users now get the latest compatible Kibi plugin automatically on startup. This keeps prompt guidance and background maintenance fixes current without requiring users to manually clear OpenCode's plugin cache. Projects that need a fixed plugin can pin an exact semver entry such as `kibi-opencode@0.15.0`, and the updater will respect it.

- Add a startup auto-updater for the cached `kibi-opencode` OpenCode plugin package.
- Add `autoUpdate` plugin config, defaulting to `true`, with `false` disabling the updater.
- Respect exact semver pins in the OpenCode `plugin` array while leaving `kibi-cli`, `kibi-mcp`, and `kibi-core` untouched.
