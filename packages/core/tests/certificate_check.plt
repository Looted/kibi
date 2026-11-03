:- use_module(library(plunit)).
:- use_module(library(http/json)).
:- use_module(library(filesex)).
:- use_module('../src/certificate_check.pl').
:- use_module(kb_fixture).
:- use_module(cert_fixture).
:- use_module(test_helpers).

% The checker reads the KB through kb.pl and re-checks certificates written
% as JSON reads them: text as strings. The KB-side tests build facts with
% cert_fixture; the bundle tests hand-write the certificates.

cchk_m(Fact, Op, Bound, m(Fact, Op, Bound, '', '')).

cchk_t(Fact, Op, Type, Value, Fact-tuple(s, p, Op, Type, Value, '', '', require, '', '')).

cchk_bundle(Certificates, _{version: "kibi.certificates.v1", certificates: Certificates}).

cchk_verify(Certificates, Report) :-
    cchk_bundle(Certificates, Bundle),
    first_answer_is_last(verify_certificates(Bundle, Report)).

cchk_theorem(Report, Name, Theorem) :-
    member(Theorem, Report.theorems),
    get_dict(theorem, Theorem, Name),
    !.

cchk_empty_theorem(Name, _{theorem: Name, verdict: proved, groups: 0, models: 0, contradictions: [], unresolved: []}).

cchk_empty_rules(_{theorem: rules_stratified, verdict: proved, predicates: 0, edges: 0}).

cchk_report(Status, Count, Verified, Rejected, Theorems,
       _{version: 'kibi.verification.v1', status: Status, certificates: Count, verified: Verified,
         rejected: Rejected, theorems: Theorems, notCovered: [rule_conflicts, scenario_feasibility]}).

% --- contexts from the KB -------------------------------------------------

:- begin_tests(certificate_check_contexts).

test(empty_kb_has_no_contexts) :-
    with_fixture_kb((
        first_answer_is_last(certificate_property_contexts(Contexts)),
        first_answer_is_last(certificate_predicate_groups(Groups)),
        first_answer_is_last(certificate_decision_groups(Decisions)),
        first_answer_is_last(certificate_rule_edges(Edges))
    )),
    Contexts == [], Groups == [], Decisions == [], Edges == [].

test(scopes_and_forbid) :-
    with_fixture_kb((
        cert_property('FACT-MIN', 'REQ-MIN', "api.quota", "rate_limit", gte, int, 1, []),
        cert_property('FACT-EU', 'REQ-EU', "api.quota", "rate_limit", lte, int, 10, [scope="eu"]),
        cert_property('FACT-US', 'REQ-US', "api.quota", "rate_limit", lte, int, 20, [scope="us"]),
        cert_property('FACT-ONLY', 'REQ-ONLY', "api.burst", "size", lte, int, 5, [scope="eu"]),
        cert_property('FACT-F', 'REQ-F', "plan.storage", "quota", gte, number, 2.5, [polarity=forbid]),
        cert_property('FACT-S', 'REQ-S', "plan.name", "label", eq, string, "pro", [valid_from="2026-01-01T00:00:00Z"]),
        certificate_property_contexts(Contexts)
    )),
    Contexts == [
        context('api.burst', size, eu, int, [m('FACT-ONLY', lte, 5, '', '')]),
        context('api.quota', rate_limit, '', int, [m('FACT-MIN', gte, 1, '', '')]),
        context('api.quota', rate_limit, eu, int, [m('FACT-EU', lte, 10, '', ''), m('FACT-MIN', gte, 1, '', '')]),
        context('api.quota', rate_limit, us, int, [m('FACT-MIN', gte, 1, '', ''), m('FACT-US', lte, 20, '', '')]),
        context('plan.name', label, '', string, [m('FACT-S', eq, "pro", '2026-01-01T00:00:00Z', '')]),
        context('plan.storage', quota, '', number, [m('FACT-F', lt, 2.5, '', '')])
    ].

test(unresolved_contexts_from_the_kb) :-
    with_fixture_kb((
        cert_property('FACT-GB', 'REQ-GB', "plan.storage", "quota", lte, int, 10, [unit="GB"]),
        cert_property('FACT-SEATS', 'REQ-SEATS', "plan.storage", "quota", gte, int, 2, [unit="seat"]),
        cert_property('FACT-I', 'REQ-I', "plan.mixed", "v", eq, int, 1, []),
        cert_property('FACT-T', 'REQ-T', "plan.mixed", "v", eq, string, "one", []),
        cert_property('FACT-LT', 'REQ-LT', "plan.name", "label", lt, string, "pro", []),
        certificate_property_contexts(Contexts)
    )),
    Contexts == [
        unresolved('plan.mixed', v, '', "the facts use different value types"),
        unresolved('plan.name', label, '', "only eq and neq compare non-numeric values"),
        unresolved('plan.storage', quota, '', "the facts use different units")
    ].

% A requirement that is no longer current constrains nothing.
retire(ReqId) :-
    fixture_entity(req, ReqId, [status=deprecated]).

test(only_current_requirements_count) :-
    with_fixture_kb((
        cert_property('FACT-MIN', 'REQ-MIN', "api.quota", "rate_limit", gte, int, 1, []),
        cert_property('FACT-OLD', 'REQ-OLD', "api.quota", "rate_limit", lte, int, 0, []),
        retire('REQ-OLD'),
        cert_predicate('FACT-A', 'REQ-A', ["coach", "read", "request", "allow"], assert),
        cert_predicate('FACT-B', 'REQ-B', ["coach", "read", "request", "allow"], deny),
        retire('REQ-B'),
        certificate_property_contexts(Contexts),
        certificate_predicate_groups(Groups),
        certificate_decision_groups(Decisions)
    )),
    Contexts == [context('api.quota', rate_limit, '', int, [m('FACT-MIN', gte, 1, '', '')])],
    Groups = [group(_, GroupMembers)],
    GroupMembers == [p('FACT-A', true)],
    Decisions = [group(_, DecisionMembers)],
    DecisionMembers == [p('FACT-A', allow)].

% A fact stored past the write checks, with a polarity no check accepts.
raw_predicate(FactId, ReqId, Args, Polarity) :-
    atomic_list_concat(Args, ',', ArgsText),
    format(string(Key), "permission_rule(~w)", [ArgsText]),
    cert_fixture:raw_entity(fact, FactId, [title="Raw predicate", status=active, fact_kind=predicate,
                                           predicate_name="permission_rule", predicate_namespace="default",
                                           predicate_args=Args, polarity=Polarity, canonical_key=Key]),
    fixture_entity(req, ReqId, [status=open]),
    fixture_rel(requires_predicate, ReqId, FactId).

