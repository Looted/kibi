% Module: claim_obligations
% implements REQ-kibi-claim-bound-proofs, REQ-kibi-non-numeric-proof-kinds
%
% What a certificate has to establish for it to prove one requirement claim.
% A claim is grounded by exactly one typed fact; the obligation is derived
% from that fact, so a certificate proves the claim's own content instead of
% a label its test chose:
%
%   set fact (value_type set, or the legacy allowed_values string "a|b|c")
%       exhaustive, typecheck  the domain is exactly the fact's set
%       typecheck              with property required_fields: every member
%                              is a required, non-nullable field of the type
%       rule                   every member satisfies the predicate the
%                              fact's property names
%       state_machine          with property transitions, states,
%                              initial_states, terminal_states or
%                              reachable_states: that projection of the
%                              machine is exactly the set
%   numeric fact (value_type int or number, a comparison operator)
%       arithmetic, smt        the certificate's claim is the fact's constraint
%                              (negated for polarity forbid)
%   rule fact (kibi.logic.v1)
%       rule, state_machine    the rule holds for every assignment of its
%                              variables over their domains (model_check.pl)
%   predicate fact (a ground atom asserted or denied)
%       rule, state_machine    the code decides the atom as the fact says
%   string fact (value_type string, operator eq, neq or matches)
%       regex                  the code's string or pattern meets the
%                              constraint (decided in the CLI, exactly)
%
% Any other pairing of a set, numeric or string fact with a certificate kind
% is incompatible (a set fact under arithmetic, a numeric fact under
% exhaustive).  A fact kind with no derivation for the proof kind (boolean
% placeholders, a rule under exhaustive) can only be attested: the test
% author says the certificate expresses the claim, and Kibi never counts that
% as proved.

:- module(claim_obligations, [
    claim_obligation/3,
    fact_obligation/3,
    obligation_equal/2,
    proof_contract_claim_candidates_json/1,
    proof_contract_claim_issues_json/1,
    test_claim_obligations_json/4,
    claim_model_check_json/4
]).

:- use_module(library(http/json)).
:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module('kb.pl').
:- use_module('model_check.pl', [model_check_obligation/4, edge_text/3]).

%% fact_obligation(+FactId, +ProofKind, -Result)
% Result is obligation(Dict), attested, or incompatible(Reason).
fact_obligation(FactId, ProofKind, Result) :-
    (   fact_set(FactId, Members)
    ->  set_obligation(FactId, Members, ProofKind, Result)
    ;   fact_numeric_constraint(FactId, Variable, ValueType, Operator, Value)
    ->  (   memberchk(ProofKind, [arithmetic, smt])
        ->  Result = obligation(_{kind: "numeric_constraint", variable: Variable,
                                  value_type: ValueType, operator: Operator, value: Value})
        ;   (   memberchk(ProofKind, [typecheck]) -> Article = a ; Article = an ),
            format(string(Reason),
                   "~w is a numeric fact, which ~w ~w certificate cannot express (use arithmetic or smt)",
                   [FactId, Article, ProofKind]),
            Result = incompatible(Reason)
        )
    ;   memberchk(ProofKind, [rule, state_machine]),
        fact_rule_hash(FactId, Hash)
    ->  atom_string(FactId, FactString),
        Result = obligation(_{kind: "rule_holds", fact_id: FactString, rule_hash: Hash})
    ;   memberchk(ProofKind, [rule, state_machine]),
        predicate_expectation(FactId, Name, Args, Value)
    ->  atom_string(Name, NameString),
        maplist(atom_string, Args, ArgStrings),
        Result = obligation(_{kind: "predicate_holds", predicate: NameString,
                              args: ArgStrings, value: Value})
    ;   fact_string_constraint(FactId, Operator, Value, Polarity)
    ->  (   ProofKind == regex
        ->  Result = obligation(_{kind: "string_constraint", operator: Operator,
                                  value: Value, polarity: Polarity})
        ;   memberchk(ProofKind, [exhaustive, typecheck, arithmetic, smt])
        ->  Result = attested
        ;   format(string(Reason),
                   "~w is a string fact, which a ~w certificate cannot express (use regex)",
                   [FactId, ProofKind]),
            Result = incompatible(Reason)
        )
    ;   Result = attested
    ).

