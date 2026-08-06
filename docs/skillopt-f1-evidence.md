# SkillOpt F1 evidence

The production predicate workflow keeps classification answers private, rejects root drift before training, and binds automatic adoption to the candidate, authorized roots, lineage checkpoint, and sealed evidence hash.

`runRealOptimization` uses bounded Codex-cell runtime inputs. `defaultCodexCellDependencies` derives sealed final-state claims and ordered broker calls from captured evidence rather than accepting caller scores or receipts.

Coverage: `scripts/skillopt-eval/tests/real-workflow.test.ts`, `adoption.test.ts`, and `bridge-cli.test.ts`.

F2 process evidence: the Python bridge owns the Bun process group, while Codex and MCP runtime launches inherit it. Timeout, `SIGINT`, and `SIGTERM` harnesses reap Bun descendants even when direct Bun exits after `TERM`; workspace fault injection proves a failed removal is aggregated, retried, and only marked complete after private auth and all workspace roots are gone.