test(predicate_group_with_an_unknown_polarity) :-
    with_fixture_kb((
        cert_predicate('FACT-A', 'REQ-A', ["coach", "read", "request", "allow"], assert),
        raw_predicate('FACT-M', 'REQ-M', ["coach", "read", "request", "allow"], maybe),
        certificate_predicate_groups(Groups)
    )),
    Groups = [unresolved(Label, Reason)],
    same(Label, _{namespace: default, name: permission_rule, args: [coach, read, request, allow]}),
    Reason == "a fact has a polarity other than assert or deny".

test(decision_needs_the_signature_arity) :-
    with_fixture_kb((
        cert_predicate('FACT-A', 'REQ-A', ["coach", "read", "request", "allow", "extra"], assert),
        certificate_decision_groups(Decisions)
    )),
    Decisions == [].

test(rule_ir_on_another_fact_kind_is_no_rule) :-
    with_fixture_kb((
        cert_rule('FACT-RULE-P', p, q),
        atom_json_dict(Json, _{version: 'kibi.logic.v1', kind: rule, modality: assert,
                               head: _{kind: atom, name: s, args: []}, body: _{kind: atom, name: t, args: []},
                               variables: []}, []),
        cert_fixture:raw_entity(fact, 'FACT-OBS', [title="Observation", status=active, fact_kind=observation, rule_ir=Json]),
        certificate_rule_edges(Edges)
    )),
    Edges == [edge(predicate(default, p, 0), predicate(default, q, 0), positive)].

test(mixed_int_and_number_compare_as_number) :-
    with_fixture_kb((
        cert_property('FACT-I', 'REQ-I', "plan.size", "v", gte, int, 1, []),
        cert_property('FACT-N', 'REQ-N', "plan.size", "v", lte, number, 2.5, []),
        certificate_property_contexts(Contexts)
    )),
    Contexts == [context('plan.size', v, '', number, [m('FACT-I', gte, 1, '', ''), m('FACT-N', lte, 2.5, '', '')])].

test(predicate_groups) :-
    with_fixture_kb((
        cert_predicate('FACT-A', 'REQ-A', ["coach", "read", "request", "allow"], assert),
        cert_predicate('FACT-B', 'REQ-B', ["coach", "read", "request", "allow"], deny),
        cert_predicate('FACT-C', 'REQ-C', ["coach", "write", "request", "maybe"], assert),
        certificate_predicate_groups(Groups),
        certificate_decision_groups(Decisions)
    )),
    Groups = [group(L1, M1), group(L2, M2)],
    same(L1, _{namespace: default, name: permission_rule, args: [coach, read, request, allow]}),
    M1 == [p('FACT-A', true), p('FACT-B', false)],
    same(L2, _{namespace: default, name: permission_rule, args: [coach, write, request, maybe]}),
    M2 == [p('FACT-C', true)],
    Decisions = [group(L3, M3), unresolved(L4, Reason)],
    same(L3, _{namespace: default, name: permission_rule, arity: 4, key: [coach, read, request]}),
    M3 == [p('FACT-A', allow), p('FACT-B', deny)],
    same(L4, _{namespace: default, name: permission_rule, arity: 4, key: [coach, write, request]}),
    Reason == "a decision is neither allow nor deny".

test(rule_edges) :-
    with_fixture_kb((
        cert_rule('FACT-RULE-P', p, not(q)),
        cert_rule('FACT-RULE-Q', q, r),
        fixture_entity(fact, 'FACT-OTHER', [fact_kind=subject, subject_key="x"]),
        certificate_rule_edges(Edges)
    )),
    Edges == [edge(predicate(default, p, 0), predicate(default, q, 0), negative),
              edge(predicate(default, q, 0), predicate(default, r, 0), positive)].

test(body_dependencies) :-
    A = atom(default, a, [x], 0, 0),
    B = atom(default, b, [], 0, 0),
    findall(Atom-Sign, certificate_check:body_dependency(all([A, not(B), any([count(B, ge, 1)])]), Atom, Sign), Deps),
    Deps == [A-positive, B-negative, B-positive],
    findall(Atom-Sign, certificate_check:body_dependency(any([A, B]), Atom, Sign), Any),
    Any == [A-positive, B-positive],
    \+ certificate_check:body_dependency(atom(default, a, [], 0), _, _),
    \+ certificate_check:body_dependency(true, _, _).

:- end_tests(certificate_check_contexts).

% --- context domains --------------------------------------------------------

:- begin_tests(certificate_check_domains).

domain(Tuples, Domain, Reason) :-
    first_answer_is_last(certificate_check:context_domain(Tuples, Domain, Reason)).

test(numeric_domains) :-
    cchk_t(a, gte, int, 1, A), cchk_t(b, lte, number, 2.5, B),
    domain([A], D1, R1), D1-R1 == int-none,
    domain([A, B], D2, R2), D2-R2 == number-none,
    domain([B], D3, R3), D3-R3 == number-none.

test(numeric_reasons) :-
    cchk_t(a, gte, int, 1, A),
    forall(member(Op, [eq, neq, lt, lte, gt, gte]),
           ( cchk_t(b, Op, int, 2, B), domain([A, B], int, none) )),
    cchk_t(c, matches, int, 1, C),
    domain([A, C], int, R1),
    R1 == "a fact has an unsupported operator or a non-numeric value",
    cchk_t(d, eq, int, "1", D),
    domain([A, D], int, R2),
    R2 == "a fact has an unsupported operator or a non-numeric value".

test(units) :-
    A = a-tuple(s, p, gte, int, 1, 'GB', '', require, '', ''),
    B = b-tuple(s, p, lte, int, 2, 'GB', '', require, '', ''),
    C = c-tuple(s, p, lte, int, 2, '', '', require, '', ''),
    D = d-tuple(s, p, lte, int, 2, seat, '', require, '', ''),
    domain([A, B, C], int, none),
    domain([A, D], int, Reason),
    Reason == "the facts use different units".

test(polarity) :-
    A = a-tuple(s, p, gte, int, 1, '', '', forbid, '', ''),
    B = b-tuple(s, p, gte, int, 1, '', '', assert, '', ''),
    domain([A], int, none),
    domain([A, B], Domain, Reason),
    Domain-Reason == none-"a fact has a polarity other than require or forbid".

test(scalars) :-
    cchk_t(a, eq, bool, true, A), cchk_t(b, neq, bool, false, B), cchk_t(c, lt, bool, true, C),
    domain([A, B], D1, R1), D1-R1 == bool-none,
    domain([A, C], D2, R2), D2-R2 == bool-"only eq and neq compare non-numeric values",
    cchk_t(d, eq, string, "x", D), cchk_t(e, neq, string, "y", E), cchk_t(f, gte, string, "z", F),
    domain([D, E], D3, R3), D3-R3 == string-none,
    domain([F], D4, R4), D4-R4 == string-"only eq and neq compare non-numeric values".