% Set facts: what each kind derives from the members, by the property the
% fact names where the kind reads one.
set_obligation(_FactId, Members, exhaustive, obligation(_{kind: "set_equals", members: Members})) :- !.
set_obligation(FactId, Members, typecheck, obligation(Obligation)) :- !,
    (   fact_property_key(FactId, required_fields)
    ->  Obligation = _{kind: "required_fields", members: Members}
    ;   Obligation = _{kind: "set_equals", members: Members}
    ).
set_obligation(FactId, Members, rule, obligation(_{kind: "every_member", predicate: Predicate, members: Members})) :-
    fact_property_key(FactId, Property),
    atom_string(Property, Predicate),
    !.
set_obligation(FactId, Members, state_machine, Result) :- !,
    (   fact_property_key(FactId, Projection),
        memberchk(Projection, [transitions, states, initial_states, terminal_states, reachable_states])
    ->  (   Projection == transitions
        ->  maplist(edge_member, Members, Edges0),
            sort(Edges0, Spelled)
        ;   Spelled = Members
        ),
        atom_string(Projection, ProjectionString),
        Result = obligation(_{kind: "machine_set", projection: ProjectionString, members: Spelled})
    ;   format(string(Reason),
               "~w is a set fact whose property is not a machine projection (transitions, states, initial_states, terminal_states or reachable_states)",
               [FactId]),
        Result = incompatible(Reason)
    ).
set_obligation(FactId, _Members, rule, incompatible(Reason)) :- !,
    format(string(Reason),
           "~w is a set fact with no property to read as the predicate every member satisfies",
           [FactId]).
set_obligation(FactId, _Members, ProofKind, incompatible(Reason)) :-
    (   ProofKind == regex -> Article = a ; Article = an ),
    format(string(Reason),
           "~w is a set fact, which ~w ~w certificate cannot express (use exhaustive, typecheck, rule or state_machine)",
           [FactId, Article, ProofKind]).

% A transition member "from -> to" (or with U+2192 as the arrow) spelled "from->to".
edge_member(Member, Spelled) :-
    (   sub_string(Member, Before, _, After, "->")
    ->  sub_string(Member, 0, Before, _, From0),
        sub_string(Member, _, After, 0, To0)
    ;   sub_string(Member, Before, _, After, "\u2192")
    ->  sub_string(Member, 0, Before, _, From0),
        sub_string(Member, _, After, 0, To0)
    ;   From0 = Member, To0 = ""
    ),
    normalize_space(atom(From), From0),
    normalize_space(atom(To), To0),
    edge_text(From, To, Spelled).

% What a predicate fact says the code decides.  A decision predicate (the
% built-in permission_rule, or a schema with key_arguments and a decision
% argument) is about the key arguments: the code's function takes them and
% returns whether the effective decision is allow.  Any other predicate is
% true when asserted and false when denied.
predicate_expectation(FactId, Name, KeyArgs, Value) :-
    kb:predicate_fact(FactId, Namespace, Name, Args, Polarity),
    length(Args, Arity),
    (   kb:decision_signatures(Signatures),
        memberchk(decision_signature(Namespace, Name, Arity, KeyPositions, DecisionPosition), Signatures)
    ->  findall(Arg, ( member(Position, KeyPositions), nth1(Position, Args, Arg) ), KeyArgs),
        nth1(DecisionPosition, Args, Decision),
        kb:effective_decision(Decision, Polarity, Effect),
        (   Effect == allow -> Value = true ; Value = false )
    ;   memberchk(Polarity-Value, [assert-true, deny-false]),
        KeyArgs = Args
    ).

