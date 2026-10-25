% Module: claim_obligations
% implements REQ-kibi-claim-bound-proofs
%
% What a certificate has to establish for it to prove one requirement claim.
% A claim is grounded by exactly one typed fact; the obligation is derived
% from that fact, so a certificate proves the claim's own content instead of
% a label its test chose:
%
%   set fact (value_type set, or the legacy allowed_values string "a|b|c")
%       exhaustive, typecheck  the domain is exactly the fact's set
%   numeric fact (value_type int or number, a comparison operator)
%       arithmetic, smt        the certificate's claim is the fact's constraint
%                              (negated for polarity forbid)
%
% Any other pairing that appears in the table with a different proof kind is
% incompatible (a set fact under arithmetic, a numeric fact under
% exhaustive).  A fact kind with no derivation at all (boolean placeholders,
% predicates, rules, other strings) can only be attested: the test author
% says the certificate expresses the claim, and Kibi never counts that as
% proved.

:- module(claim_obligations, [
    claim_obligation/3,
    fact_obligation/3,
    obligation_equal/2,
    test_claim_obligations_json/4
]).

:- use_module(library(http/json)).
:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module('kb.pl').

%% fact_obligation(+FactId, +ProofKind, -Result)
% Result is obligation(Dict), attested, or incompatible(Reason).
fact_obligation(FactId, ProofKind, Result) :-
    (   fact_set(FactId, Members)
    ->  (   memberchk(ProofKind, [exhaustive, typecheck])
        ->  Result = obligation(_{kind: "set_equals", members: Members})
        ;   format(string(Reason),
                   "~w is a set fact, which an ~w certificate cannot express (use exhaustive or typecheck)",
                   [FactId, ProofKind]),
            Result = incompatible(Reason)
        )
    ;   fact_numeric_constraint(FactId, Variable, ValueType, Operator, Value)
    ->  (   memberchk(ProofKind, [arithmetic, smt])
        ->  Result = obligation(_{kind: "numeric_constraint", variable: Variable,
                                  value_type: ValueType, operator: Operator, value: Value})
        ;   format(string(Reason),
                   "~w is a numeric fact, which an ~w certificate cannot express (use arithmetic or smt)",
                   [FactId, ProofKind]),
            Result = incompatible(Reason)
        )
    ;   Result = attested
    ).

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
obligation_key(Obligation, numeric(Variable, Type, Operator, Value)) :-
    dict_text(Obligation, kind, "numeric_constraint"),
    dict_text(Obligation, variable, Variable),
    dict_text(Obligation, value_type, Type),
    dict_text(Obligation, operator, Operator),
    get_dict(value, Obligation, Raw),
    number_value(Raw, Value).

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
requirement_claim_status(ReqId, ClaimKey, Status) :-
    kb_entity(ReqId, req, Props),
    memberchk(semantic_inventory=Raw, Props),
    inventory_list(Raw, Entries),
    member(Entry, Entries),
    entry_field(Entry, claim_key, RawKey),
    kb:normalize_term_atom(RawKey, ClaimKey),
    entry_field(Entry, status, RawStatus),
    kb:normalize_term_atom(RawStatus, Status),
    !.

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
