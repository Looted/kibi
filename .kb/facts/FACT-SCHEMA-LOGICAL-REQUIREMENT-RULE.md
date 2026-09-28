---
id: FACT-SCHEMA-LOGICAL-REQUIREMENT-RULE
title: Logical requirement rule predicate schema
status: active
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
source: documentation/facts/FACT-SCHEMA-LOGICAL-REQUIREMENT-RULE.md
tags:
  - lane:ontology
  - predicate-schema
  - requirements
  - prolog
fact_kind: predicate_schema
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_arity: 3
argument_names:
  - subject
  - obligation
  - outcome
argument_types:
  - entity_kind
  - constraint
  - logical_result
argument_descriptions:
  - Governed Kibi component, one of the declared component constants.
  - Canonical obligation or conflicting condition.
  - Required logical representation or validation outcome.
examples:
  - logical_requirement_rule(kibi.logic.coverage,every_atomic_clause,keyed_ground_fact)
argument_constants:
  subject:
    - kibi.audit.log
    - kibi.checks.contradictions
    - kibi.checks.core_rules
    - kibi.cli.check.staged
    - kibi.cli.doctor
    - kibi.cli.query
    - kibi.cli.startup
    - kibi.coverage.repair_plan
    - kibi.coverage.requirement
    - kibi.distribution.parity
    - kibi.engine.journal
    - kibi.engine.prolog_process
    - kibi.logic.coverage
    - kibi.mcp.tool_schema
    - kibi.migration.legacy_plan
    - kibi.modeling.predicates
    - kibi.proof.requirement
    - kibi.report.github
    - kibi.report.html
    - kibi.runtime.packaging
    - kibi.telemetry.acceptance
    - kibi.telemetry.remediation
    - kibi.testing.harness