fact_property_key(FactId, Property) :-
    kb_entity(FactId, fact, Props),
    prop_atom(Props, property_key, Property).

fact_rule_hash(FactId, Hash) :-
    kb_entity(FactId, fact, Props),
    prop_atom(Props, fact_kind, rule),
    memberchk(rule_ir=_, Props),
    (   prop_atom(Props, rule_hash, HashAtom)
    ->  atom_string(HashAtom, Hash)
    ;   Hash = ""
    ).

% A string property_value fact: eq, neq or matches on a string value.
fact_string_constraint(FactId, Operator, Value, Polarity) :-
    kb:fact_property_tuple(FactId, _Subject, Property, Op, string, Raw, _Unit, _Scope, Polarity0),
    Property \== allowed_values,
    memberchk(Op, [eq, neq, matches]),
    text_string(Raw, Value),
    atom_string(Op, Operator),
    atom_string(Polarity0, Polarity).

%% claim_obligation(+ReqId, +ClaimKey, +ProofKind, -Result)
% As fact_obligation/3 for the fact grounding ClaimKey in ReqId, with the
% fact id: obligation(FactId, Dict), attested(FactId), incompatible(FactId,
% Reason), or unresolved(Reason) when the claim cannot be named by a proof.
claim_obligation(ReqId-ClaimKey, ProofKind, Result) :-
    (   \+ requirement_claim_status(ReqId, ClaimKey, _)
    ->  format(string(Reason), "~w is not a claim of ~w", [ClaimKey, ReqId]),
        Result = unresolved(Reason)
    ;   requirement_claim_status(ReqId, ClaimKey, nonlogical)
    ->  format(string(Reason),
               "claim ~w of ~w is nonlogical: a nonlogical span is context, not a claim to prove",
               [ClaimKey, ReqId]),
        Result = unresolved(Reason)
    ;   requirement_claim_status(ReqId, ClaimKey, Status),
        Status \== modeled
    ->  format(string(Reason), "claim ~w of ~w is ~w; resolve it before proving it",
               [ClaimKey, ReqId, Status]),
        Result = unresolved(Reason)
    ;   \+ claim_fact(ReqId, ClaimKey, _)
    ->  format(string(Reason), "claim ~w of ~w has no grounding fact", [ClaimKey, ReqId]),
        Result = unresolved(Reason)
    ;   claim_fact(ReqId, ClaimKey, FactId),
        fact_obligation(FactId, ProofKind, FactResult),
        (   FactResult = obligation(Dict)
        ->  Result = obligation(FactId, Dict)
        ;   FactResult == attested
        ->  Result = attested(FactId)
        ;   FactResult = incompatible(Reason)
        ->  Result = incompatible(FactId, Reason)
        )
    ).

%% obligation_equal(+Left, +Right)
% Two obligations (dicts, possibly read back from a receipt) ask the same.
obligation_equal(Left, Right) :-
    obligation_key(Left, Key),
    obligation_key(Right, Key).

obligation_key(Obligation, set(Members)) :-
    dict_text(Obligation, kind, "set_equals"),
    get_dict(members, Obligation, Raw),
    is_list(Raw),
    maplist(text_string, Raw, Strings),
    sort(Strings, Members),
    !.
obligation_key(Obligation, required_fields(Members)) :-
    dict_text(Obligation, kind, "required_fields"),
    obligation_members(Obligation, Members),
    !.
obligation_key(Obligation, every(Predicate, Members)) :-
    dict_text(Obligation, kind, "every_member"),
    dict_text(Obligation, predicate, Predicate),
    obligation_members(Obligation, Members),
    !.
obligation_key(Obligation, machine(Projection, Members)) :-
    dict_text(Obligation, kind, "machine_set"),
    dict_text(Obligation, projection, Projection),
    obligation_members(Obligation, Members),
    !.
obligation_key(Obligation, rule(FactId, Hash)) :-
    dict_text(Obligation, kind, "rule_holds"),
    dict_text(Obligation, fact_id, FactId),
    dict_text(Obligation, rule_hash, Hash),
    !.
