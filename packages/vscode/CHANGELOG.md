# kibi-vscode

## 0.2.3

### Patch Changes

- 7309d18: Fix cross-test mock leakage by adding dependency injection seam to `KibiHoverProvider`. The constructor now accepts an optional 4th parameter `deps?: Partial<HoverProviderDeps>` for injecting CLI executor and markdown builder functions during testing.

## 0.2.2

### Patch Changes

- Initial changelog entry for changesets integration