argument_aliases:
  subject:
    advisor_correlation: kibi.telemetry.acceptance
    advisor_evidence: kibi.telemetry.remediation
    assertive_proposition: kibi.migration.legacy_plan
    audit_log_entry: kibi.audit.log
    canonical_fixture_set: kibi.distribution.parity
    canonical_github_pages_report: kibi.report.github
    capability_evidence: kibi.distribution.parity
    cli_and_mcp_coverage: kibi.migration.legacy_plan
    cli_json_operation: kibi.telemetry.remediation
    cli_prolog_process: kibi.engine.prolog_process
    cli_startup: kibi.cli.startup
    compound_goal_status_query: kibi.engine.prolog_process
    consumer_published_only_install: kibi.runtime.packaging
    contradiction_analysis: kibi.proof.requirement
    core_validation: kibi.checks.core_rules
    coverage_report: kibi.proof.requirement
    coverage_telemetry: kibi.telemetry.acceptance
    curated_root_suite: kibi.testing.harness
    current_requirement: kibi.logic.coverage
    declared_logic_manifest: kibi.logic.coverage
    detected_contradiction: kibi.proof.requirement
    diagnostic_usage_record: kibi.telemetry.acceptance
    distribution_parity_gate: kibi.distribution.parity
    distribution_parity_report: kibi.distribution.parity
    distribution_parity_runner: kibi.distribution.parity
    doctor_failed_check: kibi.cli.doctor
    domain_contradiction_diagnostic: kibi.checks.contradictions
    downstream_repair_batch: kibi.coverage.repair_plan
    engine_scope: kibi.engine.journal
    entity_relationships: kibi.cli.query
    event_remediation: kibi.telemetry.remediation
    existing_semantic_text: kibi.migration.legacy_plan
    existing_text_ref: kibi.migration.legacy_plan
    ground_fact: kibi.logic.coverage
    kb_mutation: kibi.audit.log
    kibi_doctor_command: kibi.cli.doctor
    kibi_github_report: kibi.report.github
    kibi_github_scaffold: kibi.report.github
    kibi_html_report: kibi.report.html
    kibi_html_report_pagination: kibi.report.html
    kibi_init: kibi.report.github
    kibi_query_command: kibi.cli.query
    kibi_report_open_option: kibi.report.html
    kibi_report_output_option: kibi.report.html
    kibi_report_workflow: kibi.report.github
    legacy_branch: kibi.engine.journal
    legacy_migration_batch: kibi.migration.legacy_plan
    legacy_migration_planner: kibi.migration.legacy_plan
    legacy_migration_preview: kibi.migration.legacy_plan
    mcp_attached_branch: kibi.engine.prolog_process
    mcp_operation: kibi.telemetry.remediation
    mcp_tool_schema: kibi.mcp.tool_schema
    migration_preview_batch: kibi.migration.legacy_plan
    missing_complete_coverage_evidence: kibi.telemetry.remediation
    missing_opt_in_usage_log: kibi.telemetry.acceptance
    missing_or_unresolved_evidence: kibi.proof.requirement
    modeled_proposition: kibi.proof.requirement
    mutation_retry_discipline: kibi.telemetry.acceptance
    non_requirement_coverage: kibi.coverage.requirement
    normal_client_operation: kibi.engine.journal
    normal_sync: kibi.engine.journal
    normalization: kibi.distribution.parity
    normative_requirement: kibi.logic.coverage
    one_shot_query_execution: kibi.engine.prolog_process
    ordinary_integration_test: kibi.testing.harness
    packed_e2e_worker: kibi.testing.harness
    packed_outcomes: kibi.distribution.parity
    paginated_repair_plan: kibi.coverage.repair_plan
    predicate_candidate: kibi.migration.legacy_plan
    predicate_contradiction: kibi.checks.contradictions
    predicate_ranking: kibi.migration.legacy_plan
    predicate_suggestion: kibi.modeling.predicates
    preflight_evidence: kibi.telemetry.remediation
    project_resolved_divergence: kibi.distribution.parity
    project_runtime_fixture: kibi.distribution.parity
    prolog_engine_channel: kibi.engine.prolog_process
    proof_bearing_production_symbol: kibi.proof.requirement
    proof_bearing_symbol: kibi.proof.requirement
    proven_requirement: kibi.proof.requirement
    published_kibi_runtime_package: kibi.runtime.packaging
    pull_request_event: kibi.report.github
    qualifying_e2e_test: kibi.proof.requirement
    query_output_format: kibi.cli.query
    query_result_filtering: kibi.cli.query
    rdf_transaction: kibi.engine.journal
    repair_batch: kibi.coverage.repair_plan
    repair_plan_identifier: kibi.coverage.repair_plan
    repair_planner: kibi.coverage.repair_plan
    requirement_coverage: kibi.coverage.requirement
    requirement_proof: kibi.proof.requirement
    requirement_repair_plan: kibi.coverage.repair_plan
    requirement_semantic_source: kibi.migration.legacy_plan
    rule_overlap_analysis: kibi.proof.requirement
    runtime_provenance: kibi.distribution.parity
    same_session_status_query: kibi.engine.prolog_process
    staged_validation_overlay: kibi.cli.check.staged
    telemetry_acceptance: kibi.telemetry.acceptance
    telemetry_remediation_items: kibi.telemetry.remediation
    telemetry_remediation_v1: kibi.telemetry.remediation
    test_engine_fixture: kibi.testing.harness
    unfiltered_kb_check: kibi.telemetry.acceptance
    unsupported_capability: kibi.distribution.parity
    usage_metrics_acceptance_gate: kibi.telemetry.acceptance
    usage_record: kibi.telemetry.remediation
    usage_remediation_command: kibi.telemetry.remediation
    usage_telemetry: kibi.telemetry.acceptance
    validation_correlation: kibi.telemetry.acceptance
type: fact
---

Defines the stable project ontology used to ground Kibi's logical-coverage requirement without turning graph relationship names into ontology predicates.
