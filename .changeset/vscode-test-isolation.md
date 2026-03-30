---
"kibi-vscode": patch
---

Fix cross-test mock leakage by adding dependency injection seam to `KibiHoverProvider`. The constructor now accepts an optional 4th parameter `deps?: Partial<HoverProviderDeps>` for injecting CLI executor and markdown builder functions during testing.