obligation_key(Obligation, predicate(Name, Args, Value)) :-
    dict_text(Obligation, kind, "predicate_holds"),
    dict_text(Obligation, predicate, Name),
    get_dict(args, Obligation, RawArgs),
    is_list(RawArgs),
    maplist(text_string, RawArgs, Args),
    dict_text(Obligation, value, Value),
    !.
obligation_key(Obligation, string(Operator, Value, Polarity)) :-
    dict_text(Obligation, kind, "string_constraint"),
    dict_text(Obligation, operator, Operator),
    dict_text(Obligation, value, Value),
    dict_text(Obligation, polarity, Polarity),
    !.
obligation_key(Obligation, numeric(Variable, Type, Operator, Value)) :-
    dict_text(Obligation, kind, "numeric_constraint"),
    dict_text(Obligation, variable, Variable),
    dict_text(Obligation, value_type, Type),
    dict_text(Obligation, operator, Operator),
    get_dict(value, Obligation, Raw),
    number_value(Raw, Value).

obligation_members(Obligation, Members) :-
    get_dict(members, Obligation, Raw),
    is_list(Raw),
    maplist(text_string, Raw, Strings),
    sort(Strings, Members).

dict_text(Dict, Key, String) :-
    is_dict(Dict),
    get_dict(Key, Dict, Raw),
    text_string(Raw, String).

number_value(Raw, Value) :- number(Raw), !, Value is Raw * 1.0.
number_value(Raw, Value) :-
    text_string(Raw, String),
    number_string(Number, String),
    Value is Number * 1.0.

text_string(Raw, String) :- string(Raw), !, String = Raw.
text_string(Raw, String) :- atom(Raw), !, atom_string(Raw, String).
text_string(Raw, String) :- number(Raw), !, number_string(Raw, String).
text_string(^^(Raw, _), String) :- !, text_string(Raw, String).

% The members of a set fact, sorted and unique.
fact_set(FactId, Members) :-
    kb_entity(FactId, fact, Props),
    prop_atom(Props, fact_kind, property_value),
    (   prop_atom(Props, value_type, set)
    ->  memberchk(value_set=Raw, Props),
        kb:normalize_term_atom_list(Raw, Atoms)
    ;   prop_atom(Props, property_key, allowed_values),
        \+ (memberchk(value_type=RawType, Props),
            kb:normalize_term_atom(RawType, Type),
            Type \== string),
        memberchk(value_string=RawValue, Props),
        kb:unwrap_rdf_value(RawValue, Value),
        text_string(Value, Joined),
        split_string(Joined, "|", " ", Parts),
        exclude(==(""), Parts, NonEmpty),
        maplist([S, A]>>atom_string(A, S), NonEmpty, Atoms)
    ),
    (   prop_atom(Props, operator, Operator) -> Operator == eq ; true ),
    \+ prop_atom(Props, polarity, forbid),
    maplist([A, S]>>atom_string(A, S), Atoms, Strings),
    sort(Strings, Members),
    Members \== [].

% A numeric property_value fact as one constraint on its property, negated
% for polarity forbid (forbid gt 5 means the value must be at most 5).
fact_numeric_constraint(FactId, Variable, ValueType, Operator, Value) :-
    kb:fact_property_tuple(FactId, _Subject, Property, Op0, Type0, Raw, _Unit, _Scope, Polarity),
    memberchk(Type0-ValueType, [int-"int", number-"real"]),
    memberchk(Op0, [eq, neq, lt, lte, gt, gte]),
    number_value(Raw, Float),
    (   ValueType == "int", Float =:= truncate(Float)
    ->  Value is truncate(Float)
    ;   Value = Float
    ),
    (   Polarity == forbid
    ->  negated_operator(Op0, Op)
    ;   Op = Op0
    ),
    atom_string(Op, Operator),
    atom_string(Property, Variable).

