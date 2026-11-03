% implements REQ-kibi-case-coverage
%
% Edge cases derived from a requirement's typed claims.  A case is never
% authored: it is computed from a property fact the requirement grounds a
% claim on, so it cannot drift from the claim.  Each case names a value
% class of the fact's subject and property (a boundary, a count of zero,
% one or many, a member of a set, a value outside it), the outcome the
% claim predicts for it, and a stable id hashed from the claim key, the
% generator and the constraint.
%
% A scenario covers a case when the requirement specifies it, its expects
% matches the predicted outcome (rejection and error both refuse), and one
% of its assumes facts on the same subject and property entails the case
% constraint.  Cases are generated per fact, never across facts, in a
% deterministic order and capped per fact.
:- module(cases, [
    requirement_cases/2,
    fact_cases/3,
    case_covering_scenarios/3,
    case_dict/2,
    fact_case_waiver/2,
    case_limit/1
]).

:- use_module(library(crypto)).
:- use_module(library(lists)).
:- use_module(library(apply)).
:- use_module('kb.pl').
:- use_module('intervals.pl', [numeric_constraint_entailed/3]).

%% case_limit(-Limit)
% Most cases one fact yields.  Beyond it the requirement reports
% caseLimitReached and the rest are left out, in their deterministic order.
case_limit(12).

% case(Id, ClaimKey, FactId, Subject-Property, Generator, Constraint, Predicted)
%   Constraint is num(Type, Op, Value) on the property, member(Value),
%   non_member(Set) or excluded(Value) for a set property.
%   Predicted is success, rejection or unspecified.

%% requirement_cases(+ReqId, -Cases)
% Every case of every property fact a current requirement grounds a claim
% on with requires_property, sorted by claim key, fact and generation order.
requirement_cases(ReqId, Cases) :-
    findall(FactId, kb_relationship(requires_property, ReqId, FactId), Facts0),
    sort(Facts0, Facts),
    findall(Case,
        (   member(FactId, Facts),
            fact_cases(FactId, FactCases, _),
            member(Case, FactCases)
        ),
        Cases).

%% fact_cases(+FactId, -Cases, -LimitReached)
fact_cases(FactId, Cases, LimitReached) :-
    kb:fact_property_tuple(FactId, Subject, Property, AuthoredOp, ValueType, Value, _Unit, _Scope, Polarity),
    claim_key_of(FactId, ClaimKey),
    effective_operator(Polarity, AuthoredOp, Op),
    findall(Generator-Constraint-Predicted,
        fact_case(ValueType, Op, Value, Generator, Constraint, Predicted),
        Raw0),
    distinct_constraints(Raw0, Raw),
    case_limit(Limit),
    length(Raw, Count),
    (   Count > Limit
    ->  length(Kept, Limit),
        append(Kept, _, Raw),
        LimitReached = true
    ;   Kept = Raw,
        LimitReached = false
    ),
    findall(case(Id, ClaimKey, FactId, Subject-Property, Generator, Constraint, Predicted),
        (   member(Generator-Constraint-Predicted, Kept),
            case_id(ClaimKey, Generator, Constraint, Id)
        ),
        Cases).

claim_key_of(FactId, Key) :-
    kb_entity(FactId, fact, Props),
    (   memberchk(claim_key=Raw, Props)
    ->  normalize_term_atom(Raw, Key)
    ;   Key = FactId
    ).

effective_operator(Polarity, Op, Effective) :-
    (   Polarity == forbid,
        negated_operator(Op, Negated)
    ->  Effective = Negated
    ;   Effective = Op
    ).

negated_operator(eq, neq).
negated_operator(neq, eq).
negated_operator(lt, gte).
negated_operator(gte, lt).
negated_operator(gt, lte).
negated_operator(lte, gt).
negated_operator(includes, excludes).
negated_operator(excludes, includes).

% Two generators can name the same value class (eq 0 is both the boundary
% and the zero count), or one class can sit inside another with the same
% outcome (eq 0 and eq 1 inside lt 8): the first one in generation order
% keeps it, so each case is a class a scenario must reach on its own.
distinct_constraints(Raw, Distinct) :-
    foldl(keep_new_case, Raw, [], Reversed),
    reverse(Reversed, Distinct).

keep_new_case(_-C-P, Kept, Kept) :-
    member(_-Earlier-P, Kept),
    subsumed_constraint(C, Earlier),
    !.
keep_new_case(Case, Kept, [Case|Kept]).

% Only numeric classes can repeat or nest: a set fact's members are unique.
subsumed_constraint(num(Type, Op, Value), num(Type, EarlierOp, EarlierValue)) :-
    integer_variables(Type, Var, IntVars),
    numeric_constraint_entailed([c(Op, Var, Value)], c(EarlierOp, Var, EarlierValue), IntVars).

