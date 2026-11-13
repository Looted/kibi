:- encoding(utf8).
:- use_module(library(plunit)).
:- use_module(library(http/json)).
:- use_module(library(semweb/rdf_db), []).
:- use_module('../src/kb.pl').
:- use_module('../src/domain_subjects.pl').
:- use_module(kb_fixture).

% The domain subject layer: which subjects are defined, how they nest, which
% requirements are about which subjects, and the two blocking rules over
% unmodeled claims (claim-subject-missing, claim-subject-undefined).

%% ds_raw(+Type, +Id, +Props)
% Store exactly Props for the entity, past the write validation.
ds_raw(Type, Id, Props) :-
    kb:kb_graph(Graph),
    atom_string(Type, TypeString),
    format(atom(EntityUri), 'kb:entity/~w', [Id]),
    kb:with_kb_mutex((
        rdf_db:rdf_retractall(EntityUri, _, _, Graph),
        rdf_db:rdf_assert(EntityUri, 'urn-kibi:type',
                          literal(type('http://www.w3.org/2001/XMLSchema#string', TypeString)), Graph),
        forall(member(Key=Value, [id=Id|Props]), kb:store_property(EntityUri, Key, Value, Graph))
    )).

ds_subject(Id, Key) :- ds_subject(Id, Key, []).
ds_subject(Id, Key, Extra) :-
    format(string(Source), "kb/~w.md", [Id]),
    ds_raw(fact, Id, [title="Subject", status=active, fact_kind=subject,
                      subject_key=Key, source=Source|Extra]).

%% ds_req(+Id, +Status, +Entries)
% A requirement whose semantic_inventory holds Entries, each a dict.
ds_req(Id, Status, Entries) :-
    with_output_to(string(Json), json_write_dict(current_output, Entries, [width(0)])),
    format(string(Source), "kb/~w.md", [Id]),
    ds_raw(req, Id, [title="Req", status=Status, source=Source, semantic_inventory=Json]).

ds_claim(Key, Role, Status, Subjects,
         _{claim_key: Key, claim_text: "The claim", role: Role, status: Status, subjects: Subjects}).

%% ds_must(+Id, +Entries)
% A current must requirement whose semantic_inventory holds Entries.
ds_must(Id, Entries) :-
    with_output_to(string(Json), json_write_dict(current_output, Entries, [width(0)])),
    format(string(Source), "kb/~w.md", [Id]),
    ds_raw(req, Id, [title="Req", status=open, priority=must, source=Source, semantic_inventory=Json]).

ds_scenario(Id, Expects, Status) :-
    format(string(Source), "kb/~w.md", [Id]),
    ds_raw(scenario, Id, [title="Scenario", status=Status, expects=Expects, source=Source]).

ds_value(Id, Key) :-
    ds_raw(fact, Id, [title="Value", status=active, fact_kind=property_value,
                      subject_key=Key, property_key="count"]).

ds_kb(Goal) :- with_fixture_kb(once(Goal)).

%% ds_req(+Id, +Entries, +Reviews, +Extra)
% A current requirement with a semantic_inventory, pair_reviews and Extra
% properties.
ds_req(Id, Entries, Reviews, Extra) :-
    with_output_to(string(Json), json_write_dict(current_output, Entries, [width(0)])),
    with_output_to(string(ReviewJson), json_write_dict(current_output, Reviews, [width(0)])),
    format(string(Source), "kb/~w.md", [Id]),
    append([title="Req", status=open, source=Source, semantic_inventory=Json,
            pair_reviews=ReviewJson], Extra, Props),
    ds_raw(req, Id, Props).

ds_gaps(Gaps) :-
    findall(R-O-Via-Claims-Problem, unmodeled_pair_gap(R, O, Via, Claims, Problem), Gaps0),
    sort(Gaps0, Gaps).

ds_rules(Violations, Rules) :-
    findall(Rule-Entity, member(violation(Rule, Entity, _, _, _, _), Violations), Rules).

%% ds_json(+Text, -Dict)
% The domain view, decoded once more when it arrives as a JSON string.
ds_json(Text, Dict) :-
    atom_json_dict(Text, D0, [value_string_as(atom)]),
    (   atom(D0) -> atom_json_dict(D0, Dict, [value_string_as(atom)]) ; Dict = D0 ).

ds_problem(ReqId, Other, ClaimKeys, Owner, Review, Problem) :-
    domain_subjects:pair_review_problem(ReqId, Other, ClaimKeys, Owner, Review, Problem).

:- begin_tests(domain_subjects).

test(defined_skips_inactive, Keys == [cart]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_subject('F-OLD', "old", []),
        ds_raw(fact, 'F-OLD', [title="Old", status=archived, fact_kind=subject, subject_key="old"]),
        findall(K, subject_defined(K, _), Keys0),
        sort(Keys0, Keys)
    )).

test(broader_is_nearest_defined_prefix_or_declared, Pairs == ['shop.cart'-shop, 'shop.cart'-store, 'shop.cart.line'-'shop.cart']) :-
    ds_kb((
        ds_subject('F-SHOP', "shop"),
        ds_subject('F-STORE', "store"),
        ds_subject('F-CART', "shop.cart", [part_of=["store", "missing"]]),
        ds_subject('F-LINE', "shop.cart.line"),
        findall(K-B, (member(K, ['shop.cart.line', 'shop.cart']), subject_broader(K, B)), Pairs0),
        msort(Pairs0, Pairs)
    )).

test(ancestors_survive_cycles, Ancestors == [a, b]) :-
    ds_kb((
        ds_subject('F-A', "a", [kind_of=["b"]]),
        ds_subject('F-B', "b", [kind_of=["a"]]),
        ds_subject('F-C', "c", [part_of=["a"]]),
        findall(X, subject_ancestor(c, X), Ancestors0),
        sort(Ancestors0, Ancestors)
    )).

test(requirement_subjects_by_link_and_anchor, Vias == [cart-anchor('C1'), cart-constrains('F-CART'), price-grounds('F-PRICE')]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_raw(fact, 'F-PRICE', [title="Price", status=active, fact_kind=property_value,
                                 subject_key="price", property_key="max"]),
        ds_claim('C1', normative, ontology_gap, ["cart"], E1),
        ds_req('REQ-A', open, [E1]),
        fixture_rel(constrains, 'REQ-A', 'F-CART'),
        fixture_rel(requires_property, 'REQ-A', 'F-PRICE'),
        findall(K-V, requirement_subject('REQ-A', K, V), Vias0),
        msort(Vias0, Vias)
    )).

test(pairs_share_a_subject_or_its_ancestor, Pairs == [pair('REQ-A', 'REQ-B', cart), pair('REQ-A', 'REQ-C', cart), pair('REQ-B', 'REQ-C', cart)]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_subject('F-LINE', "cart.line"),
        ds_claim('C1', normative, ambiguous, ["cart"], E1),
        ds_claim('C2', condition, missing, ["cart"], E2),
        ds_claim('C3', normative, missing, ["cart.line"], E3),
        ds_req('REQ-A', open, [E1]),
        ds_req('REQ-B', closed, [E2]),
        ds_req('REQ-C', in_progress, [E3]),
        ds_req('REQ-GONE', superseded, [E1]),
        findall(pair(A, B, K), requirement_subject_pair(A, B, K), Pairs0),
        sort(Pairs0, Pairs)
    )).

test(claim_subject_missing, Rules == ['claim-subject-missing'-'REQ-BARE']) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_claim('C1', normative, ontology_gap, [], Bare),
        ds_claim('C2', normative, ontology_gap, ["cart"], Anchored),
        ds_claim('C3', normative, modeled, [], Modeled),
        ds_claim('C4', descriptive, missing, [], Descriptive),
        ds_req('REQ-BARE', open, [Bare]),
        ds_req('REQ-ANCHORED', open, [Anchored]),
        ds_req('REQ-MODELED', open, [Modeled, Descriptive]),
        ds_req('REQ-OLD', superseded, [Bare]),
        check_claim_subject_missing(Violations),
        ds_rules(Violations, Rules)
    )).