negated_operator(eq, neq).
negated_operator(neq, eq).
negated_operator(lt, gte).
negated_operator(lte, gt).
negated_operator(gt, lte).
negated_operator(gte, lt).

prop_atom(Props, Key, Atom) :-
    memberchk(Key=Raw, Props),
    kb:normalize_term_atom(Raw, Atom).

% The status of a claim in the requirement's semantic inventory.
% With ClaimKey unbound it enumerates the claims; the first entry for a key
% wins.
requirement_claim_status(ReqId, ClaimKey, Status) :-
    nonvar(ClaimKey),
    !,
    once(inventory_claim_status(ReqId, ClaimKey, Status0)),
    Status = Status0.
requirement_claim_status(ReqId, ClaimKey, Status) :-
    findall(Key-S, inventory_claim_status(ReqId, Key, S), Pairs),
    first_per_key(Pairs, [], Unique),
    member(ClaimKey-Status, Unique).

first_per_key([], Acc, Unique) :- reverse(Acc, Unique).
first_per_key([Key-S|Rest], Acc, Unique) :-
    (   memberchk(Key-_, Acc)
    ->  first_per_key(Rest, Acc, Unique)
    ;   first_per_key(Rest, [Key-S|Acc], Unique)
    ).

inventory_claim_status(ReqId, ClaimKey, Status) :-
    kb_entity(ReqId, req, Props),
    memberchk(semantic_inventory=Raw, Props),
    inventory_list(Raw, Entries),
    member(Entry, Entries),
    entry_field(Entry, claim_key, RawKey),
    kb:normalize_term_atom(RawKey, ClaimKey),
    entry_field(Entry, status, RawStatus),
    kb:normalize_term_atom(RawStatus, Status).

inventory_list(Raw, Entries) :- is_list(Raw), !, Entries = Raw.
inventory_list(^^(Raw, _), Entries) :- !, inventory_list(Raw, Entries).
inventory_list(Raw, Entries) :-
    (   string(Raw) ; atom(Raw) ),
    catch(atom_json_dict(Raw, Parsed, [value_string_as(string)]), _, fail),
    is_list(Parsed),
    !,
    Entries = Parsed.
inventory_list(Raw, Entries) :-
    (   string(Raw) ; atom(Raw) ),
    catch(term_string(Parsed, Raw), _, fail),
    is_list(Parsed),
    !,
    Entries = Parsed.
inventory_list(_, []).

entry_field(Entry, Key, Value) :-
    is_dict(Entry), !,
    get_dict(Key, Entry, Value).
entry_field(Entry, Key, Value) :-
    is_list(Entry),
    memberchk(Key=Value, Entry).

% The fact grounding a claim: the same claim_key, linked from the
% requirement through requires_property, requires_predicate or requires_rule.
claim_fact(ReqId, ClaimKey, FactId) :-
    member(Relation, [requires_property, requires_predicate, requires_rule]),
    kb_relationship(Relation, ReqId, FactId),
    kb_entity(FactId, fact, Props),
    prop_atom(Props, claim_key, ClaimKey),
    !.

% Current requirements a test reaches through the scenarios it verifies.
test_requirement(TestId, ReqId) :-
    (   kb_relationship(validates, TestId, ScenarioId)
    ;   kb_relationship(verified_by, ScenarioId, TestId)
    ),
    kb_relationship(specified_by, ReqId, ScenarioId),
    kb:current_req(ReqId).

%% test_claim_obligations_json(+TestId, +ClaimKeysJson, +ProofKind, -Json)
% For `kibi prove`: one row per claim key and requirement the test reaches,
% {claim_key, requirement_id, fact_id?, result, obligation?, reason?}, with
% result obligation, attested, incompatible or unresolved.  A key no reached
% requirement declares gives one unresolved row without requirement_id.
test_claim_obligations_json(TestId0, KeysJson, Kind0, Json) :-
    kb:normalize_term_atom(TestId0, TestId),
    kb:normalize_term_atom(Kind0, Kind),
    atom_json_term(KeysJson, Keys0, []),
    maplist([K, A]>>(text_string(K, S), atom_string(A, S)), Keys0, Keys),
    findall(ReqId, test_requirement(TestId, ReqId), ReqIds0),
    sort(ReqIds0, ReqIds),
    foldl(key_rows(Kind, ReqIds), Keys, [], RowsRev),
    reverse(RowsRev, Rows),
    with_output_to(string(Json), json_write_dict(current_output, Rows, [width(0)])).