test(sets) :-
    forall(member(Op, [eq, neq, includes, subset_of, excludes]),
           ( cchk_t(a, Op, set, [x], A), domain([A], set, none) )),
    cchk_t(b, lt, set, [x], B),
    domain([B], set, R1),
    R1 == "only eq, neq and a required includes, subset_of or excludes compare set values",
    forall(member(Op, [includes, subset_of, excludes]),
           ( F = f-tuple(s, p, Op, set, [x], '', '', forbid, '', ''),
             domain([F], set, R2),
             R2 == "only eq, neq and a required includes, subset_of or excludes compare set values" )),
    G = g-tuple(s, p, eq, set, [x], '', '', forbid, '', ''),
    domain([G], set, none),
    cchk_t(n, neq, set, [x], N), cchk_t(i, includes, set, [x], I),
    domain([N, I], set, none),
    forall(member(Op, [subset_of, excludes]),
           ( cchk_t(o, Op, set, [x], O),
             domain([N, O], set, R3), R3 == "neq beside subset_of or excludes on one set property is not compared",
             domain([O, N], set, R3) )).

test(types) :-
    cchk_t(a, eq, int, 1, A), cchk_t(b, eq, string, "x", B), cchk_t(c, eq, date, "x", C),
    domain([A, B], D1, R1), D1-R1 == none-"the facts use different value types",
    domain([C], D2, R2), D2-R2 == none-"the value type is not supported".

test(context_members) :-
    A = a-tuple(s, p, gte, int, 1, '', '', forbid, from, to),
    B = b-tuple(s, p, gte, int, 1, '', '', require, from, to),
    certificate_check:context_member(int, A, MA),
    MA == m(a, lt, 1, from, to),
    certificate_check:context_member(int, B, MB),
    MB == m(b, gte, 1, from, to).

:- end_tests(certificate_check_domains).

% --- member checks ----------------------------------------------------------

:- begin_tests(certificate_check_members).

holds(Domain, Op, Bound, Value) :-
    cchk_m(f, Op, Bound, M),
    first_answer_is_last(certificate_member_holds(Domain, M, Value)).

fails(Domain, Op, Bound, Value) :-
    cchk_m(f, Op, Bound, M),
    \+ certificate_member_holds(Domain, M, Value).

test(numeric_members) :-
    holds(int, gte, 1, 1),
    fails(int, gte, 1, 0),
    fails(int, gte, 1, 1.0),
    fails(int, gte, 1, "1"),
    holds(number, gte, 1, 1.5),
    holds(number, lt, 2, 1),
    fails(number, lt, 2, "1"),
    fails(number, gt, 2, "a").

test(bool_members) :-
    holds(bool, eq, true, true),
    holds(bool, eq, true, "true"),
    holds(bool, neq, true, false),
    fails(bool, eq, true, false),
    fails(bool, neq, true, "true"),
    fails(bool, eq, maybe, maybe),
    fails(bool, eq, 1, 1).

test(string_members) :-
    holds(string, eq, pro, "pro"),
    holds(string, eq, "pro", pro),
    holds(string, neq, pro, "free"),
    fails(string, eq, pro, "free"),
    fails(string, neq, pro, "pro"),
    fails(string, eq, 1, 1),
    fails(string, lt, a, "a"),
    fails(string, lt, a, "b").

test(set_members) :-
    holds(set, eq, [a, b], ["b", "a", "a"]),
    fails(set, eq, [a, b], ["a"]),
    holds(set, neq, [a, b], ["a"]),
    fails(set, neq, [a], ["a"]),
    holds(set, includes, [a], ["a", "b"]),
    fails(set, includes, [a, c], ["a", "b"]),
    holds(set, subset_of, [a, b], ["a"]),
    fails(set, subset_of, [a], ["a", "b"]),
    holds(set, excludes, [c], ["a", "b"]),
    fails(set, excludes, [b], ["a", "b"]),
    fails(set, eq, [a], "a"),
    fails(set, lt, [a], ["a"]),
    fails(set, lt, [a], ["b"]).

test(set_texts) :-
    set_texts([b, "a", 1, b], Texts),
    Texts == ["1", "a", "b"],
    \+ set_texts("a", _),
    \+ set_texts([f(x)], _),
    \+ set_texts([a|_], _).

satisfiable(Domain, Specs) :-
    maplist([Fact-Op-Bound, M]>>cchk_m(Fact, Op, Bound, M), Specs, Members),
    first_answer_is_last(certificate_members_satisfiable(Domain, Members)).

unsatisfiable(Domain, Specs) :-
    maplist([Fact-Op-Bound, M]>>cchk_m(Fact, Op, Bound, M), Specs, Members),
    \+ certificate_members_satisfiable(Domain, Members).

test(numeric_satisfiable) :-
    satisfiable(int, [a-gte-1, b-lte-1]),
    unsatisfiable(int, [a-gt-1, b-lt-2]),
    satisfiable(number, [a-gt-1, b-lt-2]),
    unsatisfiable(number, [a-gt-1, b-lt-1]).

test(scalar_satisfiable) :-
    satisfiable(bool, [a-neq-true]),
    unsatisfiable(bool, [a-neq-true, b-neq-false]),
    satisfiable(string, [a-neq-"x", b-neq-y]),
    satisfiable(string, [a-eq-"x", b-neq-y]),
    unsatisfiable(string, [a-eq-"x", b-eq-y]),
    unsatisfiable(string, [a-eq-x, b-neq-"x"]).

test(set_satisfiable) :-
    satisfiable(set, [a-includes-[x], b-excludes-[y]]),
    satisfiable(set, [a-includes-[x], b-includes-[y], c-subset_of-[x, y, z]]),
    unsatisfiable(set, [a-includes-[x], b-excludes-[x]]),
    unsatisfiable(set, [a-includes-[x], b-subset_of-[y]]),
    satisfiable(set, [a-neq-[], b-neq-[x]]),
    satisfiable(set, [a-eq-[x], b-includes-[x]]),
    unsatisfiable(set, [a-eq-[x], b-eq-[y]]),
    satisfiable(set, [a-subset_of-[x], b-excludes-[x]]),
    satisfiable(set, [a-includes-[x], b-includes-[y], c-neq-[x], d-neq-[y]]).

test(scalar_candidates) :-
    certificate_check:scalar_candidates(bool, [], Bools),
    Bools == ["true", "false"],
    maplist([Fact-Op-Bound, M]>>cchk_m(Fact, Op, Bound, M), [a-eq-b, c-neq-"a", d-eq-a], Members),
    certificate_check:scalar_candidates(string, Members, Strings),
    Strings == ["a", "b", "kibi:fresh|a|b"],
    maplist([Fact-Op-Bound, M]>>cchk_m(Fact, Op, Bound, M), [a-includes-[y], b-eq-[x, y], c-includes-[z], d-excludes-[w]], SetMembers),
    certificate_check:scalar_candidates(set, SetMembers, Sets),
    Sets == [["w"], ["x", "y"], ["y"], ["z"], ["w", "x", "y", "z"], ["y", "z"], ["kibi:fresh|w|x|y|z"]].

