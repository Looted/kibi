:- use_module(library(plunit)).
:- use_module(library(http/json)).
:- use_module('../src/kb.pl').
:- use_module('../src/semantic_quality.pl').
:- use_module(kb_fixture).
:- use_module(cert_fixture, []).
:- use_module(test_helpers).

% Vocabulary-convergence and redundancy diagnostics over fresh fixture KBs.
% Facts the validator would refuse are written with cert_fixture:raw_entity/3.

%% sqx_entity(+Type, +Id, +Props)
% An entity with the required fields filled in where Props leaves them out.
sqx_entity(Type, Id, Props0) :-
    Defaults = [title="Fixture entity", status=active, created_at="2026-05-01T00:00:00Z",
                updated_at="2026-05-01T00:00:00Z", source="test://semantic_quality.plt"],
    sqx_missing(Defaults, Props0, Missing),
    append([[id=Id], Missing, Props0], Props),
    (   kb_assert_entity(Type, Props)
    ->  true
    ;   throw(error(sqx_entity_rejected(Type, Props), _))
    ).

% The defaults whose key Props does not set.
sqx_missing([], _, []).
sqx_missing([Key=Value|Defaults], Props, Missing) :-
    (   memberchk(Key=_, Props)
    ->  Missing = Missing1
    ;   Missing = [Key=Value|Missing1]
    ),
    sqx_missing(Defaults, Props, Missing1).

sqx_req(Id) :- sqx_entity(req, Id, [status=open]).

sqx_subject(Id, Key) :- sqx_entity(fact, Id, [fact_kind=subject, subject_key=Key]).

%% sqx_property(+Id, +Subject, +Property, +Operator, +Type, +Value, +Extra)
sqx_property(Id, Subject, Property, Operator, Type, Value, Extra) :-
    memberchk(Type-Field, [int-value_int, number-value_number, string-value_string, bool-value_bool, set-value_set]),
    append([fact_kind=property_value, subject_key=Subject, property_key=Property,
            operator=Operator, value_type=Type, Field=Value], Extra, Props),
    sqx_entity(fact, Id, Props).

sqx_predicate(Id, Name, Args, Extra) :-
    atom_string(Id, Key),
    append([fact_kind=predicate, predicate_name=Name, predicate_args=Args, canonical_key=Key], Extra, Props),
    sqx_entity(fact, Id, Props).

% A requirement constraining a subject and requiring a property.
sqx_strict_req(ReqId, SubjectId, FactId) :-
    sqx_req(ReqId),
    fixture_rel(constrains, ReqId, SubjectId),
    fixture_rel(requires_property, ReqId, FactId).

% --- logical ground signatures ---------------------------------------------------

:- begin_tests(semantic_quality_signatures).

signatures(FactId, Expected) :-
    findall(S, logical_ground_signature(FactId, S), Signatures),
    Signatures == Expected.

test(each_fact_kind) :-
    with_fixture_kb((
        sqx_predicate('F-PRED', "staff", ["coach"], []),
        sqx_property('F-TTL', "session.life", "ttl", lte, int, 30, [unit="min"]),
        sqx_entity(fact, 'F-RULE', [fact_kind=rule, rule_ir="{}", rule_hash="h", rule_schema_id='S', semantic_key="k"]),
        cert_fixture:raw_entity(fact, 'F-HASH', [fact_kind=rule, rule_hash="h2"]),
        cert_fixture:raw_entity(fact, 'F-BARE-RULE', [fact_kind=rule]),
        cert_fixture:raw_entity(fact, 'F-OBS', [fact_kind=observation, semantic_key="k"]),
        sqx_subject('F-SUBJ', "session.life"),
        signatures('F-PRED', [predicate(default, staff, [coach], assert)]),
        signatures('F-TTL', [property('session.life', ttl, lte, int, 1800, s, '', require)]),
        signatures('F-RULE', [rule(k)]),
        signatures('F-HASH', [rule(h2)]),
        signatures('F-BARE-RULE', []),
        signatures('F-OBS', []),
        signatures('F-SUBJ', [])
    )).

:- end_tests(semantic_quality_signatures).

% --- entity-id-style ---------------------------------------------------------------

:- begin_tests(semantic_quality_entity_id_style).

test(stems_must_match_ids) :-
    with_fixture_kb((
        forall(member(Type, [req, scenario, test, adr, flag, event, fact]),
               (   atom_concat('ID-', Type, Id),
                   atomic_list_concat(['.kb/', Type, '/other-', Type, '.md'], Source0),
                   atom_string(Source0, Source),
                   sqx_entity(Type, Id, [source=Source])
               )),
        sqx_entity(symbol, 'ID-symbol', [source=".kb/symbol/other-symbol.md"]),
        sqx_entity(req, 'REQ-good', [status=open, source=".kb/requirements/REQ-good.md"]),
        sqx_entity(req, 'REQ-win', [status=open, source="C:\\kb\\requirements\\REQ-other.md"]),
        sqx_entity(req, 'REQ-bare', [status=open, source="REQ-elsewhere.md"]),
        sqx_entity(req, 'REQ-url', [status=open, source="mcp://kibi/REQ-x.md"]),
        sqx_entity(req, 'REQ-empty-stem', [status=open, source=".kb/requirements/.md"]),
        sqx_entity(req, 'REQ-not-md', [status=open, source=".kb/requirements/REQ-x.txt"]),
        cert_fixture:raw_entity(req, 'REQ-no-source', [status=open]),
        first_answer_is_last(check_entity_id_style(Violations)),
        Violations = [First|_],
        First == violation('entity-id-style', 'ID-adr',
                           "Entity ID ID-adr does not match its filename stem other-adr",
                           "Rename the file to ID-adr.md or set frontmatter id: other-adr so file names and identities stay aligned",
                           ".kb/adr/other-adr.md"),
        findall(Id, member(violation(_, Id, _, _, _), Violations), Ids),
        Ids == ['ID-adr', 'ID-event', 'ID-fact', 'ID-flag', 'ID-req', 'ID-scenario', 'ID-test', 'REQ-bare', 'REQ-win'],
        memberchk(violation(_, 'REQ-win', WinDescription, _, WinSource), Violations),
        WinDescription == "Entity ID REQ-win does not match its filename stem REQ-other",
        WinSource == "C:\\kb\\requirements\\REQ-other.md"
    )).

