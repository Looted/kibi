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

ds_review(With, Verdict, Extra, Review) :-
    dict_pairs(Review, _, [with-With, verdict-Verdict|Extra]).

test(pair_review_problems, Problems == [
        conflict, no_edge, no_verdict, unapproved, missing(resolved_by),
        missing(separated_by), stale(['C-A']), unknown_verdict(maybe)
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_claim('C-A', normative, ontology_gap, ["cart"], A0),
        put_dict(payload_hash, A0, new, A),
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
                _{with: 'REQ-B', verdict: no_conflict, separated_by: "only on checkout", claims: [_{claim_key: 'C-A', payload_hash: old}], origin: _{kind: human}}-'REQ-B',
                _{with: 'REQ-B', verdict: no_conflict, separated_by: "only on checkout", claims: ['C-A'], origin: _{kind: agent}}-'REQ-B'
            ]),
            domain_subjects:pair_review_problem('REQ-A', Other, ['C-A'], Review, Problem)
        ), Problems0),
        msort(Problems0, Problems),
        % Settled: a human no_conflict, an agent one a person approved, and
        % an interacts verdict naming a scenario or a claim.
        forall(member(Review, [
                   _{with: 'REQ-B', verdict: no_conflict, separated_by: "only on checkout", claims: ['C-A'], origin: _{kind: human}},
                   _{with: 'REQ-B', verdict: no_conflict, separated_by: "only on checkout", claims: [_{claim_key: 'C-A'}], origin: _{kind: agent, approved_by: maintainer}}
               ]),
               \+ domain_subjects:pair_review_problem('REQ-A', 'REQ-B', ['C-A'], Review, _))
    )).

test(interacts_resolvers, Results == [false, true, true]) :-
    ds_kb((
        ds_claim('C-A', normative, ontology_gap, [], A),
        ds_claim('C-B', condition, modeled, [], B),
        ds_req('REQ-A', [A], [], []),
        ds_req('REQ-B', [B], [], []),
        ds_scenario('SCEN-BOTH', success, active),
        ds_scenario('SCEN-OLD', success, retired),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        findall(Result, (
            member(Resolver, ['SCEN-OLD', 'SCEN-BOTH', 'C-B']),
            Review = _{with: 'REQ-B', verdict: interacts, resolved_by: [Resolver], claims: ['C-A'], origin: _{kind: human}},
            (   domain_subjects:pair_review_problem('REQ-A', 'REQ-B', ['C-A'], Review, _)
            ->  Result = false
            ;   Result = true
            )
        ), Results)
    )).

test(agent_review_needs_approval_only_on_decisive_pairs, Results == [true, true, false]) :-
    ds_kb((
        ds_claim('C-A', normative, ontology_gap, [], A),
        ds_req('REQ-A', [A], [], [origin="{\"kind\":\"agent\"}"]),
        ds_req('REQ-FIRM', [], [], [firmness=firm]),
        ds_req('REQ-HUMAN', [], [], []),
        ds_req('REQ-SOFT', [], [], [origin="{\"kind\":\"agent\"}"]),
        forall(member(O, ['REQ-FIRM', 'REQ-HUMAN', 'REQ-SOFT']), fixture_rel(relates_to, 'REQ-A', O)),
        findall(Result, (
            member(Other, ['REQ-FIRM', 'REQ-HUMAN', 'REQ-SOFT']),
            Review = _{with: Other, verdict: no_conflict, separated_by: "x", claims: ['C-A']},
            (   domain_subjects:pair_review_problem('REQ-A', Other, ['C-A'], Review, unapproved)
            ->  Result = true
            ;   Result = false
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

test(related_requirement_unmodeled_violation_text, [Description, Suggestion, Source] == [
        "Requirement REQ-A has 1 unmodeled claim(s) (C-A) that nothing compares with REQ-B, which it pairs with through a relates_to edge and shared subject cart; no verdict records how they combine",
        "Model the unmodeled claims of REQ-A on the subject keys REQ-B constrains (facts via kb_model, then requires_property, requires_predicate or requires_rule), or supersede one of them; if they cannot be modeled, keep or add a relates_to link (they pair through a relates_to edge and shared subject cart) and add a pair_reviews entry on REQ-A with: REQ-B, verdict (no_conflict with separated_by, interacts with resolved_by, or conflict), claims (claim_key and payload_hash of each unmodeled claim of both) and origin",
        'REQ-A.md'
    ]) :-
    ds_kb((
        ds_subject('F-CART', "cart"),
        ds_claim('C-A', normative, ontology_gap, ["cart"], A),
        ds_req('REQ-A', [A], [], []),
        ds_raw(req, 'REQ-B', [title="B", status=open]),
        fixture_rel(constrains, 'REQ-B', 'F-CART'),
        fixture_rel(relates_to, 'REQ-A', 'REQ-B'),
        check_related_requirement_unmodeled([violation('related-requirement-unmodeled', 'REQ-A', Description, Suggestion, Source)])
    )).

test(problem_texts, Count == 9) :-
    findall(T, (member(P, [unreviewed, no_verdict, unknown_verdict(x), conflict, no_edge,
                           missing(separated_by), missing(resolved_by), stale(['C']), unapproved]),
                domain_subjects:problem_text(P, T)), Ts),
    length(Ts, Count),
    forall(member(P, [conflict, no_edge, unapproved, unreviewed]),
           domain_subjects:problem_suggestion(P, 'R', 'O', via, _)).

test(listed_atoms_cut_after_eight, Text == 'a, b, c, d, e, f, g, h (+2 more)') :-
    domain_subjects:listed_atoms([a, b, c, d, e, f, g, h, i, j], Text).

:- end_tests(domain_subjects).