:- end_tests(certificate_check_members).

% --- verify_certificates/2: the bundle --------------------------------------

:- begin_tests(certificate_check_bundle).

not_a_bundle(Report) :-
    cchk_report(rejected, 0, 0, [_{certificate: 0, kind: bundle, reason: "not a kibi.certificates.v1 bundle"}], [], Report).

test(not_a_bundle) :-
    not_a_bundle(Expected),
    forall(member(Bundle, [[], _{certificates: []}, _{version: "kibi.certificates.v1", certificates: ["x"]}, _{version: "kibi.certificates.v2", certificates: []},
                           _{version: "kibi.certificates.v1"}, _{version: "kibi.certificates.v1", certificates: "none"},
                           _{version: "kibi.certificates.v1", certificates: [_{kind: "rule_strata"}, "x"]}]),
           ( with_fixture_kb(first_answer_is_last(verify_certificates(Bundle, Report))), same(Report, Expected) )).

test(empty_bundle_on_an_empty_kb) :-
    with_fixture_kb(cchk_verify([], Report)),
    cchk_empty_theorem(properties_consistent, P), cchk_empty_theorem(predicates_consistent, Q),
    cchk_empty_theorem(decisions_consistent, D), cchk_empty_rules(R),
    cchk_report(verified, 0, 0, [], [P, Q, D, R], Expected),
    same(Report, Expected).

test(atom_version_is_accepted) :-
    with_fixture_kb(verify_certificates(_{version: 'kibi.certificates.v1', certificates: []}, Report)),
    get_dict(status, Report, verified).

test(atom_kinds_read_as_their_name) :-
    with_fixture_kb(cchk_verify([_{kind: lemma}], Report)),
    same(Report.rejected, [_{certificate: 1, kind: lemma, reason: "unknown certificate kind"}]).

test(unknown_kinds) :-
    with_fixture_kb(cchk_verify([_{kind: "lemma"}, _{value: 1}, _{kind: 7}], Report)),
    same(Report.rejected, [_{certificate: 1, kind: lemma, reason: "unknown certificate kind"},
                           _{certificate: 2, kind: unknown, reason: "unknown certificate kind"},
                           _{certificate: 3, kind: unknown, reason: "unknown certificate kind"}]),
    Report.status == rejected,
    Report.certificates == 3,
    Report.verified == 0.

:- end_tests(certificate_check_bundle).

% --- property certificates --------------------------------------------------

:- begin_tests(certificate_check_properties).

quota_kb :-
    cert_property('FACT-MIN', 'REQ-MIN', "api.quota", "rate_limit", gte, int, 1, []),
    cert_property('FACT-MAX', 'REQ-MAX', "api.quota", "rate_limit", lte, int, 10, []).

quota_model(Value, Facts, _{kind: "property_model", subjectKey: "api.quota", propertyKey: "rate_limit",
                            scope: "", domain: "int", value: Value, facts: Facts}).

label(_{subjectKey: 'api.quota', propertyKey: rate_limit, scope: ''}).

property_report(Kb, Certificates, Report) :-
    with_fixture_kb(( call(Kb), cchk_verify(Certificates, Report) )).

properties(Report, Theorem) :-
    cchk_theorem(Report, properties_consistent, Theorem).

test(model_proves_the_context) :-
    quota_model(5, ["FACT-MAX", "FACT-MIN"], Model),
    property_report(quota_kb, [Model], Report),
    cchk_empty_theorem(predicates_consistent, Q), cchk_empty_theorem(decisions_consistent, D), cchk_empty_rules(R),
    cchk_report(verified, 1, 1, [],
           [_{theorem: properties_consistent, verdict: proved, groups: 1, models: 1, contradictions: [], unresolved: []},
            Q, D, R], Expected),
    same(Report, Expected).

test(model_failures) :-
    quota_model(5, ["FACT-MIN"], Short),
    quota_model(5, ["FACT-MIN", "FACT-MAX", "FACT-MIN"], Repeated),
    quota_model(5, "FACT-MIN", NotList),
    quota_model(11, ["FACT-MIN", "FACT-MAX"], Breaks),
    quota_model(5.5, ["FACT-MIN", "FACT-MAX"], Fraction),
    quota_model(5, ["FACT-MIN", "FACT-MAX"], Model),
    del_dict(value, Model, _, NoValue),
    put_dict(domain, Model, "number", WrongDomain),
    del_dict(domain, Model, _, NoDomain),
    forall(member(Certificate-Reason,
                  [Short-"model does not list exactly the facts of its context",
                   Repeated-"model does not list exactly the facts of its context",
                   NotList-"model does not list exactly the facts of its context",
                   NoValue-"model has no value",
                   Breaks-"model value does not satisfy FACT-MAX",
                   Fraction-"model value does not satisfy FACT-MAX",
                   WrongDomain-"certificate domain differs from the facts' value domain",
                   NoDomain-"certificate domain differs from the facts' value domain"]),
           ( property_report(quota_kb, [Certificate], Report),
             cchk_report(rejected, 1, 0,
                    [_{certificate: 1, kind: property_model, reason: Reason}],
                    [_{theorem: properties_consistent, verdict: unresolved, groups: 1, models: 0, contradictions: [], unresolved: []},
                     _, _, _], Expected),
             Report.theorems = [_, Q, D, R],
             Expected.theorems = [_, Q, D, R],
             ( same(Report, Expected) -> true ; print_message(error, format("~p: ~p", [Reason, Report])), fail ) )).

test(missing_and_orphan_certificates) :-
    quota_model(5, ["FACT-MAX", "FACT-MIN"], Model),
    put_dict(subjectKey, Model, "api.other", Orphan),
    put_dict(scope, Model, "eu", OtherScope),
    del_dict(scope, Model, _, NoScope),
    put_dict(propertyKey, Model, "burst", OtherProperty),
    property_report(quota_kb, [Orphan, OtherScope, NoScope, OtherProperty], Report),
    label(Label),
    same(Report.rejected,
         [_{certificate: 0, kind: missing, reason: "no certificate for this group", group: Label},
          _{certificate: 1, kind: property_model, reason: "certificate names no comparable property context of this KB"},
          _{certificate: 2, kind: property_model, reason: "certificate names no comparable property context of this KB"},
          _{certificate: 3, kind: property_model, reason: "certificate names no comparable property context of this KB"},
          _{certificate: 4, kind: property_model, reason: "certificate names no comparable property context of this KB"}]),
    Report.verified == 0.