:- end_tests(semantic_quality_entity_id_style).

% --- domain-redundancy -------------------------------------------------------------

:- begin_tests(semantic_quality_redundancy).

side(Req, ReqSource, Fact, FactSource, Key, Text,
     _{requirementId: Req, requirementSource: ReqSource, factId: Fact, factSource: FactSource,
       claimKey: Key, claimText: Text}).

test(same_signature_and_shared_fact) :-
    with_fixture_kb((
        sqx_subject('F-SUBJ', "session.life"),
        sqx_property('F-30M', "session.life", "ttl", lte, int, 30,
                     [unit="min", claim_key="C-30", claim_text="at most 30 minutes", source="facts/F-30M.md"]),
        sqx_property('F-1800S', "session.life", "ttl", lte, int, 1800, [unit="s"]),
        sqx_entity(req, 'REQ-a', [status=open, source="reqs/REQ-a.md"]),
        fixture_rel(requires_property, 'REQ-a', 'F-30M'),
        sqx_req('REQ-b'),
        fixture_rel(requires_property, 'REQ-b', 'F-1800S'),
        sqx_req('REQ-c'),
        fixture_rel(requires_property, 'REQ-c', 'F-30M'),
        first_answer_is_last(check_domain_redundancy_witnesses(Witnesses)),
        Signature = "property('session.life',ttl,lte,int,1800,s,'',require)",
        side('REQ-a', "reqs/REQ-a.md", 'F-30M', "facts/F-30M.md", "C-30", "at most 30 minutes", A30),
        side('REQ-b', "test://semantic_quality.plt", 'F-1800S', "test://semantic_quality.plt", "", "", B1800),
        side('REQ-c', "test://semantic_quality.plt", 'F-30M', "facts/F-30M.md", "C-30", "at most 30 minutes", C30),
        % REQ-a and REQ-c meet both by signature and by the shared fact: one witness.
        Witnesses = [AB, AC, BC],
        same(AB, _{kind: redundancy, status: duplicate, match: same_signature, requirements: ['REQ-a', 'REQ-b'],
                   facts: ['F-30M', 'F-1800S'], signature: Signature,
                   reason: "Requirements REQ-a and REQ-b ground the same logical term through F-30M and F-1800S",
                   left: A30, right: B1800}),
        same(AC, _{kind: redundancy, status: duplicate, match: shared_fact, requirements: ['REQ-a', 'REQ-c'],
                    facts: ['F-30M', 'F-30M'], signature: Signature,
                    reason: "Requirements REQ-a and REQ-c both link ground fact F-30M", left: A30, right: C30}),
        get_dict(requirements, BC, ['REQ-b', 'REQ-c']),
        first_answer_is_last(check_domain_redundancy(Violations)),
        Violations = [violation('domain-redundancy', EntityId, Description, Suggestion, Source, Evidence)|_],
        length(Violations, 3),
        EntityId == "REQ-a/REQ-b",
        Description == "Requirements REQ-a and REQ-b ground the same logical term through F-30M and F-1800S: property('session.life',ttl,lte,int,1800,s,'',require)",
        Suggestion == "Merge the duplicated requirements, supersede one with the other, or add an explicit restates relationship when the restatement is intentional",
        Source == "reqs/REQ-a.md",
        Evidence = _{witnesses: [W]},
        same(W, AB)
    )).

test(a_shared_fact_without_a_signature) :-
    with_fixture_kb((
        sqx_subject('F-SUBJ', "session.life"),
        sqx_req('REQ-a'),
        sqx_req('REQ-b'),
        fixture_rel(requires_property, 'REQ-a', 'F-SUBJ'),
        fixture_rel(requires_property, 'REQ-b', 'F-SUBJ'),
        check_domain_redundancy_witnesses([Witness]),
        get_dict(signature, Witness, ""),
        check_domain_redundancy([violation(_, _, Description, _, _, _)]),
        Description == "Requirements REQ-a and REQ-b both link ground fact F-SUBJ"
    )).

test(every_link_kind_and_only_current_unrelated_requirements) :-
    with_fixture_kb((
        sqx_predicate('F-P1', "staff", ["coach"], []),
        sqx_predicate('F-P2', "staff", ["coach"], []),
        sqx_predicate('F-P3', "staff", ["coach"], [polarity=deny]),
        sqx_entity(fact, 'F-R1', [fact_kind=rule, rule_ir="{}", rule_hash="h", rule_schema_id='S', semantic_key="k"]),
        sqx_entity(fact, 'F-R2', [fact_kind=rule, rule_ir="{}", rule_hash="h", rule_schema_id='S', semantic_key="k"]),
        forall(member(R, ['REQ-p1', 'REQ-p2', 'REQ-p3', 'REQ-r1', 'REQ-r2', 'REQ-new', 'REQ-same']), sqx_req(R)),
        sqx_entity(req, 'REQ-old', [status=deprecated]),
        fixture_rel(requires_predicate, 'REQ-p1', 'F-P1'),
        fixture_rel(requires_predicate, 'REQ-p2', 'F-P2'),
        fixture_rel(requires_predicate, 'REQ-p3', 'F-P3'),
        % One requirement grounding a term twice is no pair, and a restatement
        % is exempt in whichever direction it points.
        sqx_predicate('F-P4', "staff", ["coach"], []),
        sqx_req('REQ-p4'),
        fixture_rel(requires_predicate, 'REQ-p4', 'F-P4'),
        fixture_rel(restates, 'REQ-p1', 'REQ-p4'),
        sqx_predicate('F-P5', "staff", ["coach"], []),
        fixture_rel(requires_predicate, 'REQ-p2', 'F-P5'),
        fixture_rel(requires_predicate, 'REQ-old', 'F-P1'),
        fixture_rel(requires_rule, 'REQ-r1', 'F-R1'),
        fixture_rel(requires_rule, 'REQ-r2', 'F-R2'),
        fixture_rel(requires_rule, 'REQ-new', 'F-R1'),
        fixture_rel(requires_rule, 'REQ-same', 'F-R1'),
        fixture_rel(requires_predicate, 'REQ-same', 'F-R1'),
        fixture_rel(supersedes, 'REQ-new', 'REQ-r2'),
        fixture_rel(restates, 'REQ-r1', 'REQ-new'),
        fixture_rel(restates, 'REQ-same', 'REQ-r1'),
        check_domain_redundancy_witnesses(Witnesses),
        findall(Reqs-Match, (member(W, Witnesses), get_dict(requirements, W, Reqs), get_dict(match, W, Match)), Pairs),
        Pairs == [['REQ-new', 'REQ-same']-shared_fact, ['REQ-p1', 'REQ-p2']-same_signature,
                  ['REQ-p1', 'REQ-p2']-same_signature, ['REQ-p2', 'REQ-p4']-same_signature,
                  ['REQ-p2', 'REQ-p4']-same_signature]
    )).