test(claim_subject_missing_evidence, Evidence == ['C1'-normative-ontology_gap]) :-
    ds_kb((
        ds_claim('C1', normative, ontology_gap, [], Bare),
        ds_req('REQ-BARE', open, [Bare]),
        check_claim_subject_missing([violation(_, _, _, _, _, E)]),
        get_dict(claimKey, E, K), get_dict(role, E, R), get_dict(status, E, S),
        Evidence = [K-R-S]
    )).

test(claim_subject_undefined, Rules == ['claim-subject-undefined'-'F-CART', 'claim-subject-undefined'-'REQ-A']) :-
    ds_kb((
        ds_subject('F-CART', "cart", [part_of=["shop"], distinct_from=["basket"]]),
        ds_subject('F-BASKET', "basket"),
        ds_claim('C1', normative, ambiguous, ["cart", "nowhere"], E1),
        ds_req('REQ-A', open, [E1]),
        ds_req('REQ-OLD', superseded, [E1]),
        check_claim_subject_undefined(Violations),
        ds_rules(Violations, Rules)
    )).

test(domain_json, Summary == [true, ['REQ-A'], ['shop.cart.line'], [shop]]) :-
    ds_kb((
        ds_subject('F-SHOP', "shop"),
        ds_subject('F-CART', "shop.cart"),
        ds_subject('F-LINE', "shop.cart.line"),
        ds_claim('C1', normative, ambiguous, ["shop.cart"], E1),
        ds_req('REQ-A', open, [E1]),
        subject_domain_json('shop.cart', Text),
        ds_json(Text, D),
        get_dict(requirements, D, Rows),
        findall(R, (member(Q, Rows), get_dict(id, Q, R)), Reqs),
        get_dict(defined, D, Defined), get_dict(narrower, D, Narrower),
        get_dict(broader, D, Broader),
        Summary = [Defined, Reqs, Narrower, Broader]
    )).

test(positive_scenario_gaps, Gaps == [
        'REQ-INACTIVE'-no_success_scenario-[cart]-[],
        'REQ-NOASSUME'-no_subject_assumption-[cart]-['SCEN-OTHER'],
        'REQ-NONE'-no_subjects-[]-[],
        'REQ-NOSCEN'-no_success_scenario-[cart]-[]
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_subject('F-LINE', "cart.line"),
        ds_subject('F-PRICE', "price"),
        ds_value('V-CART', "cart"),
        ds_value('V-LINE', "cart.line"),
        ds_value('V-PRICE', "price"),
        ds_claim('C0', normative, ontology_gap, [], Bare),
        ds_claim('C1', normative, ontology_gap, ["cart"], Cart),
        ds_must('REQ-NONE', [Bare]),
        ds_must('REQ-NOSCEN', [Cart]),
        ds_scenario('SCEN-REJ', rejection, active),
        fixture_rel(specified_by, 'REQ-NOSCEN', 'SCEN-REJ'),
        fixture_rel(assumes, 'SCEN-REJ', 'V-CART'),
        ds_must('REQ-NOASSUME', [Cart]),
        ds_scenario('SCEN-OTHER', success, active),
        fixture_rel(specified_by, 'REQ-NOASSUME', 'SCEN-OTHER'),
        fixture_rel(assumes, 'SCEN-OTHER', 'V-PRICE'),
        ds_must('REQ-NARROW', [Cart]),
        ds_scenario('SCEN-NARROW', success, active),
        fixture_rel(specified_by, 'REQ-NARROW', 'SCEN-NARROW'),
        fixture_rel(assumes, 'SCEN-NARROW', 'V-LINE'),
        ds_must('REQ-EXACT', [Cart]),
        ds_scenario('SCEN-EXACT', success, active),
        fixture_rel(specified_by, 'REQ-EXACT', 'SCEN-EXACT'),
        fixture_rel(assumes, 'SCEN-EXACT', 'V-CART'),
        ds_must('REQ-INACTIVE', [Cart]),
        ds_scenario('SCEN-OLD', success, deprecated),
        fixture_rel(specified_by, 'REQ-INACTIVE', 'SCEN-OLD'),
        fixture_rel(assumes, 'SCEN-OLD', 'V-CART'),
        ds_req('REQ-SHOULD', open, [Cart]),
        findall(R-Why-Subjects-Scenarios,
                positive_scenario_gap(R, Why, Subjects, Scenarios),
                Gaps0),
        msort(Gaps0, Gaps)
    )).

test(positive_scenario_via, Found == ['REQ-EXACT'-'SCEN-EXACT'-cart, 'REQ-NARROW'-'SCEN-NARROW'-cart]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_subject('F-LINE', "cart.line"),
        ds_value('V-CART', "cart"),
        ds_value('V-LINE', "cart.line"),
        ds_raw(fact, 'V-GONE', [title="Gone", status=archived, fact_kind=property_value,
                                subject_key="cart", property_key="count"]),
        ds_claim('C1', normative, ontology_gap, ["cart"], Cart),
        ds_must('REQ-NARROW', [Cart]),
        ds_scenario('SCEN-NARROW', success, active),
        fixture_rel(specified_by, 'REQ-NARROW', 'SCEN-NARROW'),
        fixture_rel(assumes, 'SCEN-NARROW', 'V-LINE'),
        ds_must('REQ-EXACT', [Cart]),
        ds_scenario('SCEN-EXACT', success, active),
        fixture_rel(specified_by, 'REQ-EXACT', 'SCEN-EXACT'),
        fixture_rel(assumes, 'SCEN-EXACT', 'V-CART'),
        ds_must('REQ-ARCHIVED', [Cart]),
        ds_scenario('SCEN-ARCHIVED', success, active),
        fixture_rel(specified_by, 'REQ-ARCHIVED', 'SCEN-ARCHIVED'),
        fixture_rel(assumes, 'SCEN-ARCHIVED', 'V-GONE'),
        findall(R-S-K, positive_scenario(R, S, K), Found0),
        sort(Found0, Found)
    )).

test(positive_scenario_gaps_json, Summary == [2, ['REQ-NOSCEN'-no_success_scenario]]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_value('V-CART', "cart"),
        ds_claim('C1', normative, ontology_gap, ["cart"], Cart),
        ds_must('REQ-NOSCEN', [Cart]),
        ds_must('REQ-EXACT', [Cart]),
        ds_scenario('SCEN-EXACT', success, active),
        fixture_rel(specified_by, 'REQ-EXACT', 'SCEN-EXACT'),
        fixture_rel(assumes, 'SCEN-EXACT', 'V-CART'),
        positive_scenario_gaps_json(Text),
        ds_json(Text, D),
        get_dict(evaluated, D, Evaluated),
        get_dict(rows, D, Rows),
        findall(Id-Reason, (member(Row, Rows), get_dict(id, Row, Id), get_dict(reason, Row, Reason)), Pairs),
        Summary = [Evaluated, Pairs]
    )).


test(subject_facts_need_a_key, Keys == [cart]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_subject('F-BLANK', ""),
        ds_raw(fact, 'F-NOKEY', [title="No key", status=active, fact_kind=subject]),
        findall(K, subject_defined(K, _), Keys0),
        sort(Keys0, Keys)
    )).

% The index is memoized per store: a second store whose RDF generation
% matches the first one's never reads the first store's subjects.
test(index_belongs_to_its_store, Keys == [[cart], [shop]]) :-
    findall(Ks,
            (   member(Key, ["cart", "shop"]),
                ds_kb((
                    ds_subject('F-ONE', Key),
                    findall(K, subject_defined(K, _), Ks)
                ))
            ),
            Keys).

test(index_follows_writes, Keys == [[cart], [cart, shop]]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        findall(K, subject_defined(K, _), Before),
        ds_subject('F-SHOP', "shop"),
        findall(K, subject_defined(K, _), After),
        Keys = [Before, After]
    )).

