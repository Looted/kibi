:- module(proof_fixture, [
    pf_entity/3,
    pf_raw_props/3,
    pf_raw_rel/3,
    pf_receipt/2,
    pf_receipts_json/2,
    pf_rule_pair/2,
    pf_rule_pair/4,
    pf_conflict_pair/4,
    pf_stub_proof/3
]).

% KB facts for the proof, discovery and check plunit files: entities stored
% past the validator, proof receipts, rule and property conflict pairs, and
% stubbed requirement proofs.

:- use_module(library(http/json)).
:- use_module('../src/kb.pl').
:- use_module(kb_fixture).

%% pf_entity(+Type, +Id, +Props)
% An entity with the required fields filled in where Props leaves them out,
% stored past the validator so a test can write any shape the readers meet.
pf_entity(Type, Id, Props0) :-
    Defaults = [title="Fixture entity", status=active, created_at="2026-05-01T00:00:00Z",
                updated_at="2026-05-01T00:00:00Z", source="test://proof_fixture.pl"],
    exclude(set_in(Props0), Defaults, Missing),
    append([[id=Id], Missing, Props0], Props),
    pf_raw_props(Id, Type, Props).

set_in(Props, Key=_) :-
    memberchk(Key=_, Props).

%% pf_raw_props(+Id, +Type, +Props)
% Store exactly Props for the entity.
pf_raw_props(Id, Type, Props) :-
    kb:kb_graph(Graph),
    atom_string(Type, TypeString),
    format(atom(EntityUri), 'kb:entity/~w', [Id]),
    kb:with_kb_mutex((
        rdf11:rdf_retractall(EntityUri, _, _, Graph),
        rdf11:rdf_assert(EntityUri, kb:type, '^^'(TypeString, 'http://www.w3.org/2001/XMLSchema#string'), Graph),
        forall(member(Key=Value, Props), kb:store_property(EntityUri, Key, Value, Graph))
    )),
    kb:kb_refresh_entity_index(Id).

%% pf_raw_rel(+Type, +From, +To)
% A relationship stored past the validator.
pf_raw_rel(Type, From, To) :-
    kb:kb_graph(Graph),
    kb:kb_uri(Base),
    atom_concat(Base, Type, RelUri),
    format(atom(FromUri), 'kb:entity/~w', [From]),
    format(atom(ToUri), 'kb:entity/~w', [To]),
    kb:with_kb_mutex(rdf11:rdf_assert(FromUri, RelUri, ToUri, Graph)).

%% pf_receipt(+Options, -Receipt)
% A well-formed kibi.proof-receipt.v1 dict. Options (Key=Value) replace
% fields of the default receipt; Key=delete removes one.
pf_receipt(Options, Receipt) :-
    Default = _{
        version: 'kibi.proof-receipt.v1',
        receipt_id: 'PR-FIXTURE00001',
        test_id: 'TEST-E2E',
        scope: end_to_end,
        outcome: passed,
        code_snapshot: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        environment_hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        started_at: '2026-05-01T00:00:00Z',
        finished_at: '2026-05-01T00:01:00Z',
        artifact_digest: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        contract_hash: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        fingerprint: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        fingerprint_components: _{
            contract: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            integration: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
            command: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaac',
            bindings: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaad',
            producer: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaae'
        },
        integration_id: 'self-proof',
        producer: _{name: 'kibi-command-producer'},
        command_argv: [kibi, prove, '--all'],
        run_outcome: passed,
        proof_results: [_{symbol_id: 'SYM-E2E', target: default, outcome: passed,
                          binding: aggregate_run, attempts: _{status: unavailable}}]
    },
    foldl(receipt_option, Options, Default, Receipt).

receipt_option(Key=delete, Receipt0, Receipt) :-
    !,
    del_dict(Key, Receipt0, _, Receipt).
receipt_option(Key=Value, Receipt0, Receipt) :-
    put_dict(Key, Receipt0, Value, Receipt).

%% pf_receipts_json(+Receipts, -Json)
% The proof_receipts property value for a list of receipt dicts.
pf_receipts_json(Receipts, Json) :-
    with_output_to(string(Json), json_write_dict(current_output, Receipts, [width(0)])).

%% pf_rule_pair(+BodyA, +BodyB)
% REQ-RULE-ALLOW obliges and REQ-RULE-DENY forbids governed_action, under
% bodies BodyA and BodyB: an atom names a body atom without arguments, a
% dict is the body expression itself.
pf_rule_pair(BodyA, BodyB) :-
    pf_rule_pair(BodyA, _{}, BodyB, _{}).