test(nothing_to_report) :-
    with_fixture_kb((
        check_domain_redundancy_witnesses(Witnesses),
        Witnesses == [],
        check_domain_redundancy(Violations),
        Violations == []
    )).

:- end_tests(semantic_quality_redundancy).

% --- domain-implication ------------------------------------------------------------

:- begin_tests(semantic_quality_implication).

implies(OpA, A, OpB, B) :- semantic_quality:bound_implies(OpA, A, OpB, B).

test(bound_table) :-
    forall(member(OpA-A-OpB-B,
                  [lte-1-lte-2, lte-1-lt-2, lt-1-lt-2, lt-1-lte-1, lt-1-lte-2,
                   gte-2-gte-1, gte-2-gt-1, gt-2-gt-1, gt-1-gte-1, gt-2-gte-1,
                   eq-1-lte-1, eq-1-lte-2, eq-1-lt-2, eq-1-gte-1, eq-2-gte-1, eq-2-gt-1,
                   lte-1.0-lte-2]),
           implies(OpA, A, OpB, B)),
    forall(member(OpA-A-OpB-B,
                  [lte-2-lte-2, lte-3-lte-2, lte-2-lt-2, lte-3-lt-2, lt-2-lt-2, lt-3-lt-2, lt-2-lte-1,
                   gte-1-gte-1, gte-1-gte-2, gte-1-gt-1, gte-1-gt-2, gt-1-gt-1, gt-1-gt-2, gt-1-gte-2,
                   eq-2-lte-1, eq-1-lt-1, eq-2-lt-1, eq-1-gte-2, eq-1-gt-1, eq-1-gt-2,
                   lte-1-gte-0, eq-1-eq-1, eq-1-eq-2, lte-2-lte-2.0]),
           \+ implies(OpA, A, OpB, B)).

ttl_fact(Id, Operator, Value, Extra) :-
    sqx_property(Id, "session.life", "ttl", Operator, int, Value, Extra).

test(stronger_bounds_imply_weaker_ones) :-
    with_fixture_kb((
        sqx_subject('F-SUBJ', "session.life"),
        ttl_fact('F-30M', lte, 30, [unit="min"]),
        ttl_fact('F-1H', lte, 3600, [unit="s"]),
        sqx_entity(req, 'REQ-strict', [status=open, source="reqs/REQ-strict.md"]),
        sqx_entity(req, 'REQ-loose', [status=open, source="reqs/REQ-loose.md"]),
        fixture_rel(constrains, 'REQ-strict', 'F-SUBJ'),
        fixture_rel(requires_property, 'REQ-strict', 'F-30M'),
        fixture_rel(constrains, 'REQ-loose', 'F-SUBJ'),
        fixture_rel(requires_property, 'REQ-loose', 'F-1H'),
        first_answer_is_last(check_domain_implication_witnesses(Witnesses)),
        Witnesses = [Witness],
        Reason = "REQ-strict (session.life.ttl lte 1800s) implies REQ-loose (lte 3600s)",
        same(Witness, _{kind: implication, status: implied_by, requirements: ['REQ-strict', 'REQ-loose'],
                        facts: ['F-30M', 'F-1H'], subjectKey: 'session.life', propertyKey: ttl, scope: '', unit: s,
                        reason: Reason,
                        stronger: _{requirementId: 'REQ-strict', requirementSource: "reqs/REQ-strict.md", factId: 'F-30M',
                                    factSource: "test://semantic_quality.plt", claimKey: "", claimText: ""},
                        weaker: _{requirementId: 'REQ-loose', requirementSource: "reqs/REQ-loose.md", factId: 'F-1H',
                                  factSource: "test://semantic_quality.plt", claimKey: "", claimText: ""}}),
        first_answer_is_last(check_domain_implication(Violations)),
        Violations = [violation('domain-implication', EntityId, Description, Suggestion, Source, Evidence)],
        EntityId == "REQ-strict/REQ-loose",
        Description == "Implied by: REQ-strict (session.life.ttl lte 1800s) implies REQ-loose (lte 3600s)",
        Suggestion == "Informational: keep both bounds if they serve different audiences, or drop the weaker requirement when the stronger one already guarantees it",
        Source == "reqs/REQ-loose.md",
        Evidence = _{witnesses: [W]},
        same(W, Witness)
    )).