test(undefined_relation_messages, Descriptions == [
        "Subject cart (F-CART) names shop as a broader subject under part_of, but no active subject fact defines shop, so cart does not nest under it",
        "Subject cart (F-CART) says under distinct_from that it is not basket, which no active subject fact defines"
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart", [part_of=["shop"], distinct_from=["basket"]]),
        check_claim_subject_undefined(Violations),
        findall(D, member(violation(_, _, D, _, _, _), Violations), Descriptions0),
        msort(Descriptions0, Descriptions)
    )).

test(claim_subject_undefined_suggestions, Suggestions == [
        "Define nowhere as a subject fact (fact_kind subject, subject_key nowhere) whose body says what it is and what it is not, or name an existing subject instead",
        "Define shop as a subject fact, or remove it from part_of of F-CART"
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart", [part_of=["shop"]]),
        ds_claim('C1', normative, ambiguous, ["nowhere"], E1),
        ds_req('REQ-A', open, [E1]),
        check_claim_subject_undefined(Violations),
        findall(S, member(violation(_, _, _, S, _, _), Violations), Suggestions0),
        msort(Suggestions0, Suggestions)
    )).

% A part_of cycle lists the other subject as broader, never also as
% narrower (nor its requirements as requirements on a narrower subject), and
% the view never lists a subject under itself.
test(domain_json_cycle, Summary == [[b], [b], [], []]) :-
    ds_kb((
        ds_subject('F-A', "a", [part_of=["b"]]),
        ds_subject('F-B', "b", [part_of=["a"]]),
        ds_claim('C1', normative, ambiguous, ["b"], E1),
        ds_req('REQ-B', open, [E1]),
        subject_domain_json(a, Text),
        ds_json(Text, D),
        get_dict(broader, D, Broader),
        get_dict(ancestors, D, Ancestors),
        get_dict(narrower, D, Narrower),
        get_dict(requirements, D, Rows),
        findall(R, (member(Q, Rows), get_dict(id, Q, R)), Reqs),
        Summary = [Broader, Ancestors, Narrower, Reqs]
    )).

test(domain_json_lists_claims_and_unmodeled_claims, Summary == [
        false,
        ['V-LINE'-property_value-'cart.line'-['REQ-G']],
        ['REQ-A'-'C1'-'cart.extra'-ontology_gap-normative-"The claim"],
        ['SCEN-S'],
        ['REQ-A', 'REQ-G'],
        [basket],
        ['F-CART'-"Subject"-"kb/F-CART.md"-[]-[thing]]
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart", [distinct_from=["basket"], kind_of=["thing"]]),
        ds_subject('F-LINE', "cart.line"),
        ds_subject('F-THING', "thing"),
        ds_value('V-LINE', "cart.line"),
        ds_raw(fact, 'V-OLD', [title="Old", status=archived, fact_kind=property_value,
                               subject_key="cart", property_key="count"]),
        % An anchor on an undefined narrower key still belongs to the view.
        ds_claim('C1', normative, ontology_gap, ["cart.extra"], E1),
        ds_claim('C2', normative, modeled, ["cart"], E2),
        ds_req('REQ-A', open, [E1, E2]),
        ds_raw(req, 'REQ-G', [title="G", status=open]),
        fixture_rel(requires_property, 'REQ-G', 'V-LINE'),
        ds_scenario('SCEN-S', success, active),
        fixture_rel(assumes, 'SCEN-S', 'V-LINE'),
        subject_domain_json(cart, Text),
        ds_json(Text, D),
        get_dict(claims, D, Claims),
        findall(I-K-S-Rs, (member(C, Claims), get_dict(id, C, I), get_dict(factKind, C, K),
                           get_dict(subjectKey, C, S), get_dict(requirements, C, Rs)), ClaimSummary),
        get_dict(unmodeledClaims, D, Unmodeled),
        findall(R-CK-SK-St-Ro-Tx,
                (   member(U, Unmodeled), get_dict(requirement, U, R), get_dict(claimKey, U, CK),
                    get_dict(subjectKey, U, SK), get_dict(status, U, St), get_dict(role, U, Ro),
                    get_dict(claimText, U, Tx0), atom_string(Tx0, Tx)
                ),
                UnmodeledSummary),
        get_dict(scenarios, D, Scenarios),
        findall(Sc, (member(X, Scenarios), get_dict(id, X, Sc)), ScenarioIds),
        get_dict(requirements, D, Rows),
        findall(R, (member(Q, Rows), get_dict(id, Q, R)), Reqs),
        get_dict(distinctFrom, D, Distinct),
        get_dict(subjectFacts, D, Facts),
        findall(Id-Ti-So-Po-Ko,
                (   member(F, Facts), get_dict(id, F, Id), get_dict(title, F, Ti0), atom_string(Ti0, Ti),
                    get_dict(source, F, So0), atom_string(So0, So), get_dict(partOf, F, Po), get_dict(kindOf, F, Ko)
                ),
                FactSummary),
        subject_domain_json(nowhere, Missing),
        ds_json(Missing, M),
        get_dict(defined, M, MissingDefined),
        Summary = [MissingDefined, ClaimSummary, UnmodeledSummary, ScenarioIds, Reqs, Distinct, FactSummary]
    )).

test(domain_json_requirement_via, Via == [
        [claimKey-'C1', link-anchor, subjectKey-cart],
        [factId-'F-CART', link-constrains, subjectKey-cart],
        [factId-'V-LINE', link-grounds, subjectKey-'cart.line']
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_subject('F-LINE', "cart.line"),
        ds_value('V-LINE', "cart.line"),
        ds_claim('C1', normative, ontology_gap, ["cart"], E1),
        ds_req('REQ-A', open, [E1]),
        fixture_rel(constrains, 'REQ-A', 'F-CART'),
        fixture_rel(requires_property, 'REQ-A', 'V-LINE'),
        subject_domain_json(cart, Text),
        ds_json(Text, D),
        get_dict(requirements, D, [Row]),
        get_dict(via, Row, Vias),
        findall(Pairs, (member(V, Vias), dict_pairs(V, _, Pairs)), Via0),
        msort(Via0, Via),
        get_dict(title, Row, 'Req'),
        get_dict(status, Row, open)
    )).

% A requirement on a narrower subject meets the requirements on a broader
% one, as the check pairs them.
test(subject_neighbours, Summary == [
        ['report.export.pdf'-true-['F-PDF']-['REQ-BROAD', 'REQ-NARROW'], nowhere-false-[]-[]],
        ['REQ-GONE', 'REQ-TYPO']
    ]) :-
    ds_kb((
        ds_subject('F-REPORT', "report.export"),
        ds_subject('F-PDF', "report.export.pdf"),
        ds_subject('F-OTHER', "report.import"),
        ds_claim('C1', normative, ontology_gap, ["report.export"], Broad),
        ds_claim('C2', normative, ontology_gap, ["report.export.pdf.page"], Narrow),
        ds_claim('C3', normative, ontology_gap, ["report.export.pdf"], Self),
        ds_claim('C4', normative, ontology_gap, ["report.import"], Other),
        ds_req('REQ-BROAD', open, [Broad]),
        ds_req('REQ-NARROW', open, [Narrow]),
        ds_req('REQ-SELF', open, [Self]),
        ds_req('REQ-OTHER', open, [Other]),
        ds_raw(req, 'REQ-GONE', [title="Gone", status=deprecated]),
        subject_neighbours_json(["report.export.pdf", nowhere], 'REQ-SELF', ['REQ-OTHER', "REQ-GONE", 'REQ-TYPO'], Text),
        ds_json(Text, D),
        get_dict(subjects, D, Subjects),
        findall(K-Def-Facts-Reqs,
                (   member(S, Subjects), get_dict(subjectKey, S, K), get_dict(defined, S, Def),
                    get_dict(subjectFacts, S, Fs), findall(F, (member(X, Fs), get_dict(id, X, F)), Facts),
                    get_dict(requirements, S, Rs), findall(R, (member(Y, Rs), get_dict(id, Y, R)), Reqs)
                ),
                SubjectSummary),
        get_dict(notCurrent, D, NotCurrent),
        Summary = [SubjectSummary, NotCurrent]
    )).

