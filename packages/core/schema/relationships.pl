% Module: kibi_relationships
% Relationship type definitions and valid entity combinations
:- module(kibi_relationships, [relationship_type/1, valid_relationship/3, relationship_metadata/1]).

% Relationship types
relationship_type(depends_on).
relationship_type(specified_by).
relationship_type(verified_by).
relationship_type(validates).
relationship_type(implements).
relationship_type(covered_by).
relationship_type(constrained_by).
relationship_type(guards).
relationship_type(publishes).
relationship_type(consumes).
relationship_type(relates_to).

% valid_relationship(RelType, FromType, ToType).
valid_relationship(depends_on, req, req).
valid_relationship(specified_by, scenario, req).
valid_relationship(verified_by, req, test).
valid_relationship(validates, test, req).
valid_relationship(implements, symbol, req).
valid_relationship(covered_by, symbol, test).
valid_relationship(constrained_by, symbol, adr).
% guards can target symbol, event, or req
valid_relationship(guards, flag, symbol).
valid_relationship(guards, flag, event).
valid_relationship(guards, flag, req).
valid_relationship(publishes, symbol, event).
valid_relationship(consumes, symbol, event).
% escape hatch - allow any to any
valid_relationship(relates_to, _, _).

% Relationship metadata fields (some optional)
relationship_metadata([created_at, created_by, source, confidence]).