% Each requirement below states a bound the strong one implies, but something
% keeps it out of the comparison.
test(only_comparable_bounds_of_current_unrelated_requirements) :-
    with_fixture_kb((
        sqx_subject('F-SUBJ', "session.life"),
        sqx_subject('F-OTHER-SUBJ', "session.other"),
        ttl_fact('F-STRONG', lte, 10, []),
        ttl_fact('F-SECOND', lte, 15, []),
        ttl_fact('F-FORBID', lte, 20, [polarity=forbid]),
        ttl_fact('F-NEQ', neq, 20, []),
        ttl_fact('F-SCOPED', lte, 20, [scope="eu"]),
        sqx_property('F-TEXT', "session.life", "ttl", eq, string, "20", []),
        sqx_property('F-REAL', "session.life", "ttl", lte, number, 20.5, []),
        ttl_fact('F-OLD', lte, 20, []),
        ttl_fact('F-RESTATED', lte, 20, []),
        ttl_fact('F-SUPERSEDED', lte, 20, []),
        ttl_fact('F-UNCONSTRAINED', lte, 20, []),
        ttl_fact('F-ELSEWHERE', lte, 20, []),
        sqx_strict_req('REQ-strong', 'F-SUBJ', 'F-STRONG'),
        sqx_strict_req('REQ-second', 'F-SUBJ', 'F-SECOND'),
        sqx_strict_req('REQ-forbid', 'F-SUBJ', 'F-FORBID'),
        sqx_strict_req('REQ-neq', 'F-SUBJ', 'F-NEQ'),
        sqx_strict_req('REQ-scoped', 'F-SUBJ', 'F-SCOPED'),
        sqx_strict_req('REQ-text', 'F-SUBJ', 'F-TEXT'),
        sqx_strict_req('REQ-real', 'F-SUBJ', 'F-REAL'),
        sqx_entity(req, 'REQ-old', [status=deprecated]),
        fixture_rel(constrains, 'REQ-old', 'F-SUBJ'),
        fixture_rel(requires_property, 'REQ-old', 'F-OLD'),
        sqx_strict_req('REQ-restated', 'F-SUBJ', 'F-RESTATED'),
        fixture_rel(restates, 'REQ-restated', 'REQ-strong'),
        sqx_strict_req('REQ-superseded', 'F-SUBJ', 'F-SUPERSEDED'),
        fixture_rel(supersedes, 'REQ-strong', 'REQ-superseded'),
        sqx_req('REQ-unconstrained'),
        fixture_rel(requires_property, 'REQ-unconstrained', 'F-UNCONSTRAINED'),
        sqx_strict_req('REQ-elsewhere', 'F-OTHER-SUBJ', 'F-ELSEWHERE'),
        % Two bounds of one requirement never imply each other.
        ttl_fact('F-SELF-A', lte, 30, []),
        ttl_fact('F-SELF-B', lte, 40, []),
        sqx_strict_req('REQ-self', 'F-SUBJ', 'F-SELF-A'),
        fixture_rel(requires_property, 'REQ-self', 'F-SELF-B'),
        fixture_rel(restates, 'REQ-self', 'REQ-strong'),
        fixture_rel(restates, 'REQ-self', 'REQ-second'),
        fixture_rel(restates, 'REQ-self', 'REQ-restated'),
        fixture_rel(restates, 'REQ-self', 'REQ-real'),
        check_domain_implication_witnesses(Witnesses),
        findall(Reqs, (member(W, Witnesses), get_dict(requirements, W, Reqs)), Pairs),
        Pairs == [['REQ-restated', 'REQ-real'], ['REQ-second', 'REQ-real'], ['REQ-second', 'REQ-restated'],
                  ['REQ-strong', 'REQ-real'], ['REQ-strong', 'REQ-second']]
    )).

:- end_tests(semantic_quality_implication).

% --- subject-key-identity ----------------------------------------------------------

:- begin_tests(semantic_quality_identity).

segments(ReqId, Segments) :-
    findall(S, requirement_subject_segment(ReqId, S), Segments).

test(requirement_segments) :-
    with_fixture_kb((
        sqx_req('REQ-cli-gc'),
        sqx_req('REQ--Two  FA..login_'),
        sqx_req('REQ-\x00E9\2'),
        sqx_req('plain'),
        sqx_req('REQ-'),
        segments('REQ-cli-gc', ['req_cli_gc', 'cli_gc']),
        segments('REQ--Two  FA..login_', ['req_two_fa_login', 'two_fa_login']),
        segments('REQ-\x00E9\2', ['req_2', '2']),
        segments('plain', [plain]),
        segments('REQ-', [req]),
        segments('REQ-none', []),
        semantic_quality:normalized_identifier('_A-z{0`9:@', Normalized),
        Normalized == 'a_z_0_9'
    )).

test(identifier_codes) :-
    forall(member(C, `09az`), semantic_quality:identifier_code(C)),
    forall(member(C, `/:\`{A_.`), \+ semantic_quality:identifier_code(C)),
    \+ semantic_quality:identifier_code(0x0663).

identity_ids(Violations, Ids) :-
    findall(Id, member(violation(_, Id, _, _, _), Violations), Ids).

test(req_derived_subject_keys) :-
    with_fixture_kb((
        sqx_req('REQ-cli-gc'),
        sqx_req('REQ-opencode-plugin'),
        sqx_subject('F-SUBJ-WHOLE', "req.req_cli_gc"),
        sqx_subject('F-SUBJ-STRIPPED', "req.opencode_plugin.document"),
        sqx_subject('F-SUBJ-SHARED', "kibi.cli.gc"),
        sqx_subject('F-SUBJ-UNKNOWN', "req.no_such"),
        sqx_subject('F-SUBJ-NOT-REQ', "cli_gc.req"),
        cert_fixture:raw_entity(fact, 'F-OBS', [fact_kind=observation, subject_key="req.cli_gc"]),
        sqx_property('F-PROP-COVERED', "req.req_cli_gc", "removes", eq, bool, true, []),
        sqx_property('F-PROP-ORPHAN', "req.cli_gc.orphan", "removes", eq, bool, true, []),
        sqx_property('F-PROP-SHARED', "kibi.cli.gc", "removes", eq, bool, true, []),
        first_answer_is_last(check_subject_key_identity(Violations)),
        identity_ids(Violations, Ids),
        Ids == ['F-PROP-ORPHAN', 'F-SUBJ-STRIPPED', 'F-SUBJ-WHOLE'],
        Violations = [violation(Rule, _, Description, Suggestion, Source)|_],
        Rule == 'subject-key-identity',
        Description == "Subject key req.cli_gc.orphan is derived from requirement ID REQ-cli-gc, so no other requirement can share this subject",
        Suggestion == "Use a shared dotted component.aspect subject key (for example kibi.cli.check.staged) that other requirements about the same component can reuse; update the subject fact and its property_value facts together",
        Source == "test://semantic_quality.plt"
    )).