% Assuming the subject fact itself states no behaviour; an undefined subject
% asks for its definition first.
test(positive_scenario_needs_a_claim_fact, Gaps == [
        'REQ-SUBJECT'-no_subject_assumption-[cart]-['SCEN-SUBJECT'],
        'REQ-UNDEFINED'-undefined_subjects-['text.nothing']-[]
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_claim('C1', normative, ontology_gap, ["cart"], Cart),
        ds_claim('C2', normative, ontology_gap, ["text.nothing"], Nothing),
        ds_must('REQ-SUBJECT', [Cart]),
        ds_scenario('SCEN-SUBJECT', success, active),
        fixture_rel(specified_by, 'REQ-SUBJECT', 'SCEN-SUBJECT'),
        fixture_rel(assumes, 'SCEN-SUBJECT', 'F-CART'),
        ds_must('REQ-UNDEFINED', [Nothing]),
        findall(R-Why-Subjects-Scenarios,
                positive_scenario_gap(R, Why, Subjects, Scenarios),
                Gaps0),
        msort(Gaps0, Gaps)
    )).

% --- related-requirement-unmodeled: unmodeled claims in a stored pair ------

test(unmodeled_pairs_by_edge_and_subject, Gaps == [
        'REQ-A'-'REQ-B'-[subject(cart)]-['C-A']-unreviewed,
        'REQ-A'-'REQ-M'-[subject(cart)]-['C-A']-unreviewed,
        'REQ-A'-'REQ-N'-[subject(cart)]-['C-A']-unreviewed,
        'REQ-B'-'REQ-A'-[subject(cart)]-['C-B']-unreviewed,
        'REQ-B'-'REQ-M'-[subject(cart)]-['C-B']-unreviewed,
        'REQ-B'-'REQ-N'-[subject(cart)]-['C-B']-unreviewed,
        'REQ-E'-'REQ-M'-[relates_to]-['C-E1', 'C-E2']-unreviewed,
        'REQ-N'-'REQ-A'-[subject(cart)]-['C-N']-unreviewed,
        'REQ-N'-'REQ-B'-[subject(cart)]-['C-N']-unreviewed,
        'REQ-N'-'REQ-M'-[subject(cart)]-['C-N']-unreviewed
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_subject('F-LINE', "cart.line"),
        ds_subject('F-TAX', "tax"),
        ds_claim('C-A', normative, ontology_gap, ["cart"], A),
        ds_claim('C-B', condition, ambiguous, ["cart"], B),
        % A claim on a narrower subject meets the broader one.
        ds_claim('C-N', normative, missing, ["cart.line"], N),
        % A modeled claim and a claim on another subject never count.
        ds_claim('C-OK', normative, modeled, ["cart"], OK),
        ds_claim('C-TAX', normative, missing, ["tax"], Tax),
        ds_req('REQ-A', [A, OK], [], []),
        ds_req('REQ-B', [B, Tax], [], []),
        ds_req('REQ-N', [N], [], []),
        % A relates_to edge counts every unmodeled claim, whatever its subject.
        ds_claim('C-E1', normative, missing, [], E1),
        ds_claim('C-E2', condition, ontology_gap, [], E2),
        % A rationale claim carries no rule, so it never counts.
        ds_claim('C-WHY', rationale, ontology_gap, [], Why),
        ds_req('REQ-E', [E1, E2, Why], [], []),
        ds_req('REQ-M', [OK], [], []),
        fixture_rel(relates_to, 'REQ-M', 'REQ-E'),
        % Neither a retired partner nor a self edge pairs.
        ds_raw(req, 'REQ-OLD', [title="Old", status=superseded]),
        fixture_rel(relates_to, 'REQ-E', 'REQ-OLD'),
        fixture_rel(relates_to, 'REQ-E', 'REQ-E'),
        ds_gaps(Gaps)
    )).

test(pair_review_problems, Problems == [
        conflict, no_edge, no_verdict, unapproved,
        missing(separated_by), stale(['C-A']), unknown_verdict(maybe),
        missing(resolved_by, ['SCEN-GONE'-unknown])
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_claim('C-A', normative, ontology_gap, ["cart"], A),
        ds_req('REQ-A', [A], [], []),
        ds_req('REQ-B', [], [], [priority=must]),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        ds_req('REQ-LONE', [], [], []),
        findall(Problem, (
            member(Review-Other, [
                _{with: 'REQ-B'}-'REQ-B',
                _{with: 'REQ-B', verdict: maybe}-'REQ-B',
                _{with: 'REQ-B', verdict: conflict}-'REQ-B',
                _{with: 'REQ-LONE', verdict: no_conflict, separated_by: "x"}-'REQ-LONE',
                _{with: 'REQ-B', verdict: no_conflict, separated_by: "  "}-'REQ-B',
                _{with: 'REQ-B', verdict: interacts, resolved_by: ['SCEN-GONE']}-'REQ-B',
                _{with: 'REQ-B', verdict: no_conflict, separated_by: "only on checkout", claims: [_{claim_key: 'C-OTHER'}], origin: _{kind: human}}-'REQ-B',
                _{with: 'REQ-B', verdict: no_conflict, separated_by: "only on checkout", claims: ['C-A'], origin: _{kind: agent}}-'REQ-B'
            ]),
            ds_problem('REQ-A', Other, ['C-A'], 'REQ-A', Review, Problem)
        ), Problems0),
        msort(Problems0, Problems),
        % Settled: a human no_conflict, an agent one a person approved.  A
        % payload_hash in the review is accepted and plays no part.
        forall(member(Review, [
                   _{with: 'REQ-B', verdict: no_conflict, separated_by: "only on checkout", claims: ['C-A'], origin: _{kind: human}},
                   _{with: 'REQ-B', verdict: no_conflict, separated_by: "only on checkout", claims: [_{claim_key: 'C-A', payload_hash: old}], origin: _{kind: agent, approved_by: maintainer}}
               ]),
               \+ ds_problem('REQ-A', 'REQ-B', ['C-A'], 'REQ-A', Review, _))
    )).

test(interacts_resolvers, Results == [
        'REQ-A'-false, 'REQ-B'-false, 'SCEN-OLD'-false, 'SCEN-LOOSE'-false,
        'C-NORM'-false, 'F-LOOSE'-false, 'REQ-OLD'-false,
        'SCEN-BOTH'-true, 'C-B'-true, 'C-EXC'-true, 'F-CART'-true, 'REQ-THIRD'-true
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_subject('F-LOOSE', "loose"),
        ds_claim('C-A', normative, ontology_gap, [], A),
        ds_claim('C-NORM', normative, modeled, [], Norm),
        ds_claim('C-B', condition, modeled, [], B),
        ds_claim('C-EXC', exception, modeled, [], Exc),
        ds_req('REQ-A', [A, Norm], [], []),
        ds_req('REQ-B', [B, Exc], [], []),
        ds_req('REQ-THIRD', [], [], []),
        ds_raw(req, 'REQ-OLD', [title="Old", status=deprecated]),
        ds_scenario('SCEN-BOTH', success, active),
        ds_scenario('SCEN-OLD', success, retired),
        ds_scenario('SCEN-LOOSE', success, active),
        fixture_rel(specified_by, 'REQ-B', 'SCEN-BOTH'),
        fixture_rel(specified_by, 'REQ-A', 'SCEN-OLD'),
        fixture_rel(constrains, 'REQ-B', 'F-CART'),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        findall(Resolver-Result, (
            member(Resolver, ['REQ-A', 'REQ-B', 'SCEN-OLD', 'SCEN-LOOSE', 'C-NORM', 'F-LOOSE', 'REQ-OLD',
                              'SCEN-BOTH', 'C-B', 'C-EXC', 'F-CART', 'REQ-THIRD']),
            Review = _{with: 'REQ-B', verdict: interacts, resolved_by: [Resolver], claims: ['C-A'], origin: _{kind: human}},
            (   ds_problem('REQ-A', 'REQ-B', ['C-A'], 'REQ-A', Review, _)
            ->  Result = false
            ;   Result = true
            )
        ), Results)
    )).

