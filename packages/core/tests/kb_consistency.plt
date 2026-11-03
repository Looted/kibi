:- use_module(library(plunit)).
:- use_module(library(http/json)).
:- use_module(library(semweb/rdf_db)).
:- use_module('../src/kb.pl').
:- use_module('../src/kb_consistency.pl').
:- use_module('../src/certificates.pl', [kb_certificates/1]).
:- use_module('../src/certificate_check.pl', [verify_certificates/2]).
:- use_module(kb_fixture).
:- use_module(cert_fixture).
:- use_module(test_helpers).

% The two rules run on KBs that hold contradictions of every kind and
% contexts the checker cannot compare; the text helpers run on hand-built
% checker entries.

consistency_fixture :-
    cert_property('FACT-J1', 'REQ-J1', "seat.count", "free", gte, int, 0, []),
    cert_property('FACT-J2', 'REQ-J2', "seat.count", "free", lte, int, 1, []),
    cert_property('FACT-J3', 'REQ-J3', "seat.count", "free", neq, int, 0, []),
    cert_property('FACT-J4', 'REQ-J4', "seat.count", "free", neq, int, 1, []),
    cert_property('FACT-EU-MIN', 'REQ-EU-MIN', "eu.seat", "free", gte, int, 2, [scope="eu"]),
    cert_property('FACT-EU-MAX', 'REQ-EU-MAX', "eu.seat", "free", lte, int, 1, [scope="eu"]),
    cert_property('FACT-OK-MIN', 'REQ-OK-MIN', "api.quota", "rate_limit", gte, int, 1, []),
    cert_property('FACT-OK-MAX', 'REQ-OK-MAX', "api.quota", "rate_limit", lte, int, 10, []),
    cert_property('FACT-OLD', 'REQ-OLD', "plan.price", "monthly", eq, int, 10, [valid_to="2025-12-31T00:00:00Z"]),
    cert_property('FACT-NEW', 'REQ-NEW', "plan.price", "monthly", eq, int, 12, [valid_from="2026-01-01T00:00:00Z"]),
    cert_property('FACT-GB', 'REQ-GB', "plan.storage", "quota", lte, int, 10, [unit="GB"]),
    cert_property('FACT-SEATS', 'REQ-SEATS', "plan.storage", "quota", gte, int, 2, [unit="seat"]),
    cert_property('FACT-BACKUP', 'REQ-BACKUP', "plan.storage", "backup", eq, int, 1, []),
    cert_predicate('FACT-READ-ALLOW', 'REQ-READ-ALLOW', ["coach", "read", "request", "allow"], assert),
    cert_predicate('FACT-READ-DENIED', 'REQ-READ-DENIED', ["coach", "read", "request", "allow"], deny),
    cert_predicate('FACT-EDIT-MAYBE', 'REQ-EDIT-MAYBE', ["coach", "edit", "request", "maybe"], assert),
    cert_rule('FACT-RULE-P', p, not(q)),
    cert_rule('FACT-RULE-Q', q, p).

suggest(Requirements, Text) :-
    format(string(Text),
        "Supersede or change one of ~w so the facts can hold together; kibi check --write-certificates <file> saves the certificate",
        [Requirements]).

unresolved_suggestion("Align the facts' value_type, unit, operator or polarity so they can be compared, or accept that this context stays unchecked").

rejected_suggestion("Kibi produced a certificate its own checker rejects. Report it with the bundle from kibi check --write-certificates <file>").

% The violations without their certificate details, and those details
% (none for a rejection, which carries no certificate).
split_violations(Violations, Heads, Details) :-
    maplist(split_violation, Violations, Heads, Details).

split_violation(violation(R, E, D, S, X, C), violation(R, E, D, S, X), C).
split_violation(violation(R, E, D, S, X), violation(R, E, D, S, X), none).