test(the_first_requirement_names_a_shared_segment) :-
    with_fixture_kb((
        sqx_req('REQ-b-x'),
        sqx_req('REQ-a_x'),
        sqx_req('REQ_b_x'),
        sqx_subject('F-SUBJ', "req.req_b_x"),
        check_subject_key_identity([violation(_, 'F-SUBJ', Description, _, _)]),
        Description == "Subject key req.req_b_x is derived from requirement ID REQ-b-x, so no other requirement can share this subject"
    )).

test(one_subject_minted_as_several_facts) :-
    with_fixture_kb((
        sqx_entity(fact, 'F-A', [fact_kind=subject, subject_key="web.upload", source="facts/F-A.md"]),
        sqx_subject('F-B', "web.upload"),
        sqx_subject('F-C', "web.upload"),
        sqx_subject('F-OTHER', "web.download"),
        cert_fixture:raw_entity(fact, 'F-NO-STATUS', [fact_kind=subject, subject_key="web.upload"]),
        forall(member(Status-Id, ["superseded"-'F-S1', "deprecated"-'F-S2', "closed"-'F-S3', "removed"-'F-S4',
                                  "retired"-'F-S5', "inactive"-'F-S6', "archived"-'F-S7']),
               cert_fixture:raw_entity(fact, Id, [status=Status, fact_kind=subject, subject_key="web.upload"])),
        first_answer_is_last(check_subject_key_identity(Violations)),
        Violations = [violation(Rule, FirstId, Description, Suggestion, Source, Evidence)],
        Rule == 'subject-key-identity',
        FirstId == 'F-A',
        Description == "4 active subject facts share subject_key web.upload (F-A, F-B, F-C, F-NO-STATUS), so requirements about this subject are split across facts that never meet",
        Suggestion == "Keep one subject fact for web.upload, point every requirement's constrains link at it, and remove the others (kb_delete) once nothing links them",
        Source == "facts/F-A.md",
        same(Evidence, _{subjectKey: 'web.upload', facts: ['F-A', 'F-B', 'F-C', 'F-NO-STATUS']})
    )).

test(live_facts_follow_their_requirements) :-
    with_fixture_kb((
        sqx_entity(req, 'REQ-old', [status=deprecated]),
        sqx_req('REQ-new'),
        sqx_req('REQ-replaced'),
        fixture_rel(supersedes, 'REQ-new', 'REQ-replaced'),
        forall(member(Id, ['F-ORPHAN', 'F-CURRENT', 'F-OLD', 'F-MIXED', 'F-REPLACED', 'F-PRED', 'F-RULE']),
               sqx_subject(Id, "web.upload")),
        fixture_rel(constrains, 'REQ-new', 'F-CURRENT'),
        fixture_rel(constrains, 'REQ-old', 'F-OLD'),
        fixture_rel(requires_property, 'REQ-old', 'F-MIXED'),
        fixture_rel(requires_property, 'REQ-new', 'F-MIXED'),
        fixture_rel(constrains, 'REQ-replaced', 'F-REPLACED'),
        fixture_rel(requires_predicate, 'REQ-old', 'F-PRED'),
        fixture_rel(requires_rule, 'REQ-old', 'F-RULE'),
        check_subject_key_identity([violation(_, _, _, _, _, Evidence)]),
        get_dict(facts, Evidence, Facts),
        Facts == ['F-CURRENT', 'F-MIXED', 'F-ORPHAN']
    )).

claim(Id, Extra) :-
    sqx_property(Id, "kibi.check", "exit_code", eq, int, 1, Extra).

test(one_claim_minted_as_several_facts) :-
    with_fixture_kb((
        sqx_subject('F-SUBJ', "kibi.check"),
        claim('F-A', [source="facts/F-A.md"]),
        claim('F-B', [polarity=require]),
        claim('F-FORBID', [polarity=forbid]),
        claim('F-UNIT', [unit="s"]),
        sqx_property('F-OP', "kibi.check", "exit_code", lte, int, 1, []),
        sqx_property('F-VALUE', "kibi.check", "exit_code", eq, int, 2, []),
        sqx_property('F-NUMBER', "kibi.check", "exit_code", eq, number, 1, []),
        sqx_property('F-PROP', "kibi.check", "code", eq, int, 1, []),
        sqx_property('F-SUBJECT', "kibi.run", "exit_code", eq, int, 1, []),
        sqx_property('F-TEXT-A', "kibi.check", "name", eq, string, "x", []),
        sqx_property('F-TEXT-B', "kibi.check", "name", eq, string, "x", []),
        sqx_property('F-TEXT-C', "kibi.check", "name", eq, string, "y", []),
        sqx_property('F-SET-A', "kibi.check", "modes", eq, set, ["a", "b"], []),
        sqx_property('F-SET-B', "kibi.check", "modes", eq, set, ["a", "b"], []),
        sqx_property('F-BOOL-A', "kibi.check", "on", eq, bool, true, []),
        sqx_property('F-BOOL-B', "kibi.check", "on", eq, bool, false, []),
        cert_fixture:raw_entity(fact, 'F-RETIRED', [status="retired", fact_kind=property_value, subject_key="kibi.check",
                                                    property_key="exit_code", operator="eq", value_type="int", value_int=1]),
        cert_fixture:raw_entity(fact, 'F-BLANK-POLARITY', [status="active", fact_kind=property_value, subject_key="kibi.check",
                                                           property_key="exit_code", operator="eq", value_type="int", value_int=1,
                                                           polarity="", unit=""]),
        % Duplicates kept only by a retired requirement are history.
        sqx_entity(req, 'REQ-old-only', [status=deprecated]),
        sqx_property('F-HIST-A', "kibi.check", "retries", eq, int, 3, []),
        sqx_property('F-HIST-B', "kibi.check", "retries", eq, int, 3, []),
        fixture_rel(requires_property, 'REQ-old-only', 'F-HIST-A'),
        fixture_rel(requires_property, 'REQ-old-only', 'F-HIST-B'),
        first_answer_is_last(check_subject_key_identity(Violations)),
        findall(First-Facts-Polarity,
                member(violation(_, First, _, _, _, _{subjectKey: _, propertyKey: _, operator: _, polarity: Polarity, facts: Facts}),
                       Violations),
                Groups),
        Groups == ['F-A'-['F-A', 'F-B', 'F-BLANK-POLARITY']-require, 'F-SET-A'-['F-SET-A', 'F-SET-B']-require,
                   'F-TEXT-A'-['F-TEXT-A', 'F-TEXT-B']-require],
        Violations = [violation(Rule, 'F-A', Description, Suggestion, Source, Evidence)|_],
        Rule == 'subject-key-identity',
        Description == "3 active property_value facts state the same claim on kibi.check exit_code (operator eq, polarity require, same value) (F-A, F-B, F-BLANK-POLARITY), so one claim is minted as several facts",
        Suggestion == "Link every requirement to one shared fact and remove the duplicates (kb_delete) once nothing links them",
        Source == "facts/F-A.md",
        same(Evidence, _{subjectKey: 'kibi.check', propertyKey: exit_code, operator: eq, polarity: require,
                         facts: ['F-A', 'F-B', 'F-BLANK-POLARITY']})
    )).