%% fact_case(+ValueType, +Op, +Value, -Generator, -Constraint, -Predicted)
% Numeric facts: the bound itself and the nearest value past it, then the
% zero, one and many classes when the property is an integer count.
% Set facts: each member, then the value class outside the set.  A set
% fact whose value did not read as a list has none.
fact_case(set, Op, Members, member, member(Member), success) :-
    memberchk(Op, [eq, includes, subset_of]),
    member(Member, Members).
fact_case(set, Op, Members, non_member, non_member(Members), Predicted) :-
    is_list(Members),
    non_member_prediction(Op, Predicted).
fact_case(set, excludes, Members, excluded_member, excluded(Member), rejection) :-
    member(Member, Members).
fact_case(Type, Op, Value, Generator, num(Type, CaseOp, CaseValue), Predicted) :-
    numeric_value(Type, Value),
    numeric_case(Type, Op, Value, Generator, CaseOp, CaseValue),
    numeric_prediction(Type, Op, Value, CaseOp, CaseValue, Predicted).

upper_past(eq, gt).
upper_past(neq, gt).
upper_past(lte, gt).
upper_past(lt, gte).
lower_past(eq, lt).
lower_past(neq, lt).
lower_past(gte, lt).
lower_past(gt, lte).

numeric_type(int).
numeric_type(number).

numeric_value(Type, Value) :-
    numeric_type(Type),
    number(Value).

non_member_prediction(eq, rejection).
non_member_prediction(subset_of, rejection).
non_member_prediction(includes, unspecified).

% The boundary rows of x Op V: the bound itself, and each open side past
% it (x > V for an upper bound, x < V for a lower one), so any value that
% breaks the bound lands in the past-the-bound class.
numeric_case(_, Op, V, boundary, eq, V) :-
    memberchk(Op, [eq, neq, lte, gte]).
numeric_case(int, lt, V, boundary, eq, Inside) :- Inside is V - 1.
numeric_case(int, gt, V, boundary, eq, Inside) :- Inside is V + 1.
numeric_case(_, Op, V, boundary, PastOp, V) :-
    upper_past(Op, PastOp).
numeric_case(Type, Op, V, boundary, PastOp, V) :-
    lower_past(Op, PastOp),
    \+ (Type == int, no_count_below(PastOp, V)).
% Zero, one and many: the partition a one-item test hides.  It applies to
% an integer property bounded at one or more; a bound of zero is already
% split by its boundary rows.
% At a bound of one the boundary rows already hold the value one (as the
% bound, or as the row past it), so the one class starts at a bound of two.
numeric_case(int, _, V, cardinality, eq, 0) :- V >= 1.
numeric_case(int, _, V, cardinality, eq, 1) :- V >= 2.
numeric_case(int, _, V, cardinality, gte, 2) :- V >= 1.

% An integer property counts something: no count lies below zero, so
% x < V for V =< 0 and x =< V for V < 0 name no class.
no_count_below(PastOp, V) :-
    (   PastOp == lt
    ->  V =< 0
    ;   V < 0
    ).

% A case is predicted success when every value it admits satisfies the
% claim and rejection when none does.  A class that straddles the bound
% (x >= 2 against x <= 5) is not a case: its values on each side are the
% boundary rows already.
numeric_prediction(Type, Op, Value, CaseOp, CaseValue, Predicted) :-
    integer_variables(Type, Var, IntVars),
    (   numeric_constraint_entailed([c(CaseOp, Var, CaseValue)], c(Op, Var, Value), IntVars)
    ->  Predicted = success
    ;   negated_operator(Op, Negated),
        numeric_constraint_entailed([c(CaseOp, Var, CaseValue)], c(Negated, Var, Value), IntVars)
    ->  Predicted = rejection
    ).

integer_variables(Type, Var, IntVars) :-
    (   Type == int
    ->  IntVars = [Var]
    ;   IntVars = []
    ).

case_id(ClaimKey, Generator, Constraint, Id) :-
    format(string(Text), '~w|~w|~q', [ClaimKey, Generator, Constraint]),
    crypto_data_hash(Text, Hash, [algorithm(sha256), encoding(utf8)]),
    sub_atom(Hash, 0, 12, _, Prefix),
    upcase_atom(Prefix, Upper),
    atom_concat('CASE-', Upper, Id).