%% pf_rule_pair(+BodyA, +ExtraA, +BodyB, +ExtraB)
% As pf_rule_pair/2, with the rule IR keys in ExtraA and ExtraB added.
pf_rule_pair(BodyA, ExtraA, BodyB, ExtraB) :-
    rule_json(oblige, BodyA, ExtraA, RuleJsonA),
    rule_json(forbid, BodyB, ExtraB, RuleJsonB),
    fixture_entity(fact, 'FACT-RULE-ALLOW', [
        fact_kind=rule, rule_ir=RuleJsonA,
        rule_hash="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        rule_schema_id="FACT-RULE-SCHEMA-TEST", rule_name="governed_action_rule",
        semantic_key="governed_action_rule:allow", claim_key="CLAIM-CCCCCCCCCCCCCCCC",
        claim_text="Customers must perform governed action", claim_span_start=0, claim_span_end=37
    ]),
    fixture_entity(fact, 'FACT-RULE-DENY', [
        fact_kind=rule, rule_ir=RuleJsonB,
        rule_hash="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        rule_schema_id="FACT-RULE-SCHEMA-TEST", rule_name="governed_action_rule",
        semantic_key="governed_action_rule:deny", claim_key="CLAIM-DDDDDDDDDDDDDDDD",
        claim_text="Customers must not perform governed action", claim_span_start=0, claim_span_end=41
    ]),
    fixture_entity(req, 'REQ-RULE-ALLOW', [status=open]),
    fixture_entity(req, 'REQ-RULE-DENY', [status=open]),
    fixture_rel(requires_rule, 'REQ-RULE-ALLOW', 'FACT-RULE-ALLOW'),
    fixture_rel(requires_rule, 'REQ-RULE-DENY', 'FACT-RULE-DENY').

rule_json(Modality, Body0, Extra, Json) :-
    (   is_dict(Body0)
    ->  Body = Body0
    ;   Body = _{kind: atom, name: Body0, args: []}
    ),
    Dict0 = _{version: 'kibi.logic.v1', kind: rule, modality: Modality,
              head: _{kind: atom, name: governed_action, args: []},
              body: Body, variables: []},
    put_dict(Extra, Dict0, Dict),
    with_output_to(string(Json), json_write_dict(current_output, Dict, [width(0)])).

%% pf_conflict_pair(+ReqA, +ValueA, +ReqB, +ValueB)
% Two requirements requiring api.quota rate_limit to equal ValueA and ValueB.
pf_conflict_pair(ReqA, ValueA, ReqB, ValueB) :-
    fixture_entity(fact, 'FACT-CONFLICT-SUBJECT', [fact_kind=subject, subject_key="api.quota"]),
    fixture_entity(fact, 'FACT-CONFLICT-A', [fact_kind=property_value, subject_key="api.quota",
        property_key="rate_limit", operator=eq, value_type=int, value_int=ValueA,
        claim_key="CLAIM-AAAAAAAAAAAAAAAA", claim_text="API quota must equal the first value"]),
    fixture_entity(fact, 'FACT-CONFLICT-B', [fact_kind=property_value, subject_key="api.quota",
        property_key="rate_limit", operator=eq, value_type=int, value_int=ValueB,
        claim_key="CLAIM-BBBBBBBBBBBBBBBB", claim_text="API quota must equal the second value"]),
    fixture_entity(req, ReqA, [status=open]),
    fixture_entity(req, ReqB, [status=open]),
    fixture_rel(constrains, ReqA, 'FACT-CONFLICT-SUBJECT'),
    fixture_rel(constrains, ReqB, 'FACT-CONFLICT-SUBJECT'),
    fixture_rel(requires_property, ReqA, 'FACT-CONFLICT-A'),
    fixture_rel(requires_property, ReqB, 'FACT-CONFLICT-B').

%% pf_stub_proof(+ReqId, +Context, +Proof)
% Make requirement_proof/4 answer Proof for ReqId under Context, through
% its proof memo, until the KB changes.
pf_stub_proof(ReqId, Context, Proof) :-
    kb:index_verification_key(requirement_proof, IndexKey),
    get_dict(proofMemoKey, Context, ParamsKey),
    Key = key(IndexKey, ParamsKey),
    (   kb:kb_requirement_proof_memo(_, Stored, _),
        Stored \== Key
    ->  retractall(kb:kb_requirement_proof_memo(_, _, _))
    ;   true
    ),
    retractall(kb:kb_requirement_proof_memo(ReqId, _, _)),
    assertz(kb:kb_requirement_proof_memo(ReqId, Key, Proof)).