test(signature_values) :-
    semantic_quality:signature_value('^^'("a", xsd), V1), V1 == a,
    semantic_quality:signature_value(literal(type(xsd, "b")), V2), V2 == b,
    semantic_quality:signature_value('^^'(literal(type(xsd, 3)), xsd), V3), V3 == 3,
    first_answer_is_last(semantic_quality:signature_value("c", V4)), V4 == c,
    first_answer_is_last(semantic_quality:signature_value('^^'(7, xsd), V5)), V5 == 7,
    first_answer_is_last(semantic_quality:signature_value(literal(type(xsd, x)), V6)), V6 == x,
    semantic_quality:signature_value([a], V7), V7 == [a].

test(nothing_to_report) :-
    with_fixture_kb((
        check_subject_key_identity(Violations),
        Violations == []
    )).

:- end_tests(semantic_quality_identity).

% --- subject-key-shape -------------------------------------------------------------

:- begin_tests(semantic_quality_shape).

test(subject_key_convention) :-
    forall(member(Key, ['kibi.cli', 'kibi.cli.check.staged', 'opencode.kibi_plugin.v1', 'a.b2', 'a.b_2', 'z.a0_9']),
           first_answer_is_last(valid_subject_key(Key))),
    forall(member(Key, [kibi, 'Kibi.cli', 'kibi..cli', 'kibi.cli_', 'kibi.cli__gc', 'kibi.2fa', 'kibi._a',
                        'kibi.cli-gc', 'kibi.cLi', 'kibi.{a', 'kibi.`a', 'kibi.a/b', 'kibi.a:b', "kibi.cli", 42, '.kibi']),
           \+ valid_subject_key(Key)).

test(clause_numbered_property_keys) :-
    forall(member(Key, [clause_01_refresh, contract_clause_2, a_clause_3_b_clause_x]),
           first_answer_is_last(semantic_quality:clause_numbered_property_key(Key))),
    forall(member(Key, [clause_count, clause, clause_, x_clause_2a, refresh_before, "clause_1", 7]),
           \+ semantic_quality:clause_numbered_property_key(Key)).

test(shape_violations) :-
    with_fixture_kb((
        sqx_subject('F-GOOD', "kibi.cli.gc"),
        sqx_entity(fact, 'F-FLAT', [fact_kind=subject, subject_key="kibi_plugin", source="facts/F-FLAT.md"]),
        sqx_property('F-CLAUSE', "kibi.cli", "clause_01_refresh", eq, bool, true, [source="facts/F-CLAUSE.md"]),
        sqx_property('F-NAMED', "kibi.cli", "refresh_before", eq, bool, true, []),
        cert_fixture:raw_entity(fact, 'F-OBS', [fact_kind=observation, property_key="note_clause_9"]),
        first_answer_is_last(check_subject_key_shape(Violations)),
        Violations == [
            violation('subject-key-shape', 'F-CLAUSE',
                      "Property key clause_01_refresh numbers a clause instead of naming a property",
                      "Rename the property key to the property the clause constrains (for example refresh_before_serving), reusing an existing property_key for the same subject when one fits",
                      "facts/F-CLAUSE.md"),
            violation('subject-key-shape', 'F-FLAT',
                      "Subject key kibi_plugin does not follow the component.aspect[.sub] convention",
                      "Rename the subject key to dotted component.aspect[.sub] with lowercase snake segments (for example kibi.cli.check.staged or opencode.kibi_plugin.guidance)",
                      "facts/F-FLAT.md"),
            violation('subject-key-shape', 'F-OBS',
                      "Property key note_clause_9 numbers a clause instead of naming a property",
                      "Rename the property key to the property the clause constrains (for example refresh_before_serving), reusing an existing property_key for the same subject when one fits",
                      "")
        ]
    )).

:- end_tests(semantic_quality_shape).

% --- ontology-quality --------------------------------------------------------------

:- begin_tests(semantic_quality_ontology, [cleanup(sqx_reset_settings)]).

sqx_reset_settings :-
    set_ontology_quality_overrides(default, default),
    unsetenv('KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO'),
    unsetenv('KIBI_ONTOLOGY_QUALITY_MIN_FACTS').

settings(Ratio, MinFacts) :-
    first_answer_is_last(ontology_quality_settings(Ratio0, MinFacts0)),
    Ratio = Ratio0,
    MinFacts = MinFacts0.