test(two_certificates_for_one_context) :-
    quota_model(5, ["FACT-MAX", "FACT-MIN"], Model),
    property_report(quota_kb, [Model, Model], Report),
    same(Report.rejected,
         [_{certificate: 1, kind: property, reason: "more than one certificate for the same context"},
          _{certificate: 2, kind: property, reason: "more than one certificate for the same context"}]),
    properties(Report, Theorem),
    Theorem.verdict == unresolved,
    Report.status == rejected.

jam_kb :-
    cert_property('FACT-J1', 'REQ-J1', "seat.count", "free", gte, int, 0, []),
    cert_property('FACT-J2', 'REQ-J2', "seat.count", "free", lte, int, 1, []),
    cert_property('FACT-J3', 'REQ-J3', "seat.count", "free", neq, int, 0, []),
    cert_property('FACT-J4', 'REQ-J4', "seat.count", "free", neq, int, 1, []).

jam(Core, Drops, _{kind: "property_contradiction", subjectKey: "seat.count", propertyKey: "free", scope: "",
                   domain: "int", core: Core, dropModels: Drops}).

jam_core(["FACT-J1", "FACT-J2", "FACT-J3", "FACT-J4"]).

jam_drops([_{factId: "FACT-J1", value: -1}, _{factId: "FACT-J2", value: 2},
           _{factId: "FACT-J3", value: 0}, _{factId: "FACT-J4", value: 1}]).

jam_label(_{subjectKey: 'seat.count', propertyKey: free, scope: ''}).

test(contradiction_disproves_the_theorem) :-
    jam_core(Core), jam_drops(Drops), jam(Core, Drops, Certificate),
    property_report(jam_kb, [Certificate], Report),
    jam_label(Label),
    properties(Report, Theorem),
    same(Theorem, _{theorem: properties_consistent, verdict: disproved, groups: 1, models: 0,
                    contradictions: [Label], unresolved: []}),
    Report.status == verified,
    Report.verified == 1.

test(contradiction_failures) :-
    jam_core(Core), jam_drops(Drops),
    Core = [_|Short],
    Drops = [_|ShortDrops],
    Drops = [D1, D2, D3, _],
    forall(member(Certificate0-Reason,
                  [c("FACT-J1", Drops)-"core is not a list of fact ids",
                   c(["FACT-J1", 1], Drops)-"core is not a list of fact ids",
                   c([], Drops)-"core names a fact outside its context or repeats one",
                   c(["FACT-J1", "FACT-J2", "FACT-J3", "FACT-J4", "FACT-MIN"], Drops)-"core names a fact outside its context or repeats one",
                   c(["FACT-J1", "FACT-J1", "FACT-J2", "FACT-J3", "FACT-J4"], Drops)-"core names a fact outside its context or repeats one",
                   c(["FACT-J1", "FACT-J1", "FACT-X"], Drops)-"core names a fact outside its context or repeats one",
                   c(Core, [D1, D2, D3, _{factId: "FACT-X", value: 1}])-"core is not irreducible: a dropped fact has no valid model of the rest",
                   c(Short, ShortDrops)-"core admits a value, so it is not a contradiction",
                   c(Core, [D1, D2, D3])-"core is not irreducible: a dropped fact has no valid model of the rest",
                   c(Core, [D1, D2, D3, _{factId: "FACT-J4", value: 2}])-"core is not irreducible: a dropped fact has no valid model of the rest",
                   c(Core, [D1, D2, D3, "FACT-J4"])-"core is not irreducible: a dropped fact has no valid model of the rest",
                   c(Core, [D1, D2, D3, _{factId: "FACT-J4"}])-"core is not irreducible: a dropped fact has no valid model of the rest",
                   c(Core, "drops")-"core is not irreducible: a dropped fact has no valid model of the rest",
                   c(Core, none)-"core is not irreducible: a dropped fact has no valid model of the rest"]),
           ( Certificate0 = c(C, Ds),
             (   Ds == none
             ->  jam(C, [], J), del_dict(dropModels, J, _, Certificate)
             ;   jam(C, Ds, Certificate)
             ),
             property_report(jam_kb, [Certificate], Report),
             (   same(Report.rejected, [_{certificate: 1, kind: property_contradiction, reason: Reason}])
             ->  true
             ;   print_message(error, format("~p: ~p", [Reason, Report.rejected])), fail
             ) )).

test(a_lone_fact_can_be_a_core) :-
    certificate_check:core_check(_{core: ["a"], dropModels: [_{factId: "a", value: 0}]}, int,
                                 [m(a, eq, 1.5, '', '')], true, Outcome),
    Outcome == ok.

overlapping_windows_kb :-
    cert_property('FACT-ONE', 'REQ-ONE', "plan.price", "monthly", eq, int, 1, [valid_from="2026-01-01T00:00:00Z"]),
    cert_property('FACT-TWO', 'REQ-TWO', "plan.price", "monthly", eq, int, 2, [valid_from="2026-02-01T00:00:00Z"]).

test(windows_with_starts_overlap) :-
    C = _{kind: "property_contradiction", subjectKey: "plan.price", propertyKey: "monthly", scope: "", domain: "int",
          core: ["FACT-ONE", "FACT-TWO"],
          dropModels: [_{factId: "FACT-ONE", value: 2}, _{factId: "FACT-TWO", value: 1}]},
    property_report(overlapping_windows_kb, [C], Report),
    Report.status == verified.

test(core_in_any_order) :-
    jam_drops(Drops),
    jam(["FACT-J4", "FACT-J3", "FACT-J2", "FACT-J1"], Drops, Certificate),
    property_report(jam_kb, [Certificate], Report),
    Report.status == verified.

windows_kb :-
    cert_property('FACT-OLD', 'REQ-OLD', "plan.price", "monthly", eq, int, 10, [valid_to="2025-12-31T00:00:00Z"]),
    cert_property('FACT-NEW', 'REQ-NEW', "plan.price", "monthly", eq, int, 12, [valid_from="2026-01-01T00:00:00Z"]).

price(Kind, _{kind: Kind, subjectKey: "plan.price", propertyKey: "monthly", scope: "", domain: "int",
              core: ["FACT-NEW", "FACT-OLD"],
              dropModels: [_{factId: "FACT-NEW", value: 10}, _{factId: "FACT-OLD", value: 12}]}).

test(unresolved_core_with_disjoint_windows) :-
    price("property_unresolved", Certificate),
    property_report(windows_kb, [Certificate], Report),
    properties(Report, Theorem),
    same(Theorem, _{theorem: properties_consistent, verdict: unresolved, groups: 1, models: 0,
                    contradictions: [],
                    unresolved: [_{subjectKey: 'plan.price', propertyKey: monthly, scope: ''}]}),
    Report.status == verified,
    price("property_contradiction", Contradiction),
    property_report(windows_kb, [Contradiction], Rejected),
    same(Rejected.rejected,
         [_{certificate: 1, kind: property_contradiction, reason: "core facts are never valid at the same time"}]).

