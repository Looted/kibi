# kibi-swipl-darwin-x64

Relocatable SWI-Prolog 10.0.2 runtime for [Kibi](https://github.com/Looted/kibi) on macOS on Intel (macOS 12 or newer).

Do not depend on this package directly. `kibi-swipl` lists it as an optional
dependency, and `kibi-cli` and `kibi-runtime` resolve it through `kibi-swipl`.
The package manager installs it only on matching `os`, `cpu` values.

If `kibi doctor` reports that the bundled runtime is missing on this platform,
install it explicitly with `npm install --save-dev kibi-swipl-darwin-x64`. Common
causes are `--no-optional` / `--omit=optional` installs and pnpm
`supportedArchitectures` settings that exclude this platform.

## Contents

| Path | Purpose |
| --- | --- |
| `build-manifest.json` | Pipeline build manifest: SWI-Prolog version, `bin/swipl` SHA-256, relative SWI home, provenance |
| `bin/swipl` | SWI-Prolog executable |
| `lib/swipl/` | `SWI_HOME_DIR` for the bundled build (`lib/vendor/` holds relocated native dependencies) |
| `licenses/` | SWI-Prolog, OpenSSL, PCRE2, and zlib licence texts |

The binaries are not committed to git. The release workflow copies them from the
`swipl-<target>` pipeline archive and verifies the archive and binary checksums
before `npm pack`. `build-manifest.template.json` documents the manifest shape;
the real `build-manifest.json` is the pipeline's own file. The resolver refuses a
bundle whose manifest is malformed or whose binary checksum does not match.

The package has no install scripts.
