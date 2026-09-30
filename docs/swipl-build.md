# SWI-Prolog platform build pipeline

The [platform workflow](../.github/workflows/swipl-build.yml) passed the phase 2 exit checkpoint in [Actions run 36757628273](https://github.com/Looted/kibi/actions/runs/36757628273), on committed source `c9d5327bbc78250f08ec1936a0ccd172b4e211b8`: all four builds and all four smoke jobs on separate clean runners succeeded. The [phase 1 spike](swipl-bundle-spike.md) already passed its complete Prolog and CLI suites on Linux x64 and macOS arm64.

| Target | Hosted runner | Build and consumer environment |
| --- | --- | --- |
| `linux-x64-gnu` | `ubuntu-24.04` | `manylinux_2_28_x86_64`, glibc 2.28 |
| `linux-arm64-gnu` | `ubuntu-24.04-arm` | `manylinux_2_28_aarch64`, glibc 2.28 |
| `darwin-arm64` | `macos-15` | Native arm64, deployment target 12 |
| `darwin-x64` | `macos-15-intel` | Native x64, deployment target 12 |

All four labels are available in the [GitHub hosted runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners). macOS smoke runs test execution on macOS 15; inspection of every Mach-O file enforces a minimum target no later than macOS 12. This does not establish execution on a macOS 12 host.

Builds use the shared [script](../scripts/swipl-spike.py) and the exact upstream, dependency, and source-patch pins in [swipl-version.json](../scripts/swipl-version.json). Native compilation refuses execution outside GitHub Actions, the wrong host OS or architecture, or a runner with `swipl` already on `PATH`. The four OpenSSL configurations are selected explicitly. Darwin CMake architecture and deployment settings are explicit. The existing spike's `build-and-test` command still requires the whole repository build, all three Prolog files with the 50% coverage floor, and the full isolated CLI batch.

Each producer builds with GMP disabled and LibBF enabled, copies the prefix, strips native files, rewrites dependency paths, and signs every Mach-O file ad hoc. Original source, dependency, install, and build trees are removed. Both the producer and the fresh consumer audit every native file: ELF architecture, glibc symbol requirements no newer than 2.28, internal `$ORIGIN` runpaths, and permitted direct and transitive dependencies; or Mach-O architecture, existing internal loader-relative references, Apple system dependencies, explicit minimum-target metadata, and `codesign --verify --strict`.

Each successful producer uploads an artifact named `swipl-<target>`, containing:

- `swipl-10.0.2-<target>.tar.gz`
- `swipl-10.0.2-<target>.tar.gz.sha256`
- `report.json`

The checksum sidecar contains the lowercase archive SHA-256, two spaces, the exact archive basename, and a newline. The tarball holds the complete relocated prefix at its root: `bin/`, `lib/` (including `lib/swipl/` and `lib/vendor/`), `licenses/`, SWI metadata in `share/`, and `build-manifest.json`. The four license texts are SWI-Prolog, OpenSSL, PCRE2, and zlib. No npm package or install script is produced in this phase.

The build manifest records the target, SWI version, upstream archive hash, complete dependency and source-patch pins, `bin/swipl` hash, relative SWI home, required libraries, source commit (`GITHUB_SHA`), and workflow run (`GITHUB_RUN_ID`). The archive checksum protects the manifest and other prefix files together; there is no circular checksum inside the manifest. Builder and consumer reports retain the validated provenance and check outcomes. Separate `swipl-build-report-<target>` artifacts preserve builder diagnostics even when a build fails; a failed build does not upload an archive artifact.

The consumer jobs run on new runner instances and fresh Linux containers. They refuse a preinstalled `swipl` before downloading their matching producer artifact. Verification checks the exact filename and archive checksum, target and trusted source/dependency/patch pins, same-run commit and run identity, binary checksum, exact required-library inventory, and four nonempty licenses. Before extraction, it rejects traversal, duplicate paths, escaping or dangling symlinks, links used as directory parents, special files, privileged modes, and incomplete prefixes. Extraction uses a new directory, followed by the native audits and smoke checks.

Smoke invokes the extracted absolute binary with an explicit `SWI_HOME_DIR`, removes inherited `LD_*` and `DYLD_*` overrides, checks the exact SWI version and unbounded GMP-free integers, preserves `.125` and `.875` file timestamps in the same second, and loads all 18 required libraries. Consumer reports are retained as `swipl-smoke-<target>`. A checksum, audit, or smoke failure records a failed result and prevents the checkpoint from passing.

Pushes to `develop` or `codex/swipl-bundle-spike` trigger the workflow when its definition, pins, source patches, shared build scripts, or focused validation tests change. `workflow_dispatch` is also available. Configuration and behavioral controls can run locally without native compilation. Packaging and resolver integration are described below; release wiring (downloading these artifacts into the platform packages) and rollout belong to later phases.

The completed phase 2 run produced these independently inspected archives. Unpacked sizes are the native producer's `du -sk` measurements; packed sizes are exact downloaded tarball byte counts.

| Target archive | Packed bytes | Unpacked KiB | Independently audited native files |
| --- | ---: | ---: | --- |
| [linux-x64-gnu](https://github.com/Looted/kibi/actions/runs/36757628273/artifacts/11117682094) | 6,607,583 | 22,160 | 42 x64 ELF files, maximum required glibc 2.28 |
| [linux-arm64-gnu](https://github.com/Looted/kibi/actions/runs/36757628273/artifacts/11117751845) | 6,908,168 | 30,156 | 42 arm64 ELF files, maximum required glibc 2.28 |
| [darwin-arm64](https://github.com/Looted/kibi/actions/runs/36757628273/artifacts/11118095455) | 6,110,682 | 20,272 | 41 arm64 Mach-O files, minimum targets 12.0 |
| [darwin-x64](https://github.com/Looted/kibi/actions/runs/36757628273/artifacts/11117238350) | 6,003,674 | 20,064 | 41 x64 Mach-O files, minimum targets 12.0 |

All 12 downloaded artifact ZIP digests and sizes match GitHub's recorded metadata. Each producer and consumer report passes all 25 checks; their unpacked sizes agree. Tar sidecars, executable hashes, source/dependency/patch pins, and source/run identities all match. Independent byte inspection verified all 18 canonical libraries, four licenses, native architectures, ELF dependency closure and relative runpaths, glibc versions, and Mach-O dependency closure, minimum targets, and ad hoc CodeDirectory page hashes.

| Target | Verified tarball SHA-256 |
| --- | --- |
| `linux-x64-gnu` | `dfe21b1988d56e66e9d8953ff355d45b66f07606866db57c98b7dff9bfef1aed` |
| `linux-arm64-gnu` | `294437d69c4b10813e35a079ffaf7a7d978db8e679c0a12b5b878a70953208e8` |
| `darwin-arm64` | `92ab21989ee3be718875184f365edb8434867861eb7b93359cf2e01168849903` |
| `darwin-x64` | `c109e0b0947f853552712bd33f8b0e22e027294be75b7814ed80d27b17edcbba` |

Completed consumer logs show clean-runner checks before artifact download, distinct producer and consumer runner identities, and every native file matched to its actual `readelf`/`ldd` or `otool`/strict `codesign` commands. Each consumer invokes its extracted absolute SWI binary 21 times: exact version, LibBF without GMP, fractional mtime, and the 18 library goals. These results clear the phase 2 native checkpoint. They do not identify the earlier Linux timeout cause.

Local validation passed all 70 pipeline controls with 317 assertions. The complete scripts batch passed 338 tests across 36 files with zero failures and 3,519 assertions in 79.70 seconds, using the original owned runner, 15-second limit, isolation, and serial execution. The harness exited successfully and all 427 observed source hashes stayed unchanged. TypeScript, formatting, YAML parsing, all 30 matrix-expanded shell blocks, and OCR review passed. These controls establish the encoded validation behavior; the native checkpoint evidence belongs to the Actions run above.

The accompanying [phase 1 regression run](https://github.com/Looted/kibi/actions/runs/36757628137) passed both jobs on the same source commit. Each passed the complete repository build, all 30 lock/mirror controls, all 256 Prolog cases across the three files with the unchanged 50% floor, and **3,530 CLI tests, 0 failed, 0 skipped across 405 files**, with 12,208 assertions. Linux's CLI suite took 521.89 seconds and Darwin's 693.08 seconds. Both reports pass all 24 checks and retain the exact full CLI command. The detailed regression measurements are recorded in the [spike report](swipl-bundle-spike.md).

Separate local proof on committed head `abcb8bb8` confirms all 127 requirements proven with zero missing, unresolved, or proof gaps. Strict baseline equality passes with zero fingerprint changes and violations. Typed status is fresh with `dirty: false` and `proofSnapshotDirty: false`. The native build, smoke, and full-suite results above belong to source head `c9d5327b`; this proof validation belongs to `abcb8bb8`.

## npm packages and resolver (phase 3)

`packages/swipl` (`kibi-swipl`) holds the platform table and manifest validation; `packages/swipl-<target>` (`kibi-swipl-<target>`) are payload shells whose `bin/`, `lib/`, `licenses/`, and `build-manifest.json` are filled from a pipeline archive at release time and are git-ignored. The package `build-manifest.json` is the archive's own `build-manifest.json` (`kibi.swipl-build.v1`: `target`, `swiplVersion`, `binary.path` = `bin/swipl`, `binary.sha256`, `home` = `lib/swipl`); `share/` is not shipped. `kibi-cli`'s `resolveSwipl()` looks up `KIBI_SWIPL`, then the installed platform package (manifest, `kibi.swiplVersion` agreement, and binary SHA-256 verified; a damaged bundle is an error, an unpopulated workspace shell is ignored), then `swipl` on `PATH` (9.0+). `KIBI_SWIPL=system` skips the bundle. `scripts/verify-swipl-payload.mjs` (the platform packages' `prepack`) refuses to pack a package without a verified payload.

The platform packages are registered in `scripts/package-catalog.ts` but excluded from every pack and publish slice until release wiring populates them; `kibi-swipl` itself is publishable and packed. The new packages start at 1.0.0 and version together through a changesets fixed group.
