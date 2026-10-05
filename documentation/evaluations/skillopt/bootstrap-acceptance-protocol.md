# Bootstrap acceptance protocol

Use a fictional repository and independently authored product sources. Never copy a private project's code, domain documents, tickets, identifiers, or credentials into the public corpus.

## Runs

Run tracker-export only, document only, and combined-source intake in separate workspaces at the same code revision. Compare frozen baseline and candidate bodies on the same runtime, task, model, reasoning settings, and source scope. Use at least three paired repetitions and report each run, not just the best one. After tuning, test fresh independently authored examples and separately check the model used in production; repeated development cases do not establish generalization.

## Environment gate

Before dispatch, record package/runtime build hashes, Git attachment and exact source revision. Verify the expected activation state through the real staged MCP path. For normal onboarding require a thin, bootstrap-eligible root; for repair cases verify the intentional blocker. Exercise absent root, existing empty root, and a partially initialized root via init in offline product regressions. Classify unintended setup failures as invalid test infrastructure, retain their costs/artifacts, and repeat both arms after repair.

## Modeling backend

Record plugin configuration and the provider actually used for semantic classification. A builtin-only run does not test JEV. Keep builtin and JEV cohorts separate and compare skill bodies within each cohort; changing both the skill and classifier invalidates attribution. For a JEV cohort, record the requested and resolved model/version where available, successful provider use, service errors and fallback. A configured plugin or an available API key is not proof that a request reached JEV. Keep credentials in the trusted broker environment, outside target-visible files and reports.

## Source corpus

Include normative obligations with conditions, exceptions, negative wording and must/should distinctions; stale or superseded tickets; unresolved proposals; conflicting authoritative sources; duplicate claims with distinct citations; and tooling examples that look like requirements. Include enough obligations to cross the planner's default candidate limit, with important intent from each source on both sides of that limit. The oracle is an independently authored obligation ledger, not the repository's previous KB or a list of expected requirement IDs.

Keep the evaluator's ledger outside the target workspace. The agent gets only the source documents, source authority/context, and user task. Use exported tracker evidence for reproducible offline tests; reserve live connector behavior for a separately reported integration run.

## Observable milestones

### Scripted operator in public SkillOpt cells

The public train/development `bootstrap-analysis`, `bounded-context-questions`
and `approval-plan-apply` families expose `skillopt_ask_user` through the trusted
MCP broker. The agent asks a context, clarification or approval question, receives
a deterministic operator answer, and continues in the same Codex session. Four
exchanges are available; unknown clarifications remain unknown. This exercises
tool-mediated dialogue, not the desktop's native question UI or a general human
simulator. Held-out, repair and source-review cases retain their existing flow.

Both skill variants receive a user-style Markdown link to the same fictional
document on disk, `documentation/library-policy.md`, and its source authority.
The operator response contains no extracted claims or planner payload: the agent
must open the file, interpret its content and author its own cited claims.
Answers and approval policy are host-owned, outside the target mount; they contain
no scoring rubric, obligation ledger or evaluation feedback. The broker records
questions and answers in its hash-chained trace. Citations point to the supplied
Markdown document. Native regressions read that actual file before constructing
the preview, using agent-chosen source IDs and project summary.
User exchanges are excluded from
Kibi tool ordering and Kibi diagnostic reconciliation, and add no model invocation.

Read-only cases refuse writes. The apply case starts without delegated approval:
the operator may approve only a ready preview actually returned by Kibi, with the
single supplied obligation and repository observations. Approval binds the whole
unchanged plan and its canonical hash, is consumed by one apply attempt, and is
invalidated by replanning. An unapproved write is blocked before forwarding and
recorded as a security violation. Report dialogue exhaustion, refusal, unknown
context and any unauthorized attempt separately from product failures.

Freeze the new corpus/runtime hashes before another paired run. Previous
single-prompt scores are not directly comparable: asking a legitimate question
previously ended the episode without an operator response. Offline regressions
establish the dialogue plumbing and approval boundary, not model performance.

1. Intake: use context already supplied; ask only questions needed to establish purpose, source authority and priority scope. Record unavailable sources without inventing access.
2. Extraction: account for every source obligation, preserve qualifiers and citations, expose conflicts, and exclude instructions/examples from product policy.
3. Preview: compare submitted, selected, suppressed and unresolved intent per source and product area. Detect whole-source omissions, candidate-cap truncation and invalid-write diagnostics. A ready plan is not a completeness verdict.
4. Approval: present the unchanged plan and canonical hash. An evaluator acting as the operator may approve only after that preview; changed plans require matching approval. A task with explicit delegated approval must record the exact scope of that delegation.
5. Apply: use the typed plan writer; never replay raw upserts. Preserve deterministic rejection, partial committed results and repair evidence. Do not convert a terminal rejection into claimed success.
6. Readback: query persisted content and citations through Kibi and reconcile the original obligation ledger. Check freshness and consistency separately from meaning and implementation proof.
7. Handoff: account for every omitted or unresolved obligation, its reason, owner/next action and whether the user accepted reduced scope. New test prose is not execution evidence.

## Report

Report the requested and observed source scope, runtime/model/body hashes, artifact hashes and all attempted episodes including retries and invalid runs. Provide a per-obligation ledger with source reference, normative classification, important qualifiers, selected/suppressed disposition, persisted ID, semantic discrepancy and next action. Provide separate per-source and per-area counts for valid obligations, selected claims, persisted claims and unresolved gaps; disclose unknown denominators.

Separate initialization reliability, workflow/approval compliance, source coverage, semantic fidelity, consistency/freshness, and executable proof. Deterministic citation/count checks cannot establish semantic equivalence; independently review meaning and report uncertainty. For each failure identify the evidence and likely layer: runtime/product, fixture/harness, skill instruction, model execution, or unresolved cause. Never merge these into an unexplained aggregate score.

Include a machine-readable result plus a concise human report, with an explicit invalid/blocked/partial/complete verdict and a baseline/candidate table for every paired run. Adoption requires both no safety regression and a reproducible improvement in the intended outcomes; tool-call presence alone is insufficient.