test(unresolved_certificate_for_a_real_contradiction) :-
    jam_core(Core), jam_drops(Drops), jam(Core, Drops, J),
    put_dict(kind, J, "property_unresolved", Certificate),
    property_report(jam_kb, [Certificate], Report),
    same(Report.rejected,
         [_{certificate: 1, kind: property_unresolved,
            reason: "core facts are valid at the same time, so the core is a contradiction"}]).

test(unresolved_contexts_count_as_unresolved) :-
    property_report(( cert_property('FACT-LT', 'REQ-LT', "plan.name", "label", lt, string, "pro", []),
                      quota_kb ),
                    [], Report),
    properties(Report, Theorem),
    label(Label),
    same(Theorem, _{theorem: properties_consistent, verdict: unresolved, groups: 2, models: 0, contradictions: [],
                    unresolved: [_{subjectKey: 'plan.name', propertyKey: label, scope: '',
                                   reason: "only eq and neq compare non-numeric values"}]}),
    same(Report.rejected, [_{certificate: 0, kind: missing, reason: "no certificate for this group", group: Label}]).

test(contradiction_outweighs_a_missing_model) :-
    jam_core(Core), jam_drops(Drops), jam(Core, Drops, Certificate),
    property_report(( jam_kb, quota_kb ), [Certificate], Report),
    properties(Report, Theorem),
    Theorem.verdict == disproved,
    Theorem.groups == 2.

test(scalar_and_set_models) :-
    property_report(( cert_property('FACT-S', 'REQ-S', "plan.name", "label", eq, string, "pro", []),
                      cert_property('FACT-SET', 'REQ-SET', "plan.tags", "set", includes, set, ["a"], []) ),
                    [_{kind: "property_model", subjectKey: "plan.name", propertyKey: "label", scope: "",
                       domain: "string", value: "pro", facts: ["FACT-S"]},
                     _{kind: "property_model", subjectKey: "plan.tags", propertyKey: "set", scope: "",
                       domain: "set", value: ["a", "b"], facts: ["FACT-SET"]}],
                    Report),
    Report.status == verified,
    properties(Report, Theorem),
    Theorem.models == 2.

test(set_contradiction) :-
    property_report(( cert_property('FACT-I', 'REQ-I', "plan.tags", "set", includes, set, ["a"], []),
                      cert_property('FACT-E', 'REQ-E', "plan.tags", "set", excludes, set, ["a"], []) ),
                    [_{kind: "property_contradiction", subjectKey: "plan.tags", propertyKey: "set", scope: "",
                       domain: "set", core: ["FACT-E", "FACT-I"],
                       dropModels: [_{factId: "FACT-E", value: ["a"]}, _{factId: "FACT-I", value: []}]}],
                    Report),
    Report.status == verified.

:- end_tests(certificate_check_properties).

% --- predicate and decision certificates ------------------------------------

:- begin_tests(certificate_check_groups).

read_kb :-
    cert_predicate('FACT-A', 'REQ-A', ["coach", "read", "request", "allow"], assert),
    cert_predicate('FACT-B', 'REQ-B', ["coach", "read", "request", "allow"], assert).

write_kb :-
    cert_predicate('FACT-A', 'REQ-A', ["coach", "write", "request", "allow"], assert),
    cert_predicate('FACT-D', 'REQ-D', ["coach", "write", "request", "allow"], deny).

predicate_model(Value, Facts, _{kind: "predicate_model", namespace: "default", name: "permission_rule",
                                args: ["coach", "read", "request", "allow"], value: Value, facts: Facts}).

decision_model(Value, Facts, _{kind: "decision_model", namespace: "default", name: "permission_rule", arity: 4,
                               key: ["coach", "read", "request"], value: Value, facts: Facts}).

group_report(Kb, Certificates, Report) :-
    with_fixture_kb(( call(Kb), cchk_verify(Certificates, Report) )).

test(group_models_prove) :-
    predicate_model(true, ["FACT-B", "FACT-A"], P),
    decision_model("allow", ["FACT-A", "FACT-B"], D),
    group_report(read_kb, [P, D], Report),
    cchk_empty_theorem(properties_consistent, Props), cchk_empty_rules(R),
    PLabel = _{namespace: default, name: permission_rule, args: [coach, read, request, allow]},
    cchk_report(verified, 2, 2, [],
           [Props,
            _{theorem: predicates_consistent, verdict: proved, groups: 1, models: 1, contradictions: [], unresolved: []},
            _{theorem: decisions_consistent, verdict: proved, groups: 1, models: 1, contradictions: [], unresolved: []},
            R], Expected),
    same(Report, Expected),
    PLabel = PLabel.

test(group_model_failures) :-
    predicate_model(true, ["FACT-A"], Short),
    predicate_model(true, ["FACT-A", "FACT-B"], Model),
    predicate_model(false, ["FACT-A", "FACT-B"], Wrong),
    predicate_model("true", ["FACT-A", "FACT-B"], TextTrue),
    del_dict(value, Model, _, NoValue),
    forall(member(Certificate-Reason,
                  [Short-"model does not list exactly the facts of its group",
                   NoValue-"model has no value",
                   Wrong-"model value does not satisfy FACT-A"]),
           ( group_report(read_kb, [Certificate], Report),
             same(Report.rejected,
                  [_{certificate: 0, kind: missing, reason: "no certificate for this group",
                     group: _{namespace: default, name: permission_rule, arity: 4, key: [coach, read, request]}},
                   _{certificate: 1, kind: predicate_model, reason: Reason}]) )),
    decision_model("allow", ["FACT-A", "FACT-B"], D),
    group_report(read_kb, [TextTrue, D], Text),
    Text.status == verified.

test(group_label_must_match) :-
    predicate_model(true, ["FACT-A", "FACT-B"], Model),
    put_dict(args, Model, ["coach", "read", "request"], Short),
    put_dict(args, Model, "coach", NotList),
    put_dict(name, Model, "other", OtherName),
    decision_model("allow", ["FACT-A", "FACT-B"], D0),
    put_dict(arity, D0, "4", TextArity),
    put_dict(arity, D0, 3, OtherArity),
    group_report(read_kb, [Short, NotList, OtherName, TextArity, OtherArity], Report),
    findall(I-R, (member(F, Report.rejected), get_dict(certificate, F, I), I > 0, get_dict(reason, F, R)), Orphans),
    Orphans == [1-"certificate names no group of this KB", 2-"certificate names no group of this KB",
                3-"certificate names no group of this KB", 4-"certificate names no group of this KB",
                5-"certificate names no group of this KB"],
    findall(K, (member(F, Report.rejected), get_dict(certificate, F, I), I > 0, get_dict(kind, F, K)), Kinds),
    Kinds == [predicate_model, predicate_model, predicate_model, decision_model, decision_model].