test(settings_overrides_and_environment, [cleanup(sqx_reset_settings)]) :-
    sqx_reset_settings,
    settings(R0, M0), R0 == 0.6, M0 == 8,
    setenv('KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO', '0.25'),
    setenv('KIBI_ONTOLOGY_QUALITY_MIN_FACTS', '3'),
    settings(R1, M1), R1 == 0.25, M1 == 3,
    set_ontology_quality_overrides(0.5, 4),
    settings(R2, M2), R2 == 0.5, M2 == 4,
    set_ontology_quality_overrides(1.5, 2.0),
    settings(R3, M3), R3 == 0.25, M3 == 3,
    set_ontology_quality_overrides(1, 1),
    settings(R4, M4), R4 == 1, M4 == 1,
    set_ontology_quality_overrides(0, default),
    settings(R5, M5), R5 == 0, M5 == 3,
    set_ontology_quality_overrides(-0.1, 0),
    settings(R6, M6), R6 == 0.25, M6 == 3,
    set_ontology_quality_overrides(default, default),
    setenv('KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO', 'lots'),
    setenv('KIBI_ONTOLOGY_QUALITY_MIN_FACTS', '0'),
    settings(R7, M7), R7 == 0.6, M7 == 8,
    setenv('KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO', '1.01'),
    setenv('KIBI_ONTOLOGY_QUALITY_MIN_FACTS', '2.5'),
    settings(R8, M8), R8 == 0.6, M8 == 8,
    set_ontology_quality_overrides(a, b),
    settings(R9, M9), R9 == 0.6, M9 == 8.

schema(Id, Name, ArgumentNames) :-
    length(ArgumentNames, Arity),
    maplist([_, atom]>>true, ArgumentNames, Types),
    sqx_entity(fact, Id, [fact_kind=predicate_schema, predicate_name=Name, predicate_arity=Arity,
                          argument_names=ArgumentNames, argument_types=Types, source="facts/schema.md"]).

facts(Prefix, Name, Count, ArgsOf) :-
    forall(between(1, Count, N),
           (   format(atom(Id), '~w-~w', [Prefix, N]),
               call(ArgsOf, N, Args),
               sqx_predicate(Id, Name, Args, [])
           )).

prose_args(N, [S, O, "shared"]) :- format(string(S), "subject_~w", [N]), format(string(O), "obligation_~w", [N]).
half_args(N, [A, B]) :- format(string(A), "a_~w", [N]), M is N mod 2, format(string(B), "b_~w", [M]).
pair_args(N, [A, "x"]) :- format(string(A), "v_~w", [N]).

test(prose_atoms_are_reported, [cleanup(sqx_reset_settings)]) :-
    sqx_reset_settings,
    with_fixture_kb((
        schema('F-SCHEMA-B', "catch_all", [subject, obligation, outcome]),
        schema('F-SCHEMA-A', "catch_all", [who, what, result]),
        schema('F-SCHEMA-WIDE', "catch_all", [one, two]),
        facts('F-CATCH', "catch_all", 8, prose_args),
        first_answer_is_last(check_ontology_quality(Violations)),
        Violations = [violation('ontology-quality', EntityId, Description, Suggestion, Source, Evidence)],
        EntityId == 'F-SCHEMA-A',
        Source == "facts/schema.md",
        Description == "Predicate catch_all/3: 67% of argument values across 8 facts occur in only one fact; prose-like arguments: who (8/8), what (8/8), so paraphrases will not converge",
        Suggestion == "Give the prose-like arguments of catch_all a small shared vocabulary: declare argument_constants on its predicate_schema, map existing spellings with argument_aliases, and let kibi migrate rewrite the facts; split the predicate when an argument has no natural vocabulary",
        Evidence = _{witnesses: [Witness]},
        Ratio is 16 / 24,
        same(Witness, _{kind: ontology_quality, predicateNamespace: default, predicateName: catch_all, arity: 3,
                        schemaIds: ['F-SCHEMA-A', 'F-SCHEMA-B'], factCount: 8, singletonRatio: Ratio,
                        threshold: 0.6, minFacts: 8,
                        positions: [_{argument: who, distinctValues: 8, singletonValues: 8},
                                    _{argument: what, distinctValues: 8, singletonValues: 8},
                                    _{argument: result, distinctValues: 1, singletonValues: 0}]})
    )).

test(thresholds_and_unschematized_predicates, [cleanup(sqx_reset_settings)]) :-
    sqx_reset_settings,
    with_fixture_kb((
        facts('F-HALF', "half", 6, half_args),
        facts('F-PAIR', "pair", 7, pair_args),
        cert_fixture:raw_entity(fact, 'F-EMPTY', [fact_kind=predicate, predicate_name="nullary", predicate_args=[]]),
        set_ontology_quality_overrides(0.5, 6),
        check_ontology_quality(Violations),
        Violations = [violation('ontology-quality', HalfId, HalfDescription, _, HalfSource, HalfEvidence),
                      violation('ontology-quality', PairId, PairDescription, _, PairSource, _)],
        HalfId == "default:half/2",
        HalfSource == "",
        HalfDescription == "Predicate half/2: 50% of argument values across 6 facts occur in only one fact; prose-like arguments: arg1 (6/6), so paraphrases will not converge",
        HalfEvidence = _{witnesses: [HalfWitness]},
        get_dict(schemaIds, HalfWitness, []),
        get_dict(positions, HalfWitness, [_{argument: arg1, distinctValues: 6, singletonValues: 6},
                                          _{argument: arg2, distinctValues: 2, singletonValues: 0}]),
        PairId == "default:pair/2",
        PairSource == "",
        PairDescription == "Predicate pair/2: 50% of argument values across 7 facts occur in only one fact; prose-like arguments: arg1 (7/7), so paraphrases will not converge",
        % Just over the ratio, and one fact short, no report.
        set_ontology_quality_overrides(0.51, 6),
        check_ontology_quality([]),
        set_ontology_quality_overrides(0.5, 8),
        check_ontology_quality([])
    )).

