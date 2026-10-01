# kibi-swipl

Locates the bundled SWI-Prolog runtime that [Kibi](https://github.com/Looted/kibi)
uses. It is a dependency of `kibi-cli` and `kibi-runtime`; you normally never
install or import it yourself.

`kibi-swipl` lists one platform package per supported target as an optional
dependency, so the package manager installs only the one that matches the
machine:

| Platform | Package |
| --- | --- |
| Linux x64 (glibc) | `kibi-swipl-linux-x64-gnu` |
| Linux arm64 (glibc) | `kibi-swipl-linux-arm64-gnu` |
| macOS arm64 | `kibi-swipl-darwin-arm64` |
| macOS x64 | `kibi-swipl-darwin-x64` |

Alpine (musl) and native Windows have no bundle; install SWI-Prolog 9.0+ and put
`swipl` on `PATH`, or point `KIBI_SWIPL` at it.

Kibi resolves SWI-Prolog in this order: `KIBI_SWIPL=<absolute path>`, the bundled
platform package (after checking its manifest and binary checksum), then `swipl`
on `PATH` (9.0 or newer). `KIBI_SWIPL=system` skips the bundle.

The package versions independently of SWI-Prolog; the upstream version each
platform package carries is recorded in its `kibi.swiplVersion` field.