key_rows(Kind, ReqIds, Key, Acc0, Acc) :-
    findall(ReqId,
        (member(ReqId, ReqIds), requirement_claim_status(ReqId, Key, _)),
        Owners),
    atom_string(Key, KeyString),
    (   Owners == []
    ->  format(string(Reason),
               "claim ~w is not a claim of any current requirement this test reaches through its scenarios",
               [Key]),
        Acc = [_{claim_key: KeyString, result: "unresolved", reason: Reason}|Acc0]
    ;   foldl(owner_row(Kind, Key, KeyString), Owners, Acc0, Acc)
    ).

owner_row(Kind, Key, KeyString, ReqId, Acc0, [Row|Acc0]) :-
    atom_string(ReqId, ReqString),
    claim_obligation(ReqId-Key, Kind, Result),
    Base = _{claim_key: KeyString, requirement_id: ReqString},
    (   Result = obligation(FactId, Obligation)
    ->  atom_string(FactId, FactString),
        Row = Base.put(_{result: "obligation", fact_id: FactString, obligation: Obligation})
    ;   Result = attested(FactId)
    ->  atom_string(FactId, FactString),
        Row = Base.put(_{result: "attested", fact_id: FactString})
    ;   Result = incompatible(FactId, Reason)
    ->  atom_string(FactId, FactString),
        Row = Base.put(_{result: "incompatible", fact_id: FactString, reason: Reason})
    ;   Result = unresolved(Reason),
        Row = Base.put(_{result: "unresolved", reason: Reason})
    ).

%% proof_contract_claim_issues_json(-Json)
% For the proof-contract-claims rule: one row {test_id, claim_key?, reason}
% per certificate-kind proof contract that names no claims in proves, and
% per claim key it names that no certificate of its kind could prove
% (not a modeled claim of a reached requirement, no grounding fact, or a
% fact the kind cannot express).  An attested claim is not an issue here:
% it is reported as attested, and never counts as proved.
proof_contract_claim_issues_json(Json) :-
    findall(Row, proof_contract_claim_issue(Row), Rows0),
    sort(Rows0, Rows),
    with_output_to(string(Json), json_write_dict(current_output, Rows, [width(0)])).

certificate_kind(exhaustive).
certificate_kind(typecheck).
certificate_kind(arithmetic).
certificate_kind(smt).
certificate_kind(rule).
certificate_kind(state_machine).
certificate_kind(regex).

test_certificate_contract(TestId, Kind, Contract) :-
    kb_entity(TestId, test, Props),
    memberchk(proof_contract=Raw, Props),
    contract_dict(Raw, Contract),
    get_dict(kind, Contract, RawKind),
    text_string(RawKind, KindString),
    atom_string(Kind, KindString),
    certificate_kind(Kind).

contract_dict(^^(Raw, _), Dict) :- !, contract_dict(Raw, Dict).
contract_dict(Dict, Dict) :- is_dict(Dict), !.
contract_dict(Raw, Dict) :-
    (   atom(Raw) ; string(Raw) ),
    catch(atom_json_dict(Raw, Dict, [value_string_as(string)]), _, fail),
    is_dict(Dict).

proof_contract_claim_issue(_{test_id: TestString, reason: Reason}) :-
    test_certificate_contract(TestId, Kind, Contract),
    \+ ( get_dict(proves, Contract, Proves), is_list(Proves), Proves \== [] ),
    atom_string(TestId, TestString),
    format(string(Reason),
           "the ~w proof contract names no claims in proves, so its certificate proves nothing about a requirement",
           [Kind]).