test(resolved_by_reads_one_atom_or_a_list, Results == [true, true, false]) :-
    ds_kb((
        ds_claim('C-A', normative, ontology_gap, [], A),
        ds_req('REQ-A', [A], [], []),
        ds_req('REQ-B', [], [], []),
        ds_req('REQ-THIRD', [], [], []),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        findall(Result, (
            member(Resolvers, ['REQ-THIRD', ['REQ-THIRD', ""], ['REQ-THIRD', 'REQ-A']]),
            Review = _{with: 'REQ-B', verdict: interacts, resolved_by: Resolvers, claims: ['C-A'], origin: _{kind: human}},
            (   ds_problem('REQ-A', 'REQ-B', ['C-A'], 'REQ-A', Review, _)
            ->  Result = false
            ;   Result = true
            )
        ), Results)
    )).

test(agent_review_needs_approval_only_on_decisive_pairs, Results == [true, true, false]) :-
    ds_kb((
        ds_claim('C-A', normative, ontology_gap, [], A),
        ds_req('REQ-A', [A], [], [origin="{\"kind\":\"agent\"}"]),
        ds_req('REQ-FIRM', [], [], [firmness=firm, origin="{\"kind\":\"agent\"}"]),
        ds_req('REQ-HUMAN', [], [], []),
        ds_req('REQ-SOFT', [], [], [origin="{\"kind\":\"agent\"}"]),
        forall(member(O, ['REQ-FIRM', 'REQ-HUMAN', 'REQ-SOFT']), fixture_rel(relates_to, 'REQ-A', O)),
        findall(Result, (
            member(Other, ['REQ-FIRM', 'REQ-HUMAN', 'REQ-SOFT']),
            Review = _{with: Other, verdict: no_conflict, separated_by: "x", claims: ['C-A']},
            (   ds_problem('REQ-A', Other, ['C-A'], Other, Review, unapproved)
            ->  Result = true
            ;   Result = false
            )
        ), Results)
    )).

% A requirement an agent wrote cannot vouch for a person: origin.kind human
% on a review recorded there still needs approved_by on a decisive pair.
test(human_review_on_an_agent_requirement_needs_approval, Results == [unapproved, settled, settled]) :-
    ds_kb((
        ds_claim('C-A', normative, ontology_gap, [], A),
        ds_req('REQ-AGENT', [A], [], [origin="{\"kind\":\"agent\"}"]),
        ds_req('REQ-PERSON', [A], [], []),
        ds_req('REQ-MUST', [], [], [priority=must]),
        fixture_rel(relates_to, 'REQ-AGENT', 'REQ-MUST'),
        fixture_rel(relates_to, 'REQ-PERSON', 'REQ-MUST'),
        Human = _{with: 'REQ-MUST', verdict: no_conflict, separated_by: "x", claims: ['C-A'], origin: _{kind: human}},
        Approved = _{with: 'REQ-MUST', verdict: no_conflict, separated_by: "x", claims: ['C-A'], origin: _{kind: human, approved_by: lead}},
        findall(Result, (
            member(Owner-Review, ['REQ-AGENT'-Human, 'REQ-PERSON'-Human, 'REQ-AGENT'-Approved]),
            (   ds_problem(Owner, 'REQ-MUST', ['C-A'], Owner, Review, Problem)
            ->  Result = Problem
            ;   Result = settled
            )
        ), Results)
    )).

test(review_on_either_side_settles_or_reports, Gaps == ['REQ-A'-'REQ-C'-[relates_to]-['C-A']-stale(['C-A'])]) :-
    ds_kb((
        ds_claim('C-A', normative, ontology_gap, [], A),
        Good = _{with: 'REQ-A', verdict: no_conflict, separated_by: "x", claims: ['C-A'], origin: _{kind: human}},
        Stale = _{with: 'REQ-A', verdict: no_conflict, separated_by: "x", claims: ['C-OTHER'], origin: _{kind: human}},
        ds_req('REQ-A', [A], [], []),
        ds_req('REQ-B', [], [Good], []),
        ds_req('REQ-C', [], [Stale], []),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        fixture_rel(relates_to, 'REQ-C', 'REQ-A'),
        ds_gaps(Gaps)
    )).

% The review on the requirement itself decides which problem is reported,
% whatever order the store lists them in.
test(own_review_is_reported_first, Gaps == ['REQ-B'-'REQ-A'-[relates_to]-['C-B']-missing(separated_by)]) :-
    ds_kb((
        ds_claim('C-B', normative, ontology_gap, [], B),
        Stale = _{with: 'REQ-B', verdict: no_conflict, separated_by: "x", claims: ['C-OTHER'], origin: _{kind: human}},
        Unseparated = _{with: 'REQ-A', verdict: no_conflict, claims: ['C-B'], origin: _{kind: human}},
        ds_req('REQ-A', [], [Stale], []),
        ds_req('REQ-B', [B], [Unseparated], []),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        ds_gaps(Gaps)
    )).

test(conflict_on_one_side_outweighs_no_conflict_on_the_other,
     Gaps == ['REQ-A'-'REQ-B'-[relates_to]-['C-A']-conflict]) :-
    ds_kb((
        ds_claim('C-A', normative, ontology_gap, [], A),
        Settled = _{with: 'REQ-B', verdict: no_conflict, separated_by: "x", claims: ['C-A'], origin: _{kind: human}},
        Conflict = _{with: 'REQ-A', verdict: conflict, claims: ['C-A'], origin: _{kind: human}},
        ds_req('REQ-A', [A], [Settled], []),
        ds_req('REQ-B', [], [Conflict], []),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        ds_gaps(Gaps)
    )).

test(related_requirement_unmodeled_violation_text, [Description, Suggestion, Source, Evidence] == [
        "Requirement REQ-A has 1 unmodeled claim(s) (C-A) that nothing compares with 1 requirement(s) it pairs with: REQ-B (through a relates_to edge and shared subject cart); no verdict records how they combine",
        "Model the unmodeled claims of REQ-A on the subject keys the requirements it pairs with (REQ-B) constrain (facts via kb_model, then requires_property, requires_predicate or requires_rule), or supersede one requirement of a pair; to settle a pair that cannot be modeled, keep or add a relates_to link and add a pair_reviews entry on REQ-A for it, e.g. with: REQ-B, verdict (no_conflict with separated_by, interacts with resolved_by, or conflict), claims (the claim_key of each unmodeled claim of both) and origin",
        'REQ-A.md',
        [claimKeys-['C-A'], partners-['REQ-B'], problem-unreviewed]
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_claim('C-A', normative, ontology_gap, ["cart"], A),
        ds_req('REQ-A', [A], [], []),
        ds_raw(req, 'REQ-B', [title="B", status=open]),
        fixture_rel(constrains, 'REQ-B', 'F-CART'),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        check_related_requirement_unmodeled([violation('related-requirement-unmodeled', 'REQ-A', Description, Suggestion, Source, EvidenceDict)]),
        dict_pairs(EvidenceDict, _, Evidence)
    )).

