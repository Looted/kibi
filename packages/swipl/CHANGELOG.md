# kibi-swipl

## 1.1.0

### Minor Changes

- b011b59: Native Windows x64 now gets a bundled SWI-Prolog 10.0.2 (`kibi-swipl-win32-x64`), so `npm install kibi-cli kibi-mcp` on a Windows x64 machine with no SWI-Prolog installed works out of the box and `resolveSwipl()` reports the bundled runtime. The payload is repackaged from the official upstream installer pinned by SHA-256 in `scripts/swipl-version.json` and audited on a clean Windows runner (PE machine check, DLL import closure, relocated smoke test); as on Linux and macOS, the verified bundle is used ahead of a `swipl` on `PATH`, so a Windows machine that already has SWI-Prolog installed switches to the bundled 10.0.2 unless `KIBI_SWIPL` names an executable or `KIBI_SWIPL=system` selects the one on `PATH`. Windows arm64, Alpine/musl and other unsupported platforms keep the previous behavior and need a manual SWI-Prolog 9.0+ install.

## 1.0.2

### Patch Changes

- 8e858fb: Build-manifest validation drops a redundant empty-string check on the bundle's home path; an empty home is still rejected, now by the normalized-path rule.

## 1.0.1

### Patch Changes

- 2a2b2db: Every Kibi package page on npm now has a README that says what the package is for and how to install it, and links to the documentation site. Package metadata now points npm's "Homepage" link at the documentation site, its "Repository" link at the package's own folder on GitHub, and adds an "Issues" link.

  Adds READMEs to `kibi-cli`, `kibi-mcp`, `kibi-core`, `kibi-runtime`, `kibi-agent-core`, `kibi-codex`, `kibi-plugin-builtin` and `kibi-plugin-sdk`. Sets `homepage` to https://looted.github.io/kibi/, adds `repository.directory` and `bugs` to every package, and refreshes the `kibi-plugin-treesitter` integrity manifest and source-analyzer approval for its changed `package.json`.

## 1.0.0

### Major Changes

- Initial release: the resolver that locates the bundled SWI-Prolog runtime. The package family versions together and is released from the pinned swipl-build pipeline archives.
