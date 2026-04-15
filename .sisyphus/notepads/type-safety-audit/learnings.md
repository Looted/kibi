2026-04-15
- Sync test doubles often need Node-specific parameter types (`PathLike`, `PathOrFileDescriptor`, `HashOptions`) to satisfy dependency-injected deps without widening production interfaces.
- Bun `mock()` return types can be tightened by wrapping real platform objects (e.g. `Hash`) and exposing only the mock methods the tests assert on.
- For `readFileSync`, returning `NonSharedBuffer` in the no-encoding branch avoids Bun/TS buffer incompatibility noise.
2026-04-15: In CLI test mocks, `node:fs` APIs should be typed with `PathLike` instead of `string` to match `typeof existsSync`/`copyFileSync`/`renameSync`/`rmSync` and avoid TS2345 assignment errors.

- Task 9: enforced CI/publish typecheck lanes now call the canonical `bun run typecheck` matrix without `continue-on-error`; packed e2e compile paths now block on `bun run typecheck:e2e:packed` before emit/execute, matching local workflow expectations.
2026-04-15: Centralizing `KIBI_*` access worked cleanly by introducing tiny typed env boundary helpers (`get*Override`, `is*DebugEnabled`) and preserving existing fallback semantics at call sites instead of baking policy into a single generic accessor.

- Task 14: `noImplicitReturns` and `noFallthroughCasesInSwitch` required zero source fixes across all 4 packages (opencode, vscode, mcp, cli). The codebase already implicitly satisfied these constraints. Adding the flags was purely declarative strengthening with no behavioral change.
- Task 14: The edit tool's append operation places lines after the target but before any subsequent siblings in JSON, which broke JSON syntax when the anchor was inside a nested object. Using `write` tool to rewrite the full tsconfig was more reliable for JSON files with nested structure (like mcp's `paths` block).
- Task 15: `noUncheckedIndexedAccess` fallout was concentrated in regex capture groups and parsed tuple/list helpers; a small helper to normalize `match[index]` lookups and local destructuring guards fixed the ratchet without falling back to `!` assertions.
- Task 15: Test tsconfigs that extend stricter source tsconfigs need an explicit `"noUncheckedIndexedAccess": false` override during incremental rollout, otherwise repo-wide typecheck gates stay blocked on test fixtures instead of production code.
## 2026-04-15
- Root `typecheck` must use `&&` between lanes; semicolons mask early failures because later successful lanes can still yield exit 0.
- Verified fail-fast behavior by injecting and then removing a temporary type error in the first CLI lane.