% One violation per requirement and problem kind, however many requirements
% it pairs with: the partners are listed (the first eight, then a count),
% the claims are the union over the listed pairs.
test(one_violation_per_requirement_and_problem_kind, Summary == [
        'REQ-HUB'-unreviewed-10-['C-H1', 'C-H2'],
        'REQ-HUB'-stale-1-['C-H1', 'C-H2']
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_claim('C-H1', normative, ontology_gap, ["cart"], H1),
        ds_claim('C-H2', condition, ambiguous, ["cart"], H2),
        ds_req('REQ-HUB', [H1, H2], [_{with: 'REQ-P00', verdict: no_conflict, separated_by: "x", claims: [], origin: _{kind: human}}], []),
        forall(between(0, 10, I),
               (   format(atom(P), 'REQ-P~|~`0t~d~2+', [I]),
                   ds_raw(req, P, [title="P", status=open]),
                   fixture_rel(constrains, P, 'F-CART')
               )),
        fixture_rel(relates_to, 'REQ-HUB', 'REQ-P00'),
        check_related_requirement_unmodeled(Violations),
        findall(R-K-N-C,
                (   member(violation(_, R, _, _, _, E), Violations),
                    get_dict(problem, E, K),
                    get_dict(partners, E, Ps),
                    length(Ps, N),
                    get_dict(claimKeys, E, C)
                ),
                Summary0),
        msort(Summary0, Summary1),
        reverse(Summary1, Summary),
        member(violation(_, 'REQ-HUB', Unreviewed, _, _, UE), Violations),
        get_dict(problem, UE, unreviewed),
        sub_string(Unreviewed, _, _, _, "with 10 requirement(s) it pairs with: REQ-P01 (through shared subject cart), "),
        sub_string(Unreviewed, _, _, _, "REQ-P08 (through shared subject cart) (+2 more); no verdict records"),
        member(violation(_, 'REQ-HUB', Stale, _, _, SE), Violations),
        get_dict(problem, SE, stale),
        sub_string(Stale, _, _, _, "REQ-P00 (through a relates_to edge and shared subject cart); the pair review does not cover C-H1, C-H2 at their current text")
    )).

test(violation_notes_unclassified_and_dangling_reviews, Notes == [true, true]) :-
    ds_kb((
        ds_claim('C-D', descriptive, missing, [], D),
        ds_claim('C-N', normative, missing, [], N),
        ds_req('REQ-A', [D, N], [_{with: 'REQ-TYPO', verdict: no_conflict, separated_by: "x", claims: ['C-D'], origin: _{kind: human}}], []),
        ds_req('REQ-B', [], [], []),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        check_related_requirement_unmodeled([violation(_, 'REQ-A', Description, _, _, _)]),
        findall(Found,
                (   member(Text, [
                        "; C-D still has status missing although its role states no rule: model it, set status ontology_gap on it with a reason when no predicate can state it, or review it (status nonlogical is accepted only for rationale, example and subjective claims)",
                        "; its pair_reviews name REQ-TYPO, which is not a current requirement, so those reviews settle nothing (check the id)"
                    ]),
                    (   sub_string(Description, _, _, _, Text) -> Found = true ; Found = false )
                ),
                Notes)
    )).

test(problem_kinds_texts_and_suggestions, Kinds == [conflict, missing_resolved_by, missing_resolved_by, missing_separated_by, no_edge, no_verdict, stale, unapproved, unknown_verdict, unreviewed]) :-
    findall(K, (member(P, [unreviewed, no_verdict, unknown_verdict(x), conflict, no_edge,
                           missing(separated_by), missing(resolved_by), missing(resolved_by, []), stale(['C']), unapproved]),
                domain_subjects:problem_kind(P, K)), Kinds0),
    msort(Kinds0, Kinds),
    forall(member(K, Kinds), domain_subjects:kind_text(K, [unknown_verdict(x), stale(['C'])], _)),
    domain_subjects:kind_text(missing_resolved_by, [missing(resolved_by), missing(resolved_by, ['Z'-unknown, 'R'-pair]), missing(resolved_by, ['R'-pair])], RText),
    assertion(RText == "the interacts verdict does not name what resolves it (resolved_by): a third current requirement, a scenario or fact one of them links, or a condition or exception claim of either; its resolved_by names R, a requirement of the pair itself, which cannot resolve it; Z, which is none of those (check the id, and that it is current and linked to one of the pair)"),
    domain_subjects:kind_text(unknown_verdict, [unknown_verdict(b), unknown_verdict(a)], VText),
    assertion(VText == "the pair review has verdict a, b, which is not no_conflict, interacts or conflict"),
    forall(member(K, [conflict, no_edge, unapproved]),
           (   domain_subjects:kind_suggestion(K, 'R', 'O', 'O', S),
               assertion(sub_string(S, _, _, _, "R")),
               assertion(\+ sub_string(S, _, _, _, "Model the unmodeled"))
           )),
    domain_subjects:kind_suggestion(conflict, 'R', 'O1, O2', 'O1', C),
    assertion(C == "Ask the person which rule holds: supersede R or the requirement it conflicts with (O1, O2), or reword one so they no longer conflict; then model the claims or record a new verdict"),
    domain_subjects:kind_suggestion(no_edge, 'R', 'O1', 'O1', E),
    assertion(E == "Add a relates_to link between R and O1 so the verdict lives on the pair, or model the claims instead"),
    domain_subjects:kind_suggestion(unapproved, 'R', 'O1', 'O1', U),
    assertion(U == "Show the verdict on R and O1 to a person and set origin.approved_by on the pair review once they confirm it; never approve it yourself").

test(listed_atoms_cut_after_eight, Text == 'a, b, c, d, e, f, g, h (+2 more)') :-
    domain_subjects:listed_atoms([a, b, c, d, e, f, g, h, i, j], Text).

test(listed_atoms_keep_eight, Text == 'a, b, c, d, e, f, g, h') :-
    domain_subjects:listed_atoms([a, b, c, d, e, f, g, h], Text).

test(every_rule_role_needs_subjects, Keys == ['C-BLANK', 'C-DEF', 'C-EXC', 'C-NONE']) :-
    ds_kb((
        ds_claim('C-EXC', exception, missing, [], Exc),
        ds_claim('C-DEF', definition, ambiguous, [], Def),
        ds_claim('C-BLANK', normative, missing, [""], Blank),
        ds_req('REQ-A', open, [Exc, Def, Blank, _{claim_key: 'C-NONE', claim_text: "t", role: normative, status: missing}]),
        check_claim_subject_missing(Violations),
        findall(K, (member(violation(_, _, _, _, _, E), Violations), get_dict(claimKey, E, K)), Keys0),
        msort(Keys0, Keys)
    )).

test(subject_defined_names_its_fact, Facts == ['F-CART']) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_subject('F-SHOP', "shop"),
        findall(F, subject_defined(cart, F), Facts)
    )).

test(a_subject_is_never_broader_than_itself, Broader == [b]) :-
    ds_kb((
        ds_subject('F-A', "a", [part_of=["a", "b"]]),
        ds_subject('F-B', "b"),
        findall(B, subject_broader(a, B), Broader)
    )).

test(requirement_subjects_need_a_current_requirement_and_a_key, Vias == ['REQ-A'-cart-constrains('F-CART')]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_raw(fact, 'F-PRICE', [title="Price", status=active, fact_kind=property_value,
                                 subject_key="price", property_key="max"]),
        ds_raw(fact, 'F-BLANK', [title="Blank", status=active, fact_kind=property_value,
                                 subject_key="", property_key="max"]),
        ds_req('REQ-A', open, []),
        ds_req('REQ-OLD', superseded, []),
        fixture_rel(constrains, 'REQ-A', 'F-CART'),
        fixture_rel(requires_property, 'REQ-A', 'F-BLANK'),
        fixture_rel(constrains, 'REQ-OLD', 'F-CART'),
        fixture_rel(requires_property, 'REQ-OLD', 'F-PRICE'),
        findall(R-K-V, (member(R, ['REQ-A', 'REQ-OLD']), requirement_subject(R, K, V)), Vias0),
        msort(Vias0, Vias)
    )).

test(inventory_entries_read_every_stored_form, Results == [[a], [a], [[claim_key=c1]], [], [], []]) :-
    findall(Entries,
            (   member(Raw, [[a], "[\"a\"]", "[[claim_key=c1]]", "{\"a\":1}", "not a ledger (", 42]),
                domain_subjects:inventory_entries(Raw, Entries)
            ),
            Results).

test(entry_fields_of_dicts_and_pair_lists, Results == [normative, normative, none]) :-
    findall(Result,
            (   member(Entry, [_{role: normative}, [claim_key=c1, role=normative], [claim_key=c1]]),
                (   domain_subjects:entry_atom(Entry, role, Result0) -> Result = Result0 ; Result = none )
            ),
            Results).

test(raw_string_prints_any_value, Texts == ["abc", "s", "foo(x)"]) :-
    findall(T, (member(V, [abc, ^^("s", t), foo(x)]), domain_subjects:raw_string(V, T)), Texts).

