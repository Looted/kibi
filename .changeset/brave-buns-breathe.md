---
"kibi-opencode": patch
---

OpenCode bootstrap command support is now more reliable in fresh CI and Bun installations. The plugin can detect native `/init-kibi` command support when OpenCode installs the SDK as a transitive dependency of the plugin, preventing supported hosts from silently falling back to the namespaced MCP prompt.

- Resolve `@opencode-ai/sdk` metadata from Bun's plugin-sibling dependency layout during native command capability detection.
- Add regression coverage for the transitive SDK resolution path used by fresh installs.
