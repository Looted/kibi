:- begin_tests(schema).

:- use_module(library(plunit)).
:- use_module('packages/core/schema/entities.pl').
:- use_module('packages/core/schema/relationships.pl').
:- use_module('packages/core/schema/validation.pl').

test(entity_types_count) :-
    findall(T, entity_type(T), Ts),
    sort(Ts, Sorted),
    Sorted == [adr,event,flag,req,scenario,symbol,test].

test(relationship_types_count) :-
    findall(R, relationship_type(R), Rs),
    sort(Rs, Sorted),
    % relationship_type/1 includes 10 items; ensure length and membership
    length(Sorted, 10),
    member(depends_on, Sorted),
    member(specified_by, Sorted),
    member(verified_by, Sorted).

test(valid_relationship_ok) :-
    validate_relationship(depends_on, req, req).

test(invalid_relationship_bad_types) :-
    \+ validate_relationship(depends_on, invalid, req).

test(missing_required_property) :-
    % missing title
    Props = [id=foo, status=active, created_at="2020-01-01", updated_at="2020-01-01", source="http://x"],
    \+ validate_entity(req, Props).

test(invalid_property_type) :-
    Props = [id=foo, title=Title, status=active, created_at=123, updated_at="2020-01-01", source="http://x"],
    Title = "A title",
    \+ validate_entity(req, Props).

test(valid_entity) :-
    Props = [id=foo, title="T", status=active, created_at="2020-01-01", updated_at="2020-01-01", source="http://x"],
    validate_entity(req, Props).

:- end_tests(schema).
