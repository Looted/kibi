# Installed staged-impact benchmark

This benchmark measures the installed Kibi CLI's local staged-review workflow
against two temporary mixed-language repositories. It uses an explicit npm
prefix, a source-candidate or final-pack qualification report, and the archive
pinned by the Tree-sitter plugin catalog. It verifies first-party release
archives and inventories the installed dependency closure before the CLI runs.
The benchmark does not build packages, install from the network, invoke
analyzed source, or modify the checkout's knowledge base.

Run it only with the final candidate prefix and its matching qualification
report. The output directory must be new; the script writes
`benchmark-result.json` there and does not replace existing output.

Node.js 22 or newer is required. RSS fields are sampled on Linux; on other
platforms the report retains the requested sampling interval and records no
process samples.

```bash
node scripts/benchmark-installed-staged-impact.mjs \
  --prefix /absolute/path/to/npm-prefix \
  --qualification /absolute/path/to/final-pack-qualification.json \
  --runtime-archive /absolute/path/to/catalog-pinned-web-tree-sitter-0.27.0.tgz \
  --output-dir /tmp/kibi-staged-impact-run \
  --small-count 12 \
  --large-count 120 \
  --repeats 3
```

The prefix must contain `node_modules/`. Qualification reports may use either
the source-candidate `tarballs`/`packageCount` shape or the final-pack
`packages`/`publishableCount` shape. The report must have no mismatches and
must include the installed `kibi-cli`, `kibi-plugin-treesitter`, and every
first-party `kibi-*` package dependency they declare. Each listed archive is
checked against its SHA-256, byte length, package identity, and installed file
bytes.

The script walks declared dependencies, optional dependencies, and peers from
the qualified first-party packages, resolves each from the explicit prefix's
installed directory layout, and hashes every file and symlink in that closure.
It copies the packages into each temporary project's `node_modules` at the
same relative paths, then checks each copy against its installed inventory.
Only the listed first-party archives are source-byte-qualified. Other
third-party packages are reported as installed-prefix inventories, not as
source-qualified artifacts.

For `web-tree-sitter`, the installed catalog must match the plugin manifest,
the supplied archive's SHA-512, packed and unpacked sizes, and the npm lock
entry's resolved URL and integrity. The installed runtime file tree is also
compared byte-for-byte with that catalog-pinned local archive. Parser WASM and
query files are checked against their hashes in the qualified plugin catalog.
The report labels remaining third-party installed inventories separately; it
makes no source-byte qualification claim for them.

The small count must be 3–24 and the large count 3–240, with the large count
greater than the small count. This keeps at least one changed declaration in
each of the three language files.

Every generated declaration contributes to the parsed file size. The staged
diff changes only the first generated declaration in each language, and each
of those three declarations has explicit requirement ownership. This keeps
the ownership gate meaningful without making the benchmark setup scale with
hundreds of synthetic ownership records.

Each scenario has three files sourced from the checked-in Python
`nested-duplicate.py`, Go `declarations.go`, and Rust `declarations.rs`
Tree-sitter fixtures. The requested declaration count is divided across those
languages: the defaults use four added declarations per language for the
small scenario and forty per language for the large one. The added functions
are inert parser input and are never called. The Rust additions return string
literals rather than invoking macros, so parser partial coverage remains a
blocking condition. Staging changes return markers, refreshes coordinates
through the public CLI, and authors a local impact record from the public
`prepare-impact-review` result. The synthetic requirement retains advisor
roles, spans, and payload hashes, then grounds each core language-count claim
with a strict typed property fact. The record supplies a synthetic self-claimed
local reviewer ID and timestamp; these are authorship fields, not
authentication or a signature. It uses only prepared requirement IDs, verifies
the linked requirement remains unchanged, and supplies a separate no-impact
rationale for generated coordinate output. Any unsupported or partial review
obligation, missing ownership, changed requirement context, unfamiliar path,
or contract mismatch stops the run without synthesizing approval.

The report includes the source checkout commit, benchmark script hash, and
each fixture's path, byte length, and SHA-256, along with the qualification
artifact hash and each qualified package's archive hash and byte counts.