mix_args(1, ["x", "y", "c1"]).
mix_args(2, ["x", "y", "c2"]).
mix_args(3, ["a3", "y", "c3"]).
mix_args(4, ["a4", "b4", "c4"]).

% Only arguments whose own share reaches the threshold are named: arg1 at
% exactly 2 of 4, arg3 above it, never arg2 at 1 of 4.
test(prose_arguments_at_the_threshold, [cleanup(sqx_reset_settings)]) :-
    sqx_reset_settings,
    with_fixture_kb((
        facts('F-MIX', "mix", 4, mix_args),
        set_ontology_quality_overrides(0.5, 4),
        check_ontology_quality([violation(_, _, Description, _, _, _)]),
        Description == "Predicate mix/3: 58% of argument values across 4 facts occur in only one fact; prose-like arguments: arg1 (2/4), arg3 (4/4), so paraphrases will not converge"
    )).

:- end_tests(semantic_quality_ontology).

% --- vocabulary reads ----------------------------------------------------------------

:- begin_tests(semantic_quality_vocabulary).

rows(Json, Rows) :-
    string(Json),
    \+ sub_string(Json, _, _, _, "\n"),
    atom_json_dict(Json, Rows, [value_string_as(string)]).

test(subject_vocabulary) :-
    with_fixture_kb((
        sqx_req('REQ-cli-gc'),
        sqx_entity(req, 'REQ-b', [status=open, title="B title"]),
        sqx_entity(req, 'REQ-a', [status=in_progress, title="A title"]),
        sqx_entity(req, 'REQ-old', [status=deprecated, title="Old"]),
        sqx_entity(fact, 'F-ZETA', [fact_kind=subject, subject_key="zeta.one", title="Zeta"]),
        sqx_entity(fact, 'F-REQ', [fact_kind=subject, subject_key="req.cli_gc", title="Derived"]),
        sqx_entity(fact, 'F-ALPHA', [fact_kind=subject, subject_key="alpha.one", title="Alpha"]),
        sqx_entity(fact, 'F-NOBODY', [fact_kind=subject, subject_key="req.nobody", title="Nobody"]),
        sqx_property('F-PROP', "alpha.one", "p", eq, int, 1, []),
        fixture_rel(constrains, 'REQ-b', 'F-ALPHA'),
        fixture_rel(constrains, 'REQ-a', 'F-ALPHA'),
        fixture_rel(constrains, 'REQ-old', 'F-ALPHA'),
        first_answer_is_last(subject_vocabulary_json(Json)),
        rows(Json, Rows),
        same(Rows, [_{factId: "F-ALPHA", subjectKey: "alpha.one", title: "Alpha", reqDerived: false,
                      requirements: [_{id: "REQ-a", title: "A title"}, _{id: "REQ-b", title: "B title"}]},
                    _{factId: "F-REQ", subjectKey: "req.cli_gc", title: "Derived", reqDerived: true, requirements: []},
                    _{factId: "F-NOBODY", subjectKey: "req.nobody", title: "Nobody", reqDerived: false, requirements: []},
                    _{factId: "F-ZETA", subjectKey: "zeta.one", title: "Zeta", reqDerived: false, requirements: []}])
    )).

test(subject_claims) :-
    with_fixture_kb((
        sqx_entity(req, 'REQ-b', [status=open]),
        sqx_entity(req, 'REQ-a', [status=open]),
        sqx_entity(req, 'REQ-old', [status=deprecated]),
        sqx_subject('F-SUBJ', "web.upload"),
        sqx_property('F-Z', "web.upload", "size", lte, int, 2, [unit="MB", title="Size cap", claim_key="C", claim_text="at most 2 MB"]),
        sqx_property('F-A', "web.upload", "exe", eq, bool, false, []),
        sqx_property('F-ELSE', "web.download", "exe", eq, bool, false, []),
        sqx_property('F-THIRD', "api.rate", "rps", lte, int, 5, []),
        fixture_rel(requires_property, 'REQ-b', 'F-Z'),
        fixture_rel(requires_property, 'REQ-a', 'F-Z'),
        fixture_rel(requires_property, 'REQ-old', 'F-Z'),
        first_answer_is_last(subject_claims_json(["web.upload", 'web.upload', "api.rate", "none.here"], Json)),
        rows(Json, Rows),
        same(Rows, [_{factId: "F-A", subjectKey: "web.upload", propertyKey: "exe",
                      signature: "property('web.upload',exe,eq,bool,false,'','',require)",
                      claimText: "", title: "Fixture entity", requirements: []},
                    _{factId: "F-THIRD", subjectKey: "api.rate", propertyKey: "rps",
                      signature: "property('api.rate',rps,lte,int,5,'','',require)",
                      claimText: "", title: "Fixture entity", requirements: []},
                    _{factId: "F-Z", subjectKey: "web.upload", propertyKey: "size",
                      signature: "property('web.upload',size,lte,int,2000000,byte,'',require)",
                      claimText: "at most 2 MB", title: "Size cap", requirements: ["REQ-a", "REQ-b"]}]),
        subject_claims_json([], Empty),
        Empty == "[]"
    )).

test(raw_text_forms) :-
    forall(member(Raw-Text, ['^^'("a", xsd)-"a", literal(type(xsd, b))-"b", literal(c)-"c", "d"-"d", e-"e", 'E f'-"E f", 12-"12",
                             f(x)-"f(x)", '^^'(literal("g"), xsd)-"g"]),
           (   first_answer_is_last(semantic_quality:raw_text(Raw, Text0)),
               Text0 == Text
           )).

test(entity_text_of_missing_entities) :-
    with_fixture_kb((
        semantic_quality:entity_text('NOPE', req, source, Missing),
        Missing == "",
        sqx_req('REQ-x'),
        semantic_quality:entity_text('REQ-x', req, claim_text, Absent),
        Absent == ""
    )).

:- end_tests(semantic_quality_vocabulary).
