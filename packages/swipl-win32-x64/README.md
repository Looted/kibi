# kibi-swipl-win32-x64

Relocatable SWI-Prolog 10.0.2 runtime for [Kibi](https://github.com/Looted/kibi) on Windows x64.

Do not depend on this package directly. `kibi-swipl` lists it as an optional
dependency, and `kibi-cli` and `kibi-runtime` resolve it through `kibi-swipl`.
The package manager installs it only on matching `os`, `cpu` values.

If `kibi doctor` reports that the bundled runtime is missing on this platform,
install it explicitly with `npm install --save-dev kibi-swipl-win32-x64`. Common
causes are `--no-optional` / `--omit=optional` installs and pnpm
`supportedArchitectures` settings that exclude this platform.

## Contents

| Path | Purpose |
| --- | --- |
| `build-manifest.json` | Pipeline build manifest: SWI-Prolog version, `lib/swipl/bin/swipl.exe` SHA-256, relative SWI home, upstream-installer provenance |
| `lib/swipl/bin/swipl.exe` | SWI-Prolog executable (with the foreign DLLs beside it) |
| `lib/swipl/` | `SWI_HOME_DIR` for the bundled build: the complete upstream install tree (`boot/`, `library/`, ...) |
| `licenses/` | SWI-Prolog, OpenSSL, PCRE2, zlib, and GMP licence texts |

Unlike the Linux and macOS bundles, the win32 payload is repackaged from the
pinned upstream NSIS installer rather than compiled from source, so its manifest
records a `prebuilt` provenance block (installer URL and SHA-256) instead of
source-archive and dependency pins. The upstream tree stays nested under
`lib/swipl/` so no file moves relative to another and the SWI home is a
relative path other than `.`.

The payload is not committed to git. The release workflow copies it from the
`swipl-win32-x64` pipeline archive and verifies the archive and binary
checksums before `npm pack`. `build-manifest.template.json` documents the
manifest shape; the real `build-manifest.json` is the pipeline's own file. The
resolver refuses a bundle whose manifest is malformed or whose binary checksum
does not match.

The package has no install scripts.
