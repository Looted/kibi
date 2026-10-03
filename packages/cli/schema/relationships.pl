% Module: kibi_relationships
% Relationship type definitions and valid entity combinations
:- module(kibi_relationships, [relationship_type/1, valid_relationship/3, relationship_metadata/1]).

% Relationship types
% implements REQ-005
relationship_type(depends_on).
relationship_type(executable_for).
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
relationship_type(supersedes).
relationship_type(restates).
relationship_type(constrains).
relationship_type(requires_property).
relationship_type(requires_predicate).
relationship_type(requires_rule).
relationship_type(assumes).
relationship_type(exempts).

% valid_relationship(RelType, FromType, ToType).
valid_relationship(depends_on, req, req).
valid_relationship(executable_for, symbol, test).
valid_relationship(specified_by, req, scenario).
valid_relationship(verified_by, req, test).
valid_relationship(verified_by, scenario, test).
valid_relationship(validates, test, req).
valid_relationship(validates, test, scenario).
valid_relationship(implements, symbol, req).
valid_relationship(covered_by, symbol, test).
valid_relationship(constrained_by, symbol, adr).
% guards can target symbol, event, or req
valid_relationship(guards, flag, symbol).
valid_relationship(guards, flag, event).
valid_relationship(guards, flag, req).
valid_relationship(publishes, symbol, event).
valid_relationship(consumes, symbol, event).
valid_relationship(constrains, req, fact).
valid_relationship(requires_property, req, fact).
valid_relationship(requires_predicate, req, fact).
valid_relationship(requires_rule, req, fact).

%% assumes(+ScenarioId, +FactId)
%% The scenario's outcome depends on the property_value fact holding (for
%% example "the order total is 0"). Checked against current requirements by
%% the scenario-feasibility rule.
% implements REQ-kibi-scenario-feasibility
valid_relationship(assumes, scenario, fact).

%% exempts(+ExceptionReqId, +BaseReqId)
%% An approved exception requirement exempts the scenarios it specifies from
%% BaseReqId's property constraints. BaseReqId stays current and unchanged.
valid_relationship(exempts, req, req).

%% supersedes(+NewAdrId, +OldAdrId)
%% NewAdrId is the decision that replaces OldAdrId.
%% OldAdrId's status should be archived or deprecated as a consequence.
valid_relationship(supersedes, adr, adr).
valid_relationship(supersedes, req, req).

%% restates(+ReqId, +OtherReqId)
%% ReqId intentionally restates OtherReqId (for example a product requirement
%% echoed in a platform requirement). Both stay current; the pair is exempt
%% from domain-redundancy. Use supersedes when one replaces the other.
% implements REQ-kibi-restates-relationship
valid_relationship(restates, req, req).
% escape hatch - allow any to any
valid_relationship(relates_to, _, _).

% Relationship metadata fields (some optional)
relationship_metadata([created_at, created_by, source, confidence]).