proof_contract_claim_issue(_{test_id: TestString, claim_key: KeyString, reason: Reason}) :-
    test_certificate_contract(TestId, Kind, Contract),
    get_dict(proves, Contract, Proves),
    is_list(Proves),
    Proves \== [],
    atom_json_term(KeysJson, Proves, []),
    test_claim_obligations_json(TestId, KeysJson, Kind, RowsJson),
    atom_json_dict(RowsJson, Rows, [value_string_as(string)]),
    member(Row, Rows),
    get_dict(result, Row, Result),
    memberchk(Result, ["unresolved", "incompatible"]),
    atom_string(TestId, TestString),
    get_dict(claim_key, Row, KeyString),
    get_dict(reason, Row, Reason).

%% proof_contract_claim_candidates_json(-Json)
% For the schema 12 migration: one row {test_id, kind, candidates} per
% certificate-kind proof contract without proves.  Candidates are the
% modeled claims {claim_key, requirement_id, fact_id, binding, reason?} of
% current requirements the test reaches through its scenarios, with the
% binding a certificate of its kind would get: derived when the grounding
% fact derives an obligation for the kind, attested when the fact has no
% derivation, incompatible (with the reason) when the kind cannot express
% it.  The migration pins proves only when exactly one claim is derived;
% the review lists every candidate so a person can bind the rest.
proof_contract_claim_candidates_json(Json) :-
    findall(Row, proof_contract_claim_candidates(Row), Rows0),
    sort(Rows0, Rows),
    with_output_to(string(Json), json_write_dict(current_output, Rows, [width(0)])).

proof_contract_claim_candidates(_{test_id: TestString, kind: KindString, candidates: Candidates}) :-
    test_certificate_contract(TestId, Kind, Contract),
    \+ ( get_dict(proves, Contract, Proves), is_list(Proves), Proves \== [] ),
    findall(Candidate,
        (   test_requirement(TestId, ReqId),
            requirement_claim_status(ReqId, ClaimKey, modeled),
            claim_obligation(ReqId-ClaimKey, Kind, Result),
            claim_candidate(ReqId, ClaimKey, Result, Candidate)
        ),
        Candidates0),
    sort(Candidates0, Candidates1),
    sort(claim_key, @=<, Candidates1, Candidates),
    atom_string(TestId, TestString),
    atom_string(Kind, KindString).

claim_candidate(ReqId, ClaimKey, Result, Candidate) :-
    (   Result = obligation(FactId, _)
    ->  Binding = "derived"
    ;   Result = attested(FactId)
    ->  Binding = "attested"
    ;   Result = incompatible(FactId, Reason)
    ->  Binding = "incompatible"
    ),
    atom_string(ClaimKey, KeyString),
    atom_string(ReqId, ReqString),
    atom_string(FactId, FactString),
    Base = _{claim_key: KeyString, requirement_id: ReqString, fact_id: FactString, binding: Binding},
    (   var(Reason) -> Candidate = Base ; Candidate = Base.put(reason, Reason) ).

%% claim_model_check_json(+Kind, +ObligationJson, +CertificateJson, -Json)
% For `kibi prove`: whether a rule or state_machine certificate's model meets
% one derived obligation, {"ok": true} or {"ok": false, "reason": R}.
claim_model_check_json(Kind0, ObligationJson, CertificateJson, Json) :-
    kb:normalize_term_atom(Kind0, Kind),
    atom_json_dict(ObligationJson, Obligation, [value_string_as(string)]),
    atom_json_dict(CertificateJson, Certificate, [value_string_as(string)]),
    model_check_obligation(Kind, Obligation, Certificate, Result),
    (   Result == ok
    ->  Out = _{ok: true}
    ;   Result = problem(Reason),
        Out = _{ok: false, reason: Reason}
    ),
    with_output_to(string(Json), json_write_dict(current_output, Out, [width(0)])).
