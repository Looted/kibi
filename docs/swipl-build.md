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

The platform packages are registered in `scripts/package-catalog.ts` and are publishable, but every slice that packs straight from a checkout (`ci-pack`, `packed-e2e`, `pack-all`) excludes them: their `prepack` guard refuses a package without a verified payload. The new packages start at 1.0.0 and version together through a changesets fixed group.

## Release wiring and proof (phase 4)

**Archive source.** The publish workflow calls `swipl-build.yml` as a reusable workflow (`workflow_call`) in its own run, so the archives it packs are built from that commit's pinned sources by that run and handed over as same-run artifacts. The alternative, downloading artifacts from an earlier or "latest successful" `swipl-build` run, needs a run-selection rule, depends on the 7-day artifact retention, and has no way to prove the run belongs to the release commit lineage. Same-run artifacts have none of those problems, and a build takes under ten minutes. `scripts/populate-swipl-platform-packages.mjs` then refuses anything that is not exactly what the pipeline produced: the `.sha256` sidecar must name the archive and match its bytes; the pipeline's own verifier (`swipl-spike.py extract-archive`) checks the manifest against the pins in `scripts/swipl-version.json`, the embedded commit and run id against `GITHUB_SHA` and `GITHUB_RUN_ID`, the binary SHA-256, the required libraries and licences, and extracts safely; only `bin/`, `lib/`, `licenses/` and `build-manifest.json` are copied. `scripts/verify-publish-metadata.ts --require-swipl-payload` then checks the whole `kibi-swipl*` family (versions, optional dependencies, `os`/`cpu`/`libc`, no install scripts, file list, pinned SWI-Prolog version, payload).

**Symlinks.** `npm pack` silently drops symbolic links, and the runtime loads shared libraries through them. The populate step therefore replaces links with regular files, keeping only names another native file loads (a SONAME such as `libz.so.1`) and dropping unreferenced development links such as `libcrypto.so`, so no library is shipped twice. The tarballs contain no links.

**`share/`.** The runtime does not need it. It holds man pages and a pkg-config file; the packed e2e proves `init`, `sync`, `check`, `doctor` and the MCP server run on a package that has none, so it is not shipped.

**Publish.** `publish.yml` packs the `publishable` slice (platform packages first, then `kibi-swipl`, then its dependents), runs the bundled-runtime smoke on the packed tarballs, and its `publish` job verifies `SHA256SUMS` and each tarball's `bin/swipl` against its manifest before `npm publish --provenance`. `release-pack.yml` is a separate dry run with no secrets, no `id-token`, and no publish step (`scripts/tests/release-pack-workflow-contract.test.ts` enforces this); it runs for pull requests to `develop`, pushes to `develop`, and manually.

**No-system-swipl proof.** `release-smoke.yml` installs the packed tarballs with npm into a fresh project on `ubuntu-24.04`, `macos-15` (arm64), `ubuntu-24.04-arm`, and `macos-15-intel`, after asserting `swipl` is nowhere on the machine, and runs `documentation/tests/e2e/packed/bundled-swipl-runtime.test.ts` through `scripts/run-packed-e2e.mjs`: `kibi doctor` reports `source: bundled` and loads every required library, `kibi init`, `sync` and `check` pass, and `kibi-mcp` answers `initialize`, `tools/list`, `kb_query` and `kb_check`. The same test installs with `--omit=optional`: the install succeeds and `doctor` and `sync` name the platform, the missing package, `npm install --save-dev <package>`, and `KIBI_SWIPL`. A plain install while the platform package names are still unpublished (registry 404 on the optional dependency) also succeeds.

Dry run [36798584645](https://github.com/Looted/kibi/actions/runs/36798584645) (head `3dd608c6`) passed all four smokes. Packed and unpacked tarball sizes, from the pack job:

| Package | Packed bytes | Unpacked bytes |
| --- | ---: | ---: |
| `kibi-swipl-linux-x64-gnu` | 6,698,077 | 21,110,547 |
| `kibi-swipl-linux-arm64-gnu` | 7,032,268 | 29,292,779 |
| `kibi-swipl-darwin-arm64` | 6,193,267 | 19,494,407 |
| `kibi-swipl-darwin-x64` | 6,045,820 | 19,284,760 |

## Kibi's own CI and the README walkthrough (phase 5)

**CI runs the bytes that ship.** Every Prolog job in `ci.yml` and `proof.yml` except one runs the linux-x64-gnu archive built by this pipeline's own script (`scripts/swipl-spike.sh build-archive`, in the same manylinux_2_28 container as the release build). `.github/workflows/swipl-ci-bundle.yml` produces it once per run, `.github/actions/use-bundled-swipl` verifies and installs it in each consumer, and `resolveSwipl()` then picks it through the real `kibi-swipl-linux-x64-gnu` workspace package (the action asserts `source: bundled`; `swipl` is also put on `PATH` for scripts that call it by name, such as `test:coverage:prolog`). The archive carries `library(prolog_coverage)`: the action loads it, and the Prolog coverage job runs on it.

| Job | SWI-Prolog |
| --- | --- |
| `ci-unit-coverage`, `prolog-unit-coverage`, `packed-e2e-cli-regression`, `packed-e2e-mcp-regression`, `packed-e2e-branch-workflow`, proof | bundled build |
| `ci-integration` | system install through `scripts/ci-install-swi-prolog.sh`, with `KIBI_SWIPL=system`, so the `PATH` route and the override stay tested |
| `release-smoke.yml` (dry run and publish gate) | bundled platform tarball, no SWI-Prolog anywhere |

**Cost.** Building takes several minutes per target, so a build on every CI run would sit on the critical path. The archive is cached under a key that hashes everything that determines its bytes: `scripts/swipl-version.json`, `scripts/swipl-spike.py` and `.sh`, the source patches, `swipl-build.yml` and the CI bundle workflow itself. A hit costs seconds and replaces the old system install (apt, PPA or a source build), which also took minutes on a miss. A miss builds once; the next run on any branch that can read that cache hits. GitHub evicts caches unused for seven days, so an idle repository pays one build again. The archive is handed to the other jobs as the one-day artifact `kibi-ci-swipl` (about 6.6 MB), not through the cache, so a job never races an eviction.

**Why a cache is safe here.** A release binds an archive to its own run: the verifier requires the embedded commit and run id to equal `GITHUB_SHA` and `GITHUB_RUN_ID`. A cached archive is by construction from another commit, so CI populates with `--cached-build`, which drops only that binding. The sidecar checksum, the manifest against the pins in `scripts/swipl-version.json`, the binary SHA-256, the required libraries, the licenses and safe extraction still run on every consumer. The release workflows never use the flag or the cache; `scripts/tests/ci-workflow-contract.test.ts` enforces that.

**README walkthrough.** The release-smoke workflow also runs `readme-quickstart` on `ubuntu-24.04`, `ubuntu-24.04-arm`, `macos-15` and `macos-15-intel` with no SWI-Prolog on the machine. `scripts/simulate-readme-quickstart.mjs` reads the commands out of the README's Quick start code block, runs them in a fresh Git repository with the packed tarballs substituted for the registry (the names are not published yet), then does what the agent's "Bootstrap Kibi for this repository" does (`plan-bootstrap`, the approved `apply-plan`), followed by `doctor` (which must report `bundled`), `check`, `sync` and `status` (fresh, clean). It proves the documented steps from these tarballs; it does not prove installation from the npm registry, which has to wait for the first publish.
