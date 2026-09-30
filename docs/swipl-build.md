# SWI-Prolog platform build pipeline

The [platform workflow](../.github/workflows/swipl-build.yml) implements phase 2. Its exit checkpoint is pending: a single Actions run must build all four target archives and pass their smoke checks on separate clean runners. The [phase 1 spike](swipl-bundle-spike.md) already passed its complete Prolog and CLI suites on Linux x64 and macOS arm64.

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

Pushes to `develop` or `codex/swipl-bundle-spike` trigger the workflow when its definition, pins, source patches, shared build scripts, or focused validation tests change. `workflow_dispatch` is also available. Configuration and behavioral controls can run locally without native compilation; actual build and clean-runner acceptance will be recorded after Actions completes. Packages, resolver integration, publication, and rollout belong to later phases.