test(two_certificates_for_one_group) :-
    predicate_model(true, ["FACT-A", "FACT-B"], Model),
    decision_model("allow", ["FACT-A", "FACT-B"], D),
    group_report(read_kb, [Model, D, Model], Report),
    same(Report.rejected,
         [_{certificate: 1, kind: group, reason: "more than one certificate for the same group"},
          _{certificate: 3, kind: group, reason: "more than one certificate for the same group"}]),
    Report.verified == 1.

contradiction(Prefix, Core, Certificate) :-
    (   Prefix == predicate
    ->  Certificate = _{kind: "predicate_contradiction", namespace: "default", name: "permission_rule",
                        args: ["coach", "write", "request", "allow"], core: Core}
    ;   Certificate = _{kind: "decision_contradiction", namespace: "default", name: "permission_rule",
                        arity: 4, key: ["coach", "write", "request"], core: Core}
    ).

test(group_contradictions) :-
    contradiction(predicate, ["FACT-D", "FACT-A"], P),
    contradiction(decision, ["FACT-A", "FACT-D"], D),
    group_report(write_kb, [P, D], Report),
    Report.status == verified,
    WLabel = _{namespace: default, name: permission_rule, args: [coach, write, request, allow]},
    cchk_theorem(Report, predicates_consistent, PT),
    same(PT, _{theorem: predicates_consistent, verdict: disproved, groups: 1, models: 0,
               contradictions: [WLabel], unresolved: []}),
    cchk_theorem(Report, decisions_consistent, DT),
    DT.verdict == disproved.

test(group_contradiction_failures) :-
    forall(member(Core, [["FACT-A", "FACT-A"], ["FACT-A"], ["FACT-A", "FACT-D", "FACT-A"], ["FACT-A", "FACT-X"],
                         ["FACT-X", "FACT-D"], "FACT-A"]),
           ( contradiction(predicate, Core, P),
             group_report(write_kb, [P], Report),
             Report.rejected = [_, First],
             same(First, _{certificate: 1, kind: predicate_contradiction,
                           reason: "core is not two facts of the group that disagree"}) )).

test(unresolved_decision_group) :-
    group_report(cert_predicate('FACT-M', 'REQ-M', ["coach", "read", "request", "maybe"], assert), [
                     _{kind: "predicate_model", namespace: "default", name: "permission_rule",
                       args: ["coach", "read", "request", "maybe"], value: true, facts: ["FACT-M"]}], Report),
    cchk_theorem(Report, decisions_consistent, Theorem),
    same(Theorem, _{theorem: decisions_consistent, verdict: unresolved, groups: 1, models: 0, contradictions: [],
                    unresolved: [_{namespace: default, name: permission_rule, arity: 4, key: [coach, read, request],
                                   reason: "a decision is neither allow nor deny"}]}),
    Report.status == verified.

test(unresolved_group_result) :-
    certificate_check:group_result(m, c, [], unresolved(_{name: n}, "why"), [], Results),
    Results = [result(unresolved, [], [], Label)],
    same(Label, _{name: n, reason: "why"}),
    certificate_check:property_context_result([], unresolved(s, p, '', "why"), [], PResults),
    PResults = [result(unresolved, [], [], PLabel)],
    same(PLabel, _{subjectKey: s, propertyKey: p, scope: '', reason: "why"}).

test(text_helpers_leave_no_choicepoint) :-
    first_answer_is_last(certificate_check:text_atom(a, A)), A == a,
    first_answer_is_last(certificate_check:text_atom("a", B)), B == a,
    \+ certificate_check:text_atom(1, _),
    first_answer_is_last(certificate_check:text_of(a, T)), T == "a",
    first_answer_is_last(certificate_check:text_of(1.5, N)), N == "1.5",
    \+ certificate_check:text_of(f(x), _).

test(label_values) :-
    certificate_check:label_value_equal(["a", b], [a, "b"]),
    \+ certificate_check:label_value_equal("a", [a]),
    \+ certificate_check:label_value_equal(["a"], [a, b]),
    certificate_check:label_value_equal(4, 4),
    \+ certificate_check:label_value_equal(4.0, 4),
    \+ certificate_check:label_value_equal("4", 4),
    certificate_check:label_value_equal("a", a),
    first_answer_is_last(certificate_check:label_value_equal([a], [a])),
    first_answer_is_last(certificate_check:label_value_equal(4, 4)).

:- end_tests(certificate_check_groups).

% --- rule certificates ------------------------------------------------------

:- begin_tests(certificate_check_rules).

rules_kb :-
    cert_rule('FACT-RULE-P', p, not(q)),
    cert_rule('FACT-RULE-Q', q, r).

entry(Name, Stratum, _{namespace: "default", name: Name, arity: 0, stratum: Stratum}).

strata(Entries, _{kind: "rule_strata", strata: Entries}).

sig(Name, _{namespace: "default", name: Name, arity: 0}).

cycle_entry(Head, Body, Sign, _{head: H, body: B, sign: Sign}) :-
    sig(Head, H), sig(Body, B).

rules_report(Kb, Certificates, Report) :-
    with_fixture_kb(( call(Kb), cchk_verify(Certificates, Report) )).

rules(Report, Theorem) :-
    cchk_theorem(Report, rules_stratified, Theorem).

test(strata_prove) :-
    entry("p", 1, P), entry("q", 0, Q), entry("r", 0, R),
    strata([P, Q, R], Certificate),
    rules_report(rules_kb, [Certificate], Report),
    rules(Report, Theorem),
    same(Theorem, _{theorem: rules_stratified, verdict: proved, predicates: 3, edges: 2}),
    Report.status == verified,
    Report.verified == 1.