expected_contradictions([
    violation('kb-consistency', "",
        "Stored rules are not stratified: a predicate depends on its own negation (default:p/0 depends on not default:q/0; default:q/0 depends on default:p/0)",
        "Break the cycle: change one rule so no predicate depends on its own negation, or supersede the requirement that stores it",
        ""),
    violation('kb-consistency', "REQ-EU-MAX/REQ-EU-MIN",
        "Facts FACT-EU-MAX, FACT-EU-MIN cannot all hold for eu.seat.free (scope eu): no value satisfies them together, and dropping any one leaves a value (FACT-EU-MAX: 2, FACT-EU-MIN: 0)",
        EuSuggestion, ""),
    violation('kb-consistency', "REQ-J1/REQ-J2/REQ-J3/REQ-J4",
        "Facts FACT-J1, FACT-J2, FACT-J3, FACT-J4 cannot all hold for seat.count.free: no value satisfies them together, and dropping any one leaves a value (FACT-J1: -1, FACT-J2: 2, FACT-J3: 0, FACT-J4: 1)",
        JSuggestion, ""),
    violation('kb-consistency', "REQ-READ-ALLOW/REQ-READ-DENIED",
        "Facts FACT-READ-ALLOW and FACT-READ-DENIED decide default:permission_rule/4 for (coach, read, request) differently: one allows it and the other denies it",
        ReadSuggestion, ""),
    violation('kb-consistency', "REQ-READ-ALLOW/REQ-READ-DENIED",
        "Facts FACT-READ-ALLOW and FACT-READ-DENIED give default:permission_rule(coach, read, request, allow) opposite truth values",
        ReadSuggestion, "")
]) :-
    suggest("REQ-EU-MAX, REQ-EU-MIN", EuSuggestion),
    suggest("REQ-J1, REQ-J2, REQ-J3, REQ-J4", JSuggestion),
    suggest("REQ-READ-ALLOW, REQ-READ-DENIED", ReadSuggestion).

expected_details([
    _{certificate: _{kind: "rule_negation_cycle", cycle: [
        _{head: _{namespace: "default", name: "p", arity: 0}, body: _{namespace: "default", name: "q", arity: 0}, sign: "negative"},
        _{head: _{namespace: "default", name: "q", arity: 0}, body: _{namespace: "default", name: "p", arity: 0}, sign: "positive"}]}},
    _{certificate: _{kind: "property_contradiction", subjectKey: "eu.seat", propertyKey: "free", scope: "eu", domain: "int",
        core: ["FACT-EU-MAX", "FACT-EU-MIN"],
        dropModels: [_{factId: "FACT-EU-MAX", value: 2}, _{factId: "FACT-EU-MIN", value: 0}]}},
    _{certificate: _{kind: "property_contradiction", subjectKey: "seat.count", propertyKey: "free", scope: "", domain: "int",
        core: ["FACT-J1", "FACT-J2", "FACT-J3", "FACT-J4"],
        dropModels: [_{factId: "FACT-J1", value: -1}, _{factId: "FACT-J2", value: 2},
                     _{factId: "FACT-J3", value: 0}, _{factId: "FACT-J4", value: 1}]}},
    _{certificate: _{kind: "decision_contradiction", namespace: "default", name: "permission_rule", arity: 4,
        key: ["coach", "read", "request"], core: ["FACT-READ-ALLOW", "FACT-READ-DENIED"]}},
    _{certificate: _{kind: "predicate_contradiction", namespace: "default", name: "permission_rule",
        args: ["coach", "read", "request", "allow"], core: ["FACT-READ-ALLOW", "FACT-READ-DENIED"]}}
]).

expected_unresolved([
    violation('kb-consistency-unresolved', "REQ-GB/REQ-SEATS",
        "Kibi cannot decide whether the facts for plan.storage.quota hold together: the facts use different units. It never counts as consistent",
        Suggestion, ""),
    violation('kb-consistency-unresolved', "REQ-NEW/REQ-OLD",
        "Kibi cannot decide whether the facts for plan.price.monthly hold together: the contradicting facts' validity windows never overlap. It never counts as consistent",
        Suggestion, ""),
    violation('kb-consistency-unresolved', "default:permission_rule/4 for (coach, edit, request)",
        "Kibi cannot decide whether the facts for default:permission_rule/4 for (coach, edit, request) hold together: a decision is neither allow nor deny. It never counts as consistent",
        Suggestion, "")
]) :-
    unresolved_suggestion(Suggestion).

% The bundle as the rules read it, and the checker's report on it.
verification(Bundle, Report) :-
    kb_certificates(Produced),
    atom_json_dict(Json, Produced, []),
    atom_json_dict(Json, Bundle, [value_string_as(string)]),
    verify_certificates(Bundle, Report).

current_key(Key) :-
    kb:index_verification_key(kb_consistency, Key).

plant_memo(Key, Bundle, Report) :-
    retractall(kb:kb_consistency_memo(_, _, _)),
    assertz(kb:kb_consistency_memo(Key, Bundle, Report)).

