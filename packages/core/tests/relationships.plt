:- use_module(library(plunit)).
:- use_module('../schema/relationships.pl').

% Pins the relationship schema tables. An endpoint written as a variable
% matches every entity type, shown here as `any`.

:- begin_tests(relationships).

any_type(Type, Shown) :-
    (   var(Type) -> Shown = any ; Shown = Type ).

test(relationship_types) :-
    findall(Type, relationship_type(Type), Types),
    Types == [depends_on, executable_for, specified_by, verified_by, validates, implements,
              covered_by, constrained_by, guards, publishes, consumes, relates_to, supersedes,
              restates, constrains, requires_property, requires_predicate, requires_rule,
              assumes, exempts].

test(valid_relationships) :-
    findall(Rel-From-To,
            ( valid_relationship(Rel, From0, To0), any_type(From0, From), any_type(To0, To) ),
            Rows),
    expected_valid_relationships(Expected),
    Rows == Expected.

test(relationship_metadata) :-
    findall(Fields, relationship_metadata(Fields), Rows),
    Rows == [[created_at, created_by, source, confidence]].

:- end_tests(relationships).

expected_valid_relationships([
    depends_on-req-req,
    executable_for-symbol-test,
    specified_by-req-scenario,
    verified_by-req-test,
    verified_by-scenario-test,
    validates-test-req,
    validates-test-scenario,
    implements-symbol-req,
    covered_by-symbol-test,
    constrained_by-symbol-adr,
    guards-flag-symbol,
    guards-flag-event,
    guards-flag-req,
    publishes-symbol-event,
    consumes-symbol-event,
    constrains-req-fact,
    requires_property-req-fact,
    requires_predicate-req-fact,
    requires_rule-req-fact,
    assumes-scenario-fact,
    exempts-req-req,
    supersedes-adr-adr,
    supersedes-req-req,
    restates-req-req,
    relates_to-any-any
]).