test(claim_subject_missing_violation_text, Rows == [
        'REQ-A'-"Requirement REQ-A states \"\" (normative, missing) without naming the subjects it is about, so it is never compared with the other requirements on those subjects"-"Add `subjects: [<subject_key>, ...]` to inventory entry C1 of REQ-A, naming the defined subject facts the claim talks about (kb_query factKind subject lists them; define a missing one as a subject fact first), or model the claim"-"",
        'REQ-B'-"Requirement REQ-B states \"The claim\" (condition, ambiguous) without naming the subjects it is about, so it is never compared with the other requirements on those subjects"-"Add `subjects: [<subject_key>, ...]` to inventory entry C2 of REQ-B, naming the defined subject facts the claim talks about (kb_query factKind subject lists them; define a missing one as a subject fact first), or model the claim"-'REQ-B.md'
    ]) :-
    ds_kb((
        with_output_to(string(Json), json_write_dict(current_output, [_{claim_key: 'C1', role: normative, status: missing}], [width(0)])),
        ds_raw(req, 'REQ-A', [title="Req", status=open, semantic_inventory=Json]),
        ds_claim('C2', condition, ambiguous, [], B),
        ds_req('REQ-B', open, [B]),
        check_claim_subject_missing(Violations),
        findall(R-D-S-Src, member(violation(_, R, D, S, Src, _), Violations), Rows0),
        msort(Rows0, Rows)
    )).

test(claim_subject_undefined_violation_text, Rows == [
        'F-BARE'-"Subject bare (F-BARE) names gone as a broader subject under kind_of, but no active subject fact defines gone, so bare does not nest under it"-"",
        'F-CART'-"Subject cart (F-CART) names shop as a broader subject under part_of, but no active subject fact defines shop, so cart does not nest under it"-'F-CART.md',
        'REQ-A'-"Inventory claim C1 of requirement REQ-A names subject nowhere, which no active subject fact defines"-'REQ-A.md'
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart", [part_of=["shop"]]),
        ds_raw(fact, 'F-BARE', [title="Bare", status=active, fact_kind=subject, subject_key="bare", kind_of=["gone"]]),
        ds_claim('C1', normative, ambiguous, ["nowhere"], E1),
        ds_req('REQ-A', open, [E1]),
        check_claim_subject_undefined(Violations),
        findall(R-D-Src, member(violation(_, R, D, _, Src, _), Violations), Rows0),
        msort(Rows0, Rows)
    )).

test(domain_json_keeps_to_its_subject, Summary == [['cart.line'], [], ['SCEN-C'-""], ['REQ-A'], [cart-first, 'cart.ghost'-first]]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_subject('F-LINE', "cart.line"),
        ds_subject('F-ITEM', "cart.line.item"),
        ds_subject('F-OTHER', "other", [distinct_from=["cart"]]),
        ds_value('V-CART', "cart"),
        ds_value('V-OTHER', "other"),
        ds_raw(scenario, 'SCEN-C', [status=active, expects=success]),
        ds_scenario('SCEN-X', success, active),
        fixture_rel(assumes, 'SCEN-C', 'V-CART'),
        fixture_rel(assumes, 'SCEN-X', 'V-OTHER'),
        ds_req('REQ-A', [_{claim_key: 'C1', claim_text: "first", role: normative, status: missing, subjects: ["cart", "cart.ghost"]},
                         _{claim_key: 'C1', claim_text: "second", role: normative, status: missing, subjects: ["cart"]}], [], []),
        ds_req('REQ-OLD', superseded, []),
        fixture_rel(requires_property, 'REQ-A', 'V-CART'),
        fixture_rel(requires_property, 'REQ-OLD', 'V-CART'),
        subject_domain_json(cart, Text),
        ds_json(Text, D),
        get_dict(narrower, D, Narrower),
        get_dict(distinctFrom, D, Distinct),
        get_dict(scenarios, D, Scenarios),
        findall(Id-Title, (member(Sc, Scenarios), get_dict(id, Sc, Id0), atom_string(Id0, IdS), atom_string(Id, IdS), get_dict(title, Sc, T0), atom_string(T0, Title)), ScenarioRows),
        get_dict(claims, D, [Claim]),
        get_dict(requirements, Claim, ClaimReqs),
        get_dict(unmodeledClaims, D, Unmodeled),
        findall(K-T, (member(U, Unmodeled), get_dict(subjectKey, U, K), get_dict(claimText, U, T)), UnmodeledRows0),
        msort(UnmodeledRows0, UnmodeledRows),
        Summary = [Narrower, Distinct, ScenarioRows, ClaimReqs, UnmodeledRows]
    )).

test(positive_scenario_needs_a_subject_of_the_requirement, Found == []) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_subject('F-LINE', "cart.line"),
        ds_subject('F-OTHER', "other"),
        ds_value('V-LINE', "cart.line"),
        ds_claim('C1', normative, ontology_gap, ["other"], Other),
        ds_must('REQ-O', [Other]),
        ds_scenario('SCEN-O', success, active),
        fixture_rel(specified_by, 'REQ-O', 'SCEN-O'),
        fixture_rel(assumes, 'SCEN-O', 'V-LINE'),
        findall(S-K, positive_scenario('REQ-O', S, K), Found)
    )).

test(positive_scenario_gaps_judge_current_must_requirements, Summary == [[], 1]) :-
    ds_kb((
        % A must requirement nobody adopted yet (proposed) is not current.
        ds_raw(req, 'REQ-OLDMUST', [title="Old", status=proposed, priority=must]),
        ds_req('REQ-SHOULD', open, []),
        ds_must('REQ-MUST', []),
        findall(R, (member(R, ['REQ-OLDMUST', 'REQ-SHOULD']), positive_scenario_gap(R, _, _, _)), Gaps),
        positive_scenario_gaps_json(Text),
        ds_json(Text, D),
        get_dict(evaluated, D, Evaluated),
        Summary = [Gaps, Evaluated]
    )).

test(open_claims_belong_to_current_requirements, [Gaps, Roles] == [[], ['']]) :-
    ds_kb((
        ds_req('REQ-OLD', deprecated, [_{claim_key: 'C-O', claim_text: "t", status: missing}]),
        ds_req('REQ-NOW', open, [_{claim_key: 'C-N', claim_text: "t", status: missing}]),
        fixture_rel(relates_to, 'REQ-OLD', 'REQ-NOW'),
        ds_gaps(Gaps),
        findall(Role, open_claim('REQ-NOW', _, _, Role, _), Roles)
    )).

test(dangling_note_names_only_withs_that_are_not_current, Found == true) :-
    ds_kb((
        ds_claim('C-A', normative, ontology_gap, [], A),
        ds_req('REQ-A', [A], [
                   _{with: 'REQ-B', verdict: no_conflict, separated_by: "x", claims: ['C-OTHER'], origin: _{kind: human}},
                   _{with: 'REQ-TYPO', verdict: no_conflict, separated_by: "x", claims: ['C-A'], origin: _{kind: human}}
               ], []),
        ds_req('REQ-B', [], [], []),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        check_related_requirement_unmodeled([violation(_, 'REQ-A', Description, _, _, _)]),
        (   sub_string(Description, _, _, _, "; its pair_reviews name REQ-TYPO, which is not") -> Found = true ; Found = false )
    )).

test(another_settling_review_outweighs_a_stale_own_review, Gaps == []) :-
    ds_kb((
        ds_claim('C-A', normative, ontology_gap, [], A),
        Stale = _{with: 'REQ-B', verdict: no_conflict, separated_by: "x", claims: ['C-OTHER'], origin: _{kind: human}},
        Good = _{with: 'REQ-A', verdict: no_conflict, separated_by: "x", claims: ['C-A'], origin: _{kind: human}},
        ds_req('REQ-A', [A], [Stale], []),
        ds_req('REQ-B', [], [Good], []),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        ds_gaps(Gaps)
    )).