Repository setup, requirement/scenario/test/symbol/fact authoring, coordinate
refresh, preparation, and checks all use the installed public CLI. The
requirement marks its three core fixture claims `modeled` only when each has a
matching typed property fact; the test record stays `pending`, and the benchmark
creates no proof receipt.
The synthetic repository uses `kibi init --no-hooks`, so hook installation or
hook acceptance is not measured. The temporary repositories also isolate
system/global Git configuration and use an empty local hooks directory, so
host Git settings and hooks do not run as part of this measurement. Each
baseline commit includes a strict `.kibi/impact-policy.json` with no unsupported,
partial, or not-applicable waivers. Before preparing or authoring the review,
the benchmark runs a staged check and requires the blocking
missing-impact-review failure for the actual changed files. It records whether
the legacy file-level advisory is also present, but symbol-level analysis does
not require that advisory. This proves the later accepted check cannot pass
because impact review is disabled.

For each public CLI process, the report records elapsed time from the OS spawn
event through child close. It measures the installed public CLI's `--version`
startup separately. The local `kibi check --staged --format json` result is
accepted only when it exits successfully, has an empty blocking `violations`
array, and no `staged_file_impact_review_needed` diagnostic. The report also
times public `kibi status`, `kibi engine status`, and
`kibi prepare-impact-review` invocations separately.

The benchmark enables timing observations only inside each scenario and gives
the owned engine a private trace directory outside the checkout and temporary
repository. Tree-sitter workers report parser setup (initialization and
grammar/query loading), parse, source analysis (declaration matching and
extraction), and the total analysis path through result creation before cleanup
as in-worker wall durations through host-side stderr events. Prolog reports
real query-boundary round-trip wall durations through bounded numeric trace
events; this includes transport and
serialization, and is not pure SWI-Prolog CPU time. Prolog-process, engine
query, and freshness cache hits are counted separately and are never described
as round trips. The event records contain no source paths, source content,
Prolog goals, bindings, or query results. Missing observations remain
unavailable, and malformed or truncated trace data stops the measurement.
Parser phase sums can overlap when worker threads run concurrently, so they are
not an additive decomposition of the CLI's elapsed time. Instrumentation is
opt-in and its overhead is included in the observed command timings.

Before measuring the staged checks and cold-engine status, the benchmark calls the public
`kibi engine stop`, applies `kibi engine janitor --all --apply --format json`
only when every finding is a cleanable dead artifact, and then requires the
read-only `kibi engine janitor --all --format json` to report no findings in
the isolated scenario runtime. It makes no `kibi engine status` call before
that boundary.
Each accepted staged check uses its own temporary Prolog process and must leave
no persistent engine artifact. Every accepted check must include complete
Python, Go and Rust parser timing observations and a real Prolog round trip.
The first following `kibi status` call is labeled cold-engine. The benchmark
then observes the live scenario engine through the public janitor, confirms its
PID with `kibi engine status`, and requires the next status call to reuse that
same PID before labeling it warm-engine. Each CLI process and parser worker is
still fresh, and OS page-cache state is uncontrolled, so parser observations
are not labeled cold or warm. A bounded parser stream emits a truncation marker
when its event or byte limit is reached, and the benchmark rejects that run
rather than treating the remaining observations as complete. If final cleanup
cannot stop the engine, the script preserves both the temporary project and
trace directory instead of removing paths that a daemon could still use.

RSS is sampled every 20 ms from the direct Kibi CLI host process and, on Linux,
a previously verified Kibi engine host process when its PID is known. Staged
checks and the cold status record CLI host RSS only; the engine PID is verified
after that status call. The warm status can also sample the confirmed engine.
Host-process RSS includes worker-thread memory, including Tree-sitter workers;
it excludes descendant operating-system processes such as SWI-Prolog and
unrelated processes. The sampled peak is a lower bound that may miss short
spikes. The report includes sample count,
observed interval, process scope, and archive, installed-inventory, and
unpacked package bytes. If a separate installed-parser report is supplied, its
exact SHA-256 must be pinned with `--parser-report-sha256`; it remains a
separate reference and is attributed to this candidate only when it carries
the same qualification-artifact hash.
Only allowlisted numeric timings/counts, normalized timestamps, and hashes from
that pinned parser report are retained; arbitrary note text is omitted.

This local benchmark does not run `kibi check-diff`: that protected gate needs
verified event authority that a synthetic repository does not provide. It
does not exercise hooks, private consumer projects, or production source. The
measurements are observational baselines; the script has no timing or RSS
threshold and does not change configured caps.