rejection_report(Rejected, _{version: 'kibi.verification.v1', status: rejected, certificates: 0, verified: 0,
                             theorems: [], notCovered: [], rejected: Rejected}).

:- begin_tests(kb_consistency_rules, [setup(detach_leftover_kb), cleanup(retractall(kb:kb_consistency_memo(_, _, _)))]).

test(an_empty_kb_is_consistent) :-
    with_fixture_kb((
        first_answer_is_last(check_kb_consistency(Violations)),
        first_answer_is_last(check_kb_consistency_unresolved(Unresolved))
    )),
    Violations == [],
    Unresolved == [].

test(each_reverified_contradiction_is_a_violation) :-
    with_fixture_kb((
        consistency_fixture,
        first_answer_is_last(check_kb_consistency(Violations))
    )),
    split_violations(Violations, Heads, Details),
    expected_contradictions(Expected),
    Heads == Expected,
    expected_details(ExpectedDetails),
    same(Details, ExpectedDetails).

test(each_context_the_checker_cannot_compare_is_unresolved) :-
    with_fixture_kb((
        consistency_fixture,
        first_answer_is_last(check_kb_consistency_unresolved(Violations))
    )),
    expected_unresolved(Expected),
    Violations == Expected.

% A requirement that is no longer current is not named, though it still
% links the fact.
test(a_superseded_requirement_is_not_named) :-
    with_fixture_kb((
        consistency_fixture,
        fixture_entity(req, 'REQ-J0', [status=superseded]),
        fixture_rel(requires_property, 'REQ-J0', 'FACT-J1'),
        first_answer_is_last(check_kb_consistency(Violations))
    )),
    split_violations(Violations, Heads, _),
    expected_contradictions(Expected),
    Heads == Expected.

% An unresolved context lists only the facts its current requirements
% place on it: a fact reached through a superseded requirement adds none of
% the requirements that name it elsewhere.
test(an_unresolved_context_skips_facts_of_superseded_requirements) :-
    with_fixture_kb((
        consistency_fixture,
        cert_property('FACT-STALE', 'REQ-STALE', "plan.storage", "quota", lte, int, 5, [unit="GB"]),
        fixture_entity(req, 'REQ-STALE', [status=superseded]),
        fixture_entity(req, 'REQ-ELSEWHERE', [status=open]),
        fixture_rel(requires_property, 'REQ-ELSEWHERE', 'FACT-STALE'),
        first_answer_is_last(check_kb_consistency_unresolved(Violations))
    )),
    expected_unresolved(Expected),
    Violations == Expected.

:- end_tests(kb_consistency_rules).

:- begin_tests(kb_consistency_verification, [setup(detach_leftover_kb), cleanup(retractall(kb:kb_consistency_memo(_, _, _)))]).

test(the_verification_is_remembered_for_the_kb_generation) :-
    with_fixture_kb((
        consistency_fixture,
        retractall(kb:kb_consistency_memo(_, _, _)),
        check_kb_consistency(_),
        current_key(Key),
        findall(K, kb:kb_consistency_memo(K, _, _), Keys),
        verification(Bundle, Report),
        kb:kb_consistency_memo(Key, MemoBundle, MemoReport)
    )),
    Keys == [Key],
    same(MemoBundle, Bundle),
    same(MemoReport, Report).

test(a_remembered_verification_is_reused) :-
    with_fixture_kb((
        consistency_fixture,
        current_key(Key),
        rejection_report([_{certificate: 0, kind: missing, reason: "planted", group: _{key: [a], namespace: n, name: d, arity: 1}}], Report),
        plant_memo(Key, _{version: "kibi.certificates.v1", certificates: []}, Report),
        first_answer_is_last(check_kb_consistency(Violations)),
        first_answer_is_last(check_kb_consistency_unresolved(Unresolved))
    )),
    rejected_suggestion(Suggestion),
    Violations == [violation('kb-consistency', "kb-certificates",
        "The independent checker rejected n:d/1 for (a): planted", Suggestion, "")],
    Unresolved == [].

test(a_verification_for_another_generation_is_replaced) :-
    with_fixture_kb((
        consistency_fixture,
        rejection_report([], Report),
        plant_memo(stale, _{version: "kibi.certificates.v1", certificates: []}, Report),
        check_kb_consistency(Violations),
        current_key(Key),
        findall(K, kb:kb_consistency_memo(K, _, _), Keys)
    )),
    Keys == [Key],
    length(Violations, 5).

