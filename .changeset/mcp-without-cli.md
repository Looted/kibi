---
"kibi-mcp": patch
"kibi-runtime": patch
---

kibi-mcp starts again when kibi-cli is not installed next to it. The server read its telemetry signals from `kibi-cli/telemetry-details`, but kibi-cli is only a development dependency of kibi-mcp, so a project or global install of kibi-mcp alone failed at startup with `ERR_MODULE_NOT_FOUND: Cannot find package 'kibi-cli'` (and with `ERR_PACKAGE_PATH_NOT_EXPORTED` beside an older kibi-cli). kibi-runtime now exports `operationTelemetrySignals`, and kibi-mcp reads it from there, from the same bundle that raises the operation's errors, so MCP telemetry also recognizes a rejected write by its class.

Packing a package now fails when its published files import another package by name that is not in its `dependencies`, `peerDependencies` or `optionalDependencies`, and the release contract installs kibi-mcp without kibi-cli and checks that it answers `initialize`.
