# SWI-Prolog bundle spike

This is the first checkpoint for shipping SWI-Prolog inside Kibi's platform npm packages. It tests whether a trimmed, GMP-free SWI-Prolog prefix can move to a new directory and run Kibi's Prolog and CLI suites. The spike does not change Kibi's installation or runtime lookup behavior.

The [spike workflow](../.github/workflows/swipl-spike.yml) builds only on GitHub Actions: Linux x64 inside `manylinux_2_28` and macOS arm64 on `macos-14`, targeting macOS 12. Each job fails if `swipl` is already on `PATH`. Native sources come from SHA-256-pinned archives listed in [swipl-version.json](../scripts/swipl-version.json). SWI-Prolog remains pinned to 10.0.2; the vendored dependency versions are OpenSSL 3.5.9 LTS, PCRE2 10.47, and zlib 1.3.2. Their source archives were checked before pinning. OpenSSL 3.5 and PCRE2 10.47 avoid known maintenance and security issues in older candidate versions.

The build uses `USE_GMP=OFF` and `USE_LIBBF=ON`, disables X, Java, ODBC, BerkeleyDB, GUI, docs, and unused package sets, and keeps the C extensions and Prolog libraries Kibi needs. The test checks unbounded integers at runtime and loads every required library, including `prolog_coverage`. Installed executables, libraries, and license texts are copied to a different directory. The original build, dependency, and install trees are removed before any runtime test. Every ELF or Mach-O file is audited; Linux dependencies may resolve only to the staged OpenSSL, PCRE2, zlib, SWI libraries or the specified glibc runtime libraries. macOS dependencies are rewritten relative to their loader, signed ad hoc, and checked for a deployment target no later than macOS 12.

Both jobs run all three Prolog test files (`kb.plt`, `logic_ir.plt`, and `schema.plt`) under the existing 50% coverage floor, then run the canonical full CLI batch with test isolation. The workflow uploads the relocated prefix tarball and a report containing installed and packed sizes plus the outcome of each check. It can run from the `codex/swipl-bundle-spike` branch on relevant changes or by `workflow_dispatch`. Locally, `bash scripts/swipl-spike.sh verify-config` validates the pins and target without building native code.

Preparing the three-file run exposed a defect in the existing coverage runner: repeated `--test` arguments loaded only the first test file. The runner now enumerates every requested file and includes all of their directories in the coverage report. A regression test proves a failing later file makes the run fail.

| Platform | Relocated Prolog suite | Relocated CLI suite | Unpacked size | Packed size |
| --- | --- | --- | ---: | ---: |
| Linux x64, glibc 2.28 | Pending Actions run | Pending Actions run | Pending | Pending |
| macOS arm64, macOS 12 target | Pending Actions run | Pending Actions run | Pending | Pending |

Phase 2 can start only after both rows pass. Its build workflow and package pipeline will use the measured, reviewed build recipe. macOS Intel and Linux arm64 belong to that subsequent platform matrix; this phase measures the two prescribed initial targets.