test(a_transaction_never_reads_or_writes_the_memo) :-
    with_fixture_kb((
        consistency_fixture,
        current_key(Key),
        rejection_report([], Report),
        plant_memo(Key, _{version: "kibi.certificates.v1", certificates: []}, Report),
        rdf_transaction(check_kb_consistency(Violations)),
        retractall(kb:kb_consistency_memo(_, _, _)),
        rdf_transaction(check_kb_consistency(_)),
        findall(K, kb:kb_consistency_memo(K, _, _), Keys)
    )),
    length(Violations, 5),
    Keys == [].

% A certificate the checker rejects is reported in place of its finding.
test(a_rejected_certificate_replaces_its_contradiction) :-
    with_fixture_kb((
        consistency_fixture,
        verification(Bundle, _),
        Certificates = Bundle.certificates,
        nth1(Index, Certificates, Tampered0),
        get_dict(kind, Tampered0, "predicate_contradiction"),
        !,
        Tampered = Tampered0.put(core, ["FACT-READ-ALLOW", "FACT-EDIT-MAYBE"]),
        nth1(Index, Certificates, _, Rest),
        nth1(Index, TamperedCertificates, Tampered, Rest),
        TamperedBundle = Bundle.put(certificates, TamperedCertificates),
        verify_certificates(TamperedBundle, Report),
        current_key(Key),
        plant_memo(Key, TamperedBundle, Report),
        first_answer_is_last(check_kb_consistency(Violations))
    )),
    split_violations(Violations, Heads, _),
    expected_contradictions(Expected),
    exclude([violation(_, _, Text, _, _)]>>sub_string(Text, _, _, _, "opposite truth values"), Expected, Kept),
    format(string(Rejection), "The independent checker rejected certificate ~w (predicate_contradiction): ", [Index]),
    Heads = [violation('kb-consistency', "kb-certificates", Description, Suggestion, "")|Kept],
    rejected_suggestion(Suggestion),
    sub_string(Description, 0, _, _, Rejection).

:- end_tests(kb_consistency_verification).

:- begin_tests(kb_consistency_text).

test(a_rejection_names_its_group_or_its_certificate) :-
    rejected_suggestion(Suggestion),
    kb_consistency:rejected_violation(_{certificate: 0, kind: missing, reason: "no certificate for this group",
                                         group: _{subjectKey: s, propertyKey: p, scope: ''}}, Group),
    Group == violation('kb-consistency', "kb-certificates",
        "The independent checker rejected s.p: no certificate for this group", Suggestion, ""),
    kb_consistency:rejected_violation(_{certificate: 3, kind: rule_strata, reason: "bad"}, Certificate),
    Certificate == violation('kb-consistency', "kb-certificates",
        "The independent checker rejected certificate 3 (rule_strata): bad", Suggestion, "").

test(group_text_reads_each_group_shape) :-
    kb_consistency:group_text(_{subjectKey: s, propertyKey: p}, NoScope),
    NoScope == "s.p",
    kb_consistency:group_text(_{subjectKey: s, propertyKey: p, scope: eu}, Scope),
    Scope == "s.p (scope eu)",
    kb_consistency:group_text(_{namespace: n, name: f, args: [a, b]}, Atom),
    Atom == "n:f(a, b)",
    kb_consistency:group_text(_{namespace: n, name: d, arity: 2, key: [a]}, Decision),
    Decision == "n:d/2 for (a)",
    kb_consistency:group_text(group{name: f}, Other),
    Other == "group{name:f}".

test(an_unresolved_group_without_facts_is_named_by_its_text) :-
    unresolved_suggestion(Suggestion),
    kb_consistency:unresolved_violation(predicates_consistent,
        _{namespace: n, name: f, args: [a], reason: "a fact has a polarity other than assert or deny"}, Violation),
    Violation == violation('kb-consistency-unresolved', "n:f(a)",
        "Kibi cannot decide whether the facts for n:f(a) hold together: a fact has a polarity other than assert or deny. It never counts as consistent",
        Suggestion, "").

test(an_entity_label_prefers_requirements_then_facts) :-
    kb_consistency:entity_label([], [], Empty),
    Empty == "",
    kb_consistency:entity_label([], ["F-A", "F-B"], Facts),
    Facts == "F-A/F-B",
    kb_consistency:entity_label(['REQ-A', 'REQ-B'], ["F-A"], Requirements),
    Requirements == "REQ-A/REQ-B".

:- end_tests(kb_consistency_text).