test(unclassified_note_agrees_with_several_claims, Found == true) :-
    ds_kb((
        ds_claim('C-D1', descriptive, missing, [], D1),
        ds_claim('C-D2', descriptive, missing, [], D2),
        ds_req('REQ-A', [D1, D2], [], []),
        ds_req('REQ-B', [], [], []),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        check_related_requirement_unmodeled([violation(_, 'REQ-A', Description, _, _, _)]),
        (   sub_string(Description, _, _, _, "; C-D1, C-D2 still have status missing although their roles state no rule: model them, set status ontology_gap on each with a reason when no predicate can state it, or review them (status nonlogical is accepted only for rationale, example and subjective claims)")
        ->  Found = true
        ;   Found = false
        )
    )).

test(rejected_resolvers_say_why, Problems == [
        missing(resolved_by, ['REQ-A'-pair]),
        missing(resolved_by, ['REQ-B'-pair, 'REQ-NOPE'-unknown]),
        missing(resolved_by)
    ]) :-
    ds_kb((
        ds_claim('C-A', normative, ontology_gap, [], A),
        ds_req('REQ-A', [A], [], []),
        ds_req('REQ-B', [], [], []),
        ds_req('REQ-C', [], [], []),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        findall(Problem,
                (   member(Resolvers, [['REQ-A'], ['REQ-C', 'REQ-B', 'REQ-NOPE'], ['']]),
                    ds_problem('REQ-A', 'REQ-B', ['C-A'], 'REQ-A',
                               _{with: 'REQ-B', verdict: interacts, resolved_by: Resolvers, claims: ['C-A'], origin: _{kind: human}},
                               Problem)
                ),
                Problems)
    )).

test(rejected_resolvers_reach_the_description, Found == true) :-
    ds_kb((
        ds_claim('C-A', normative, ontology_gap, [], A),
        ds_req('REQ-A', [A], [_{with: 'REQ-B', verdict: interacts, resolved_by: ['REQ-A', 'REQ-NOPE'], claims: ['C-A'], origin: _{kind: human}}], []),
        ds_req('REQ-B', [], [], []),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        check_related_requirement_unmodeled([violation(_, 'REQ-A', Description, _, _, _)]),
        (   sub_string(Description, _, _, _, "or a condition or exception claim of either; its resolved_by names REQ-A, a requirement of the pair itself, which cannot resolve it; REQ-NOPE, which is none of those (check the id, and that it is current and linked to one of the pair)")
        ->  Found = true
        ;   Found = false
        )
    )).

test(resolvers_and_claims_come_from_the_pair, Problems == [missing(resolved_by), missing(resolved_by, ['SCEN-X'-unknown]), missing(resolved_by, ['C-X'-unknown]), stale(['C-A'])]) :-
    ds_kb((
        ds_claim('C-A', normative, ontology_gap, [], A),
        ds_claim('C-X', condition, modeled, [], X),
        ds_req('REQ-A', [A], [], []),
        ds_req('REQ-B', [], [], []),
        ds_req('REQ-X', [X], [], []),
        ds_scenario('SCEN-X', success, active),
        fixture_rel(specified_by, 'REQ-X', 'SCEN-X'),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        findall(Problem,
                (   member(Review, [
                        _{with: 'REQ-B', verdict: interacts, resolved_by: [], claims: ['C-A'], origin: _{kind: human}},
                        _{with: 'REQ-B', verdict: interacts, resolved_by: ['SCEN-X'], claims: ['C-A'], origin: _{kind: human}},
                        _{with: 'REQ-B', verdict: interacts, resolved_by: ['C-X'], claims: ['C-A'], origin: _{kind: human}},
                        _{with: 'REQ-B', verdict: no_conflict, separated_by: "x", origin: _{kind: human}}
                    ]),
                    ds_problem('REQ-A', 'REQ-B', ['C-A'], 'REQ-A', Review, Problem)
                ),
                Problems)
    )).

test(approval_follows_either_decisive_side, Results == [unapproved, unapproved, unapproved]) :-
    ds_kb((
        ds_claim('C-A', normative, ontology_gap, [], A),
        ds_req('REQ-A', [A], [], [priority=must]),
        ds_req('REQ-SOFT', [A], [], [origin="{\"kind\":\"agent\"}"]),
        ds_req('REQ-AGENTMUST', [], [], [priority=must, origin="{\"kind\":\"agent\"}"]),
        fixture_rel(relates_to, 'REQ-A', 'REQ-SOFT'),
        fixture_rel(relates_to, 'REQ-SOFT', 'REQ-AGENTMUST'),
        Agent = _{verdict: no_conflict, separated_by: "x", claims: ['C-A'], origin: _{kind: agent}},
        Blank = _{verdict: no_conflict, separated_by: "x", claims: ['C-A'], origin: _{kind: agent, approved_by: ""}},
        findall(Result,
                (   member(Req-Other-Review, ['REQ-A'-'REQ-SOFT'-Agent, 'REQ-SOFT'-'REQ-AGENTMUST'-Agent, 'REQ-A'-'REQ-SOFT'-Blank]),
                    (   ds_problem(Req, Other, ['C-A'], Req, Review, Problem) -> Result = Problem ; Result = settled )
                ),
                Results)
    )).

test(firmness_as_the_evidence_floor_reads_it, Results == ['REQ-DEFAULT'-false, 'REQ-HUMANBOGUS'-true, 'REQ-HUMANORIGIN'-true, 'REQ-AGENTBOGUS'-false]) :-
    ds_kb((
        ds_req('REQ-DEFAULT', [], [], [firmness=default]),
        ds_req('REQ-HUMANBOGUS', [], [], [firmness=bogus]),
        ds_req('REQ-HUMANORIGIN', [], [], [origin="{\"kind\":\"human\"}"]),
        ds_req('REQ-AGENTBOGUS', [], [], [firmness=bogus, origin="{\"kind\":\"agent\"}"]),
        findall(R-Result,
                (   member(R, ['REQ-DEFAULT', 'REQ-HUMANBOGUS', 'REQ-HUMANORIGIN', 'REQ-AGENTBOGUS']),
                    (   domain_subjects:decisive_requirement(R) -> Result = true ; Result = false )
                ),
                Results)
    )).

test(unclassified_note_keeps_to_the_violation_claims, Found == false) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_claim('C-D', descriptive, missing, [], D),
        ds_claim('C-N', normative, ontology_gap, ["cart"], N),
        ds_req('REQ-A', [D, N], [], []),
        ds_raw(req, 'REQ-B', [title="B", status=open]),
        fixture_rel(constrains, 'REQ-B', 'F-CART'),
        check_related_requirement_unmodeled([violation(_, 'REQ-A', Description, _, _, _)]),
        (   sub_string(Description, _, _, _, "still have status missing") -> Found = true ; Found = false )
    )).

test(listed_atoms_cut_at_nine, Text == 'a, b, c, d, e, f, g, h (+1 more)') :-
    domain_subjects:listed_atoms([a, b, c, d, e, f, g, h, i], Text).

test(kind_texts_say_what_the_review_lacks) :-
    forall(member(Kind-Expected, [
               no_verdict-"the pair review states no verdict",
               conflict-"the pair review records a conflict, which a person must resolve",
               no_edge-"the pair review counts only while a relates_to edge links the two",
               missing_separated_by-"the no_conflict verdict does not say what separates them (separated_by)",
               missing_resolved_by-"the interacts verdict does not name what resolves it (resolved_by): a third current requirement, a scenario or fact one of them links, or a condition or exception claim of either",
               unapproved-"the pair review is a verdict on a must or firm requirement that names no approved_by, and an agent recorded it or wrote the requirement it is on"
           ]),
           (   domain_subjects:kind_text(Kind, [], Text),
               assertion(Text == Expected)
           )).

test(kind_suggestions_are_one_each, Counts == [1, 1, 1, 1]) :-
    findall(N,
            (   member(Kind, [conflict, no_edge, unapproved, stale]),
                findall(S, domain_subjects:kind_suggestion(Kind, 'R', 'O', 'O', S), Ss),
                length(Ss, N)
            ),
            Counts).

:- end_tests(domain_subjects).