%% case_covering_scenarios(+ScenarioIds, +Case, -Covering)
% The requirement's scenarios, other than drafts, whose expects matches the
% case's predicted outcome and whose assumptions on the case's subject and
% property entail the case constraint.
case_covering_scenarios(ScenarioIds, case(_, _, _, Key, _, Constraint, Predicted), Covering) :-
    findall(ScenarioId,
        (   member(ScenarioId, ScenarioIds),
            \+ draft_scenario(ScenarioId),
            scenario_expects(ScenarioId, Expects),
            outcome_matches(Predicted, Expects),
            kb_relationship(assumes, ScenarioId, AssumedId),
            assumption_entails(AssumedId, Key, Constraint)
        ),
        Covering0),
    sort(Covering0, Covering).

draft_scenario(ScenarioId) :-
    kb_entity(ScenarioId, scenario, Props),
    memberchk(status=Raw, Props),
    normalize_term_atom(Raw, draft).

scenario_expects(ScenarioId, Expects) :-
    kb_entity(ScenarioId, scenario, Props),
    (   memberchk(expects=Raw, Props)
    ->  normalize_term_atom(Raw, Expects)
    ;   Expects = success
    ).

outcome_matches(success, success).
outcome_matches(rejection, rejection).
outcome_matches(rejection, error).

assumption_entails(FactId, Subject-Property, Constraint) :-
    kb:fact_property_tuple(FactId, Subject, Property, AuthoredOp, ValueType, Value, _, _, Polarity),
    effective_operator(Polarity, AuthoredOp, Op),
    constraint_entailed(ValueType, Op, Value, Constraint).

constraint_entailed(Type, Op, Value, Constraint) :-
    (   Constraint = num(_, CaseOp, CaseValue)
    ->  numeric_value(Type, Value),
        integer_variables(Type, Var, IntVars),
        numeric_constraint_entailed([c(Op, Var, Value)], c(CaseOp, Var, CaseValue), IntVars)
    ;   Type == set,
        memberchk(Op, [eq, includes]),
        set_constraint_entailed(Constraint, Value)
    ).

% A set that includes the members Members lands in member(M) and
% excluded(M) when it names M, and in non_member(Allowed) when it names a
% value outside Allowed.
set_constraint_entailed(Constraint, Members) :-
    (   Constraint = non_member(Allowed)
    ->  subtract(Members, Allowed, Outside),
        Outside \== []
    ;   arg(1, Constraint, Member),
        memberchk(Member, Members)
    ).

%% case_dict(+Case, -Dict)
% The case as reported, with the assumption a scenario would state to land
% in it and the expects it would declare.
case_dict(case(Id, ClaimKey, FactId, Subject-Property, Generator, Constraint, Predicted), Dict) :-
    constraint_text(Constraint, Text),
    constraint_assumption(Subject, Property, Constraint, Assumption),
    Dict = _{
        caseId: Id,
        claimKey: ClaimKey,
        factId: FactId,
        subjectKey: Subject,
        propertyKey: Property,
        generator: Generator,
        constraint: Text,
        predicted: Predicted,
        assumption: Assumption
    }.

constraint_assumption(Subject, Property, Constraint, Assumption) :-
    assumed_value(Constraint, Op, Type, Value),
    Assumption = _{fact_kind: property_value, subject_key: Subject, property_key: Property,
                   operator: Op, value_type: Type, value: Value}.

assumed_value(num(Type, Op, Value), Op, Type, Value).
assumed_value(member(Member), includes, set, [Member]).
assumed_value(non_member(_), includes, set, ['<a value outside the set>']).
assumed_value(excluded(Member), includes, set, [Member]).

%% fact_case_waiver(+FactId, -Waiver)
% A grounding fact whose cases a person accepted as covered some other way
% (a unit suite that walks every member, a value class the system cannot
% produce) records why in case_waiver and who accepted it in
% case_waiver_approved_by.  Only an approved waiver counts.  Waiver is _{}
% when none is recorded.
fact_case_waiver(FactId, Waiver) :-
    (   kb_entity(FactId, fact, Props),
        memberchk(case_waiver=RawReason, Props),
        normalize_term_atom(RawReason, Reason),
        Reason \== ''
    ->  atom_string(Reason, ReasonText),
        (   memberchk(case_waiver_approved_by=RawBy, Props),
            normalize_term_atom(RawBy, By),
            By \== ''
        ->  atom_string(By, ByText),
            Waiver = _{reason: ReasonText, approvedBy: ByText}
        ;   Waiver = _{reason: ReasonText}
        )
    ;   Waiver = _{}
    ).

constraint_text(Constraint, Text) :-
    constraint_format(Constraint, Format, Args),
    format(string(Text), Format, Args).

constraint_format(num(_, Op, Value), '~w ~w', [Op, Value]).
constraint_format(member(Member), 'includes ~w', [Member]).
constraint_format(excluded(Member), 'includes ~w', [Member]).
constraint_format(non_member(Allowed), 'includes a value outside [~w]', [Joined]) :-
    atomic_list_concat(Allowed, ', ', Joined).