test(strata_failures) :-
    entry("p", 1, P), entry("q", 0, Q), entry("r", 0, R),
    entry("p", 0, P0), entry("q", 1, Q1), entry("q", -1, QNeg), entry("q", 0.5, QHalf), entry("r", 1, R1),
    put_dict(namespace, R, "other", ROther),
    forall(member(Certificate-Reason,
                  [strata([P, Q])-"strata omit a predicate the rules depend on",
                   strata([P, Q, ROther])-"strata omit a predicate the rules depend on",
                   strata([P, Q, R1])-"a rule dependency violates the stratum order",
                   strata([P0, Q, R])-"a rule dependency violates the stratum order",
                   strata([P, Q1, R])-"a rule dependency violates the stratum order",
                   strata([P, QNeg, R])-"strata are not a list of predicates with integer strata",
                   strata([P, QHalf, R])-"strata are not a list of predicates with integer strata",
                   strata([P, Q, R, "s"])-"strata are not a list of predicates with integer strata",
                   strata([P, Q, R, _{namespace: "default", name: "s", arity: "0", stratum: 0}])-"strata are not a list of predicates with integer strata",
                   strata([P, Q, R, _{name: "s", arity: 0, stratum: 0}])-"strata are not a list of predicates with integer strata",
                   strata([P, Q, R, _{namespace: "default", arity: 0, stratum: 0}])-"strata are not a list of predicates with integer strata",
                   strata([P, Q, R, _{namespace: "default", name: "s", stratum: 0}])-"strata are not a list of predicates with integer strata",
                   strata([P, Q, R, _{namespace: "default", name: "s", arity: 0}])-"strata are not a list of predicates with integer strata",
                   strata("p")-"strata are not a list of predicates with integer strata",
                   _{kind: "rule_strata"}-"strata are not a list of predicates with integer strata"]),
           ( ( is_dict(Certificate) -> C = Certificate ; call(Certificate, C) ),
             rules_report(rules_kb, [C], Report),
             rules(Report, Theorem),
             ( same(Report.rejected, [_{certificate: 1, kind: rule_strata, reason: Reason}]),
               same(Theorem, _{theorem: rules_stratified, verdict: unresolved, predicates: 3, edges: 2})
             ->  true
             ;   print_message(error, format("~p: ~p", [Reason, Report.rejected])), fail
             ) )).

test(equal_strata_suffice_for_a_positive_edge) :-
    entry("p", 1, P), entry("q", 0, Q), entry("r", 0, R), entry("s", 4, S),
    strata([S, P, Q, R], Certificate),
    rules_report(rules_kb, [Certificate], Report),
    Report.status == verified.

test(no_certificate_for_stored_rules) :-
    rules_report(rules_kb, [], Report),
    rules(Report, Theorem),
    same(Theorem, _{theorem: rules_stratified, verdict: unresolved, predicates: 3, edges: 2}),
    same(Report.rejected, [_{certificate: 0, kind: rule_strata, reason: "no stratification certificate for the stored rules"}]),
    Report.status == rejected.

test(two_rule_certificates) :-
    entry("p", 1, P), entry("q", 0, Q), entry("r", 0, R),
    strata([P, Q, R], Certificate),
    rules_report(rules_kb, [Certificate, Certificate], Report),
    rules(Report, Theorem),
    Theorem.verdict == unresolved,
    same(Report.rejected, [_{certificate: 1, kind: rule_strata, reason: "more than one stratification certificate"},
                           _{certificate: 2, kind: rule_strata, reason: "more than one stratification certificate"}]).

cycle_kb :-
    rules_kb,
    cert_rule('FACT-RULE-R', r, not(p)).

test(negation_cycle_disproves) :-
    cycle_entry("p", "q", "negative", E1), cycle_entry("q", "r", "positive", E2), cycle_entry("r", "p", "negative", E3),
    rules_report(cycle_kb, [_{kind: "rule_negation_cycle", cycle: [E1, E2, E3]}], Report),
    rules(Report, Theorem),
    same(Theorem, _{theorem: rules_stratified, verdict: disproved, predicates: 3, edges: 3}),
    Report.status == verified,
    rules_report(cycle_kb, [_{kind: "rule_negation_cycle", cycle: [E2, E3, E1]}], Rotated),
    Rotated.status == verified.

test(cycle_failures) :-
    cycle_entry("p", "q", "negative", E1), cycle_entry("q", "r", "positive", E2), cycle_entry("r", "p", "negative", E3),
    cycle_entry("q", "p", "positive", Missing), cycle_entry("r", "p", "positive", WrongSign),
    sig("q", Q), sig("r", R),
    forall(member(Cycle, [[], [E1, E2], [E1, E3, E2], [E1, Missing], [E2, E3, E1, E2], "cycle",
                          [E1, E2, _{head: Q, body: R}], [E1, E2, _{head: "r", body: "p", sign: "negative"}],
                          [E1, E2, "edge"], [E1, E2, _{body: R, sign: "negative"}], [E1, E2, _{head: Q, sign: "negative"}]]),
           ( rules_report(cycle_kb, [_{kind: "rule_negation_cycle", cycle: Cycle}], Report),
             same(Report.rejected, [_{certificate: 1, kind: rule_negation_cycle,
                                      reason: "cycle is not a closed path of stored rule dependencies with a negated edge"}]) )),
    rules_report(cycle_kb, [_{kind: "rule_negation_cycle", cycle: [E1, E2, WrongSign]}], NoCycle),
    same(NoCycle.rejected, [_{certificate: 1, kind: rule_negation_cycle,
                              reason: "cycle is not a closed path of stored rule dependencies with a negated edge"}]),
    cycle_entry("p", "q", "positive", P1), cycle_entry("q", "p", "positive", P2),
    rules_report(( cert_rule('FACT-RULE-P', p, q), cert_rule('FACT-RULE-Q', q, p) ),
                 [_{kind: "rule_negation_cycle", cycle: [P1, P2]}], Positive),
    same(Positive.rejected, [_{certificate: 1, kind: rule_negation_cycle,
                               reason: "cycle is not a closed path of stored rule dependencies with a negated edge"}]).

test(cycle_closure) :-
    certificate_check:cycle_closed([edge(a, b, negative), edge(b, a, positive)]),
    certificate_check:cycle_closed([edge(a, a, negative)]),
    \+ certificate_check:cycle_closed([edge(a, b, negative), edge(c, a, positive)]),
    \+ certificate_check:cycle_closed([edge(a, b, negative), edge(b, c, positive)]).

:- end_tests(certificate_check_rules).

% --- the file entry point ---------------------------------------------------

:- begin_tests(certificate_check_file).

test(verifies_a_bundle_file) :-
    tmp_file(kibi_bundle, Path),
    setup_call_cleanup(open(Path, write, Out, [encoding(utf8)]),
                       format(Out, "{\"version\":\"kibi.certificates.v1\",\"certificates\":[{\"kind\":\"lemma\"}]}", []),
                       close(Out)),
    with_fixture_kb(kb_verify_certificates_file(Path, Json)),
    delete_file(Path),
    \+ sub_string(Json, _, _, _, "\n"),
    \+ ( stream_property(Stream, file_name(Name)), atom_string(Name, Path), stream_property(Stream, mode(read)) ),
    atom_json_dict(Json, Report, [value_string_as(atom)]),
    Report.status == rejected,
    same(Report.rejected, [_{certificate: 1, kind: lemma, reason: 'unknown certificate kind'}]).

:- end_tests(certificate_check_file).
