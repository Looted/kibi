% Module: kb
% Core Knowledge Base module with RDF persistence and audit logging
:- module(kb, [
    kb_attach/1,
    kb_detach/0,
    kb_save/0,
    with_kb_mutex/1,
    kb_assert_entity/2,
    kb_retract_entity/1,
    kb_entity/3,
    kb_entities_by_source/2,
    kb_assert_relationship/4,
    kb_relationship/3,
    transitively_implements/2,
    transitively_depends/2,
    impacted_by_change/2,
    affected_symbols/2,
    coverage_gap/2,
    untested_symbols/1,
    stale/2,
    orphaned/1,
    conflicting/2,
    deprecated_still_used/2,
    changeset/4  % Export for testing
]).

:- use_module(library(semweb/rdf11)).
:- use_module(library(persistency)).
:- use_module(library(thread)).
:- use_module(library(filesex)).
:- use_module(library(ordsets)).
:- use_module('../schema/entities.pl', [entity_type/1, entity_property/3, required_property/2]).
:- use_module('../schema/relationships.pl', [relationship_type/1, valid_relationship/3]).
:- use_module('../schema/validation.pl', [validate_entity/2, validate_relationship/3]).

% RDF namespace for KB entities and relationships
:- rdf_register_prefix(kb, 'http://kibi.dev/kb/').
:- rdf_register_prefix(xsd, 'http://www.w3.org/2001/XMLSchema#').
:- rdf_meta
    kb_entity(?, ?, ?),
    kb_relationship(?, ?, ?).

% Persistent audit log declaration
:- persistent
    changeset(timestamp:atom, operation:atom, entity_id:atom, data:any).

% Dynamic facts to track KB state
:- dynamic kb_attached/1.
:- dynamic kb_audit_db/1.
:- dynamic kb_graph/1.

%% kb_attach(+Directory)
% Attach to a KB directory with RDF persistence and file locking.
% Creates directory if it doesn't exist.
kb_attach(Directory) :-
    % If we were already attached in this process, detach first.
    % This prevents accidentally loading the same RDF snapshot multiple times.
    (   kb_attached(_)
    ->  kb_detach
    ;   true
    ),
    % Ensure directory exists
    (   exists_directory(Directory)
    ->  true
    ;   make_directory_path(Directory)
    ),
    % Create RDF graph name from directory
    atom_concat('file://', Directory, GraphURI),
    % If a graph with this URI is already present, unload it to avoid duplicates.
    (   rdf_graph(GraphURI)
    ->  rdf_unload_graph(GraphURI)
    ;   true
    ),
    % Load existing RDF data if present
    atom_concat(Directory, '/kb.rdf', DataFile),
    (   exists_file(DataFile)
    ->  rdf_load(DataFile, [graph(GraphURI), silent(true)])
    ;   true
    ),
    % Set up audit log - only attach if not already attached
    atom_concat(Directory, '/audit.log', AuditLog),
    (   db_attached(AuditLog)
    ->  true  % Already attached
    ;   db_attach(AuditLog, [])
    ),
    % Track attachment state
    assert(kb_attached(Directory)),
    assert(kb_audit_db(AuditLog)),
    assert(kb_graph(GraphURI)).

%% kb_detach
% Safely detach from KB, flushing journals and closing audit log.
kb_detach :-
    (   kb_attached(_Directory)
    ->  (
            kb_save,
            % Clear state
            retractall(kb_attached(_)),
            retractall(kb_audit_db(_)),
            retractall(kb_graph(_))
        )
    ;   true
    ).

%% kb_save
% Save RDF graph and sync audit log to disk
kb_save :-
    (   kb_attached(Directory)
    ->  (
            % Save RDF graph to file with namespace declarations
            atom_concat(Directory, '/kb.rdf', DataFile),
            % If we have a graph URI, save that graph. Otherwise save all data
            % (fallback) so a kb.rdf is always produced. Report errors if save fails.
            (   kb_graph(GraphURI)
            ->  catch(rdf_save(DataFile, [graph(GraphURI), namespaces([kb, xsd])]), E, print_message(error, E))
            ;   catch(rdf_save(DataFile, [namespaces([kb, xsd])]), E2, print_message(error, E2))
            ),
            % Sync audit log
            (   kb_audit_db(AuditLog)
            ->  db_sync(AuditLog)
            ;   true
            )
        )
    ;   true
    ).

%% with_kb_mutex(+Goal)
% Execute Goal with KB mutex protection for thread safety.
with_kb_mutex(Goal) :-
    with_mutex(kb_lock, Goal).

%% kb_assert_entity(+Type, +Properties)
% Assert an entity into the KB with validation and audit logging.
% Properties is a list of Key=Value pairs.
kb_assert_entity(Type, Props) :-
    % Validate entity
    validate_entity(Type, Props),
    % Extract ID
    memberchk(id=Id, Props),
    % Get current graph
    kb_graph(Graph),
    % Execute with mutex protection
    with_kb_mutex((
        % Create entity URI
        atom_concat('kb:entity/', Id, EntityURI),
        % Upsert semantics: remove any existing triples for this entity first.
        rdf_retractall(EntityURI, _, _, Graph),
        % Store type as string literal to prevent URI interpretation
        atom_string(Type, TypeStr),
        rdf_assert(EntityURI, kb:type, TypeStr^^'http://www.w3.org/2001/XMLSchema#string', Graph),
        % Store all properties
        forall(
            member(Key=Value, Props),
            store_property(EntityURI, Key, Value, Graph)
        ),
        % Log to audit
        get_time(Timestamp),
        format_time(atom(TS), '%FT%T%:z', Timestamp),
        assert_changeset(TS, upsert, Id, Type-Props)
    )).

%% kb_retract_entity(+Id)
% Remove an entity from the KB with audit logging.
kb_retract_entity(Id) :-
    kb_graph(Graph),
    with_kb_mutex((
        % Create entity URI
        atom_concat('kb:entity/', Id, EntityURI),
        % Remove all triples for this entity
        rdf_retractall(EntityURI, _, _, Graph),
        % Log to audit
        get_time(Timestamp),
        format_time(atom(TS), '%FT%T%:z', Timestamp),
        assert_changeset(TS, delete, Id, null)
    )).

%% kb_entity(?Id, ?Type, ?Properties)
% Query entities from the KB.
% Properties is unified with a list of Key=Value pairs.
kb_entity(Id, Type, Props) :-
    kb_graph(Graph),
    % Find entity by pattern - use unquoted namespace term kb:type
    (   var(Id)
    ->  rdf(EntityURI, kb:type, TypeLiteral, Graph),
        atom_concat('kb:entity/', Id, EntityURI)
    ;   atom_concat('kb:entity/', Id, EntityURI),
        rdf(EntityURI, kb:type, TypeLiteral, Graph)
    ),
    % Extract type - convert string literal to atom
    literal_to_atom(TypeLiteral, Type),
    % Collect all properties (exclude kb:type which expands to full URI)
    findall(Key=Value, (
        rdf(EntityURI, PropURI, ValueLiteral, Graph),
        PropURI \= 'http://kibi.dev/kb/type',
        uri_to_key(PropURI, Key),
        literal_to_value(ValueLiteral, Value)
    ), Props).

%% kb_entities_by_source(+SourcePath, -Ids)
% Returns all entity IDs whose source property matches SourcePath (substring match).
kb_entities_by_source(SourcePath, Ids) :-
    findall(Id,
        (kb_entity(Id, _Type, Props),
         memberchk(source-S, Props),
         sub_atom(S, _, _, _, SourcePath)),
        Ids).

%% kb_assert_relationship(+Type, +From, +To, +Metadata)
% Assert a relationship between two entities with validation.
kb_assert_relationship(RelType, FromId, ToId, _Metadata) :-
    kb_graph(Graph),
    % Validate entities exist and relationship is valid
    % Use once/1 to keep this predicate deterministic even if the store
    % contains duplicate type triples from previous versions.
    once(kb_entity(FromId, FromType, _)),
    once(kb_entity(ToId, ToType, _)),
    validate_relationship(RelType, FromType, ToType),
    % Execute with mutex protection
    with_kb_mutex((
        % Create entity URIs
        atom_concat('kb:entity/', FromId, FromURI),
        atom_concat('kb:entity/', ToId, ToURI),
        % Create relationship property URI (full URI to match saved/loaded RDF)
        atom_concat('http://kibi.dev/kb/', RelType, RelURI),
        % Upsert semantics: ensure the exact triple isn't duplicated.
        rdf_retractall(FromURI, RelURI, ToURI, Graph),
        % Assert relationship triple
        rdf_assert(FromURI, RelURI, ToURI, Graph),
        % Log to audit
        get_time(Timestamp),
        format_time(atom(TS), '%FT%T%:z', Timestamp),
        format(atom(RelId), '~w->~w', [FromId, ToId]),
        assert_changeset(TS, upsert_rel, RelId, RelType-[from=FromId, to=ToId])
    )).

%% kb_relationship(?Type, ?From, ?To)
% Query relationships from the KB.
kb_relationship(RelType, FromId, ToId) :-
    kb_graph(Graph),
    % Create relationship property URI (full URI to match loaded RDF)
    atom_concat('http://kibi.dev/kb/', RelType, RelURI),
    % Find matching relationships
    rdf(FromURI, RelURI, ToURI, Graph),
    % Extract IDs from URIs
    atom_concat('kb:entity/', FromId, FromURI),
    atom_concat('kb:entity/', ToId, ToURI).

% Helper predicates

%% store_property(+EntityURI, +Key, +Value, +Graph)
% Store a property as an RDF triple with appropriate datatype.
store_property(EntityURI, Key, Value, Graph) :-
    % Build full property URI
    atom_concat('http://kibi.dev/kb/', Key, PropURI),
    (   atom(Value)
    ->  % Atoms stored as URIs/resources (for status, id, etc.)
        rdf_assert(EntityURI, PropURI, Value, Graph)
    ;   % Other types as literals
        value_to_literal(Value, Literal),
        rdf_assert(EntityURI, PropURI, Literal, Graph)
    ).

%% value_to_literal(+Value, -Literal)
% Convert Prolog value to RDF literal with appropriate datatype.
value_to_literal(Value, Literal) :-
    (   string(Value)
    ->  Literal = Value^^'http://www.w3.org/2001/XMLSchema#string'
    ;   is_list(Value)
    ->  format(atom(ListStr), '~w', [Value]),
        Literal = ListStr^^'http://www.w3.org/2001/XMLSchema#string'
    ;   format(atom(Str), '~w', [Value]),
        Literal = Str^^'http://www.w3.org/2001/XMLSchema#string'
    ).

%% literal_to_value(+Literal, -Value)
% Extract value from RDF literal, parse list syntax back to Prolog lists.
literal_to_value(Literal, Value) :-
    (   % Handle ^^/2 functor (RDF typed literal shorthand)
        Literal = ^^(StrVal, 'http://www.w3.org/2001/XMLSchema#string')
    ->  (   % Preserve RDF typed literal functor for string values so callers
            % can inspect datatype if needed; but also attempt to parse lists
            % encoded as string into Prolog lists when appropriate.
            (atom(StrVal) ; string(StrVal)),
            (atom_concat('[', _, StrVal) ; string_concat("[", _, StrVal)),
            catch(atom_to_term(StrVal, ParsedValue, []), _, fail),
            is_list(ParsedValue)
        ->  Value = ParsedValue
        ;   Value = ^^(StrVal, 'http://www.w3.org/2001/XMLSchema#string')
        )
    ;   Literal = ^^(Val, Type)
    ->  Value = ^^(Val, Type)  % Preserve other typed literals as their functor
    ;   Literal = literal(type('http://www.w3.org/2001/XMLSchema#string', StrVal))
    ->  (   % Try to parse as Prolog list term (handles both atoms and strings)
            (atom(StrVal) ; string(StrVal)),
            (atom_concat('[', _, StrVal) ; string_concat("[", _, StrVal)),
            catch(atom_to_term(StrVal, ParsedValue, []), _, fail),
            is_list(ParsedValue)
        ->  Value = ParsedValue
        ;   Value = StrVal
        )
    ;   Literal = literal(type(_, _))
    ->  Value = Literal  % Keep other typed literals as-is
    ;   Literal = literal(lang(_, Val))
    ->  Value = Val
    ;   Literal = literal(Value)
    ->  true
    ;   Value = Literal
    ).

%% literal_to_atom(+Literal, -Atom)
% Convert RDF literal to atom (for type field).
literal_to_atom(Literal, Atom) :-
    (   % Handle RDF typed literal shorthand functor ^^(Value, Type)
        Literal = ^^(Val, _Type)
    ->  (   % Val may be atom or string
            atom(Val)
        ->  Atom = Val
        ;   atom_string(Atom, Val)
        )
    ;   Literal = literal(type(_, StringVal))
    ->  atom_string(Atom, StringVal)
    ;   Literal = literal(Value)
    ->  (atom(Value) -> Atom = Value ; atom_string(Atom, Value))
    ;   atom(Literal)
    ->  Atom = Literal
    ;   atom_string(Atom, Literal)
    ).

%% uri_to_key(+URI, -Key)
% Convert URI to property key (strip kb: namespace prefix).
uri_to_key(URI, Key) :-
    (   atom_concat('http://kibi.dev/kb/', Key, URI)
    ->  true
    ;   atom_concat('kb:', Key, URI)
    ->  true
    ;   URI = Key
    ).

%% ------------------------------------------------------------------
%% Inference predicates (Phase 1)
%% ------------------------------------------------------------------

%% transitively_implements(+Symbol, +Req)
% A symbol transitively implements a requirement if it directly implements it,
% or if it is covered by a test that validates/verifies the requirement.
transitively_implements(Symbol, Req) :-
    kb_relationship(implements, Symbol, Req).
transitively_implements(Symbol, Req) :-
    kb_relationship(covered_by, Symbol, Test),
    kb_relationship(validates, Test, Req).
transitively_implements(Symbol, Req) :-
    kb_relationship(covered_by, Symbol, Test),
    kb_relationship(verified_by, Req, Test).

%% transitively_depends(+Req1, +Req2)
% Req1 transitively depends on Req2 through depends_on chains.
transitively_depends(Req1, Req2) :-
    transitively_depends_(Req1, Req2, []).

transitively_depends_(Req1, Req2, _) :-
    kb_relationship(depends_on, Req1, Req2).
transitively_depends_(Req1, Req2, Visited) :-
    kb_relationship(depends_on, Req1, Mid),
    Req1 \= Mid,
    \+ memberchk(Mid, Visited),
    transitively_depends_(Mid, Req2, [Req1|Visited]).

%% impacted_by_change(?Entity, +Changed)
% Entity is impacted if it is connected to Changed by any relationship
% direction via bounded, cycle-safe traversal.
impacted_by_change(Changed, Changed).
impacted_by_change(Entity, Changed) :-
    dif(Entity, Changed),
    connected_entity(Changed, Entity, [Changed]).

connected_entity(Current, Target, _Visited) :-
    linked_entity(Current, Target).
connected_entity(Current, Target, Visited) :-
    linked_entity(Current, Next),
    \+ memberchk(Next, Visited),
    connected_entity(Next, Target, [Next|Visited]).

linked_entity(A, B) :-
    relationship_type(RelType),
    kb_relationship(RelType, A, B).
linked_entity(A, B) :-
    relationship_type(RelType),
    kb_relationship(RelType, B, A).

%% affected_symbols(+Req, -Symbols)
% Symbols affected by a requirement change include symbols implementing Req,
% and symbols implementing requirements that depend on Req.
affected_symbols(Req, Symbols) :-
    setof(Symbol,
          RelatedReq^(requirement_in_scope(RelatedReq, Req),
                     transitively_implements(Symbol, RelatedReq)),
          Symbols),
    !.
affected_symbols(_, []).

requirement_in_scope(Req, Req).
requirement_in_scope(RelatedReq, Req) :-
    transitively_depends(RelatedReq, Req).

%% coverage_gap(+Req, -Reason)
% Detects missing scenario/test coverage for MUST requirements.
coverage_gap(Req, missing_scenario_and_test) :-
    must_requirement(Req),
    \+ has_scenario(Req),
    \+ has_test(Req).
coverage_gap(Req, missing_scenario) :-
    must_requirement(Req),
    \+ has_scenario(Req),
    has_test(Req).
coverage_gap(Req, missing_test) :-
    must_requirement(Req),
    has_scenario(Req),
    \+ has_test(Req).

must_requirement(Req) :-
    kb_entity(Req, req, Props),
    memberchk(priority=Priority, Props),
    normalize_term_atom(Priority, PriorityAtom),
    atom_string(PriorityAtom, PriorityStr),
    sub_string(PriorityStr, _, 4, 0, "must").

has_scenario(Req) :-
    kb_relationship(specified_by, _, Req).

has_test(Req) :-
    kb_relationship(validates, _, Req).
has_test(Req) :-
    kb_relationship(verified_by, Req, _).

%% untested_symbols(-Symbols)
% Returns symbols with no test coverage relationship.
untested_symbols(Symbols) :-
    setof(Symbol,
          (kb_entity(Symbol, symbol, _),
           \+ kb_relationship(covered_by, Symbol, _)),
          Symbols),
    !.
untested_symbols([]).

%% stale(+Entity, +MaxAgeDays)
% Entity is stale if updated_at is older than MaxAgeDays.
stale(Entity, MaxAgeDays) :-
    number(MaxAgeDays),
    MaxAgeDays >= 0,
    kb_entity(Entity, _, Props),
    memberchk(updated_at=UpdatedAt, Props),
    coerce_timestamp_atom(UpdatedAt, UpdatedAtAtom),
    parse_time(UpdatedAtAtom, iso_8601, UpdatedTs),
    get_time(NowTs),
    AgeDays is (NowTs - UpdatedTs) / 86400,
    AgeDays > MaxAgeDays.

%% orphaned(+Symbol)
% Symbol is orphaned if it has no core traceability links.
orphaned(Symbol) :-
    kb_entity(Symbol, symbol, _),
    \+ kb_relationship(implements, Symbol, _),
    \+ kb_relationship(covered_by, Symbol, _),
    \+ kb_relationship(constrained_by, Symbol, _).

%% conflicting(?Adr1, ?Adr2)
% ADRs conflict if they both constrain the same symbol and are distinct.
conflicting(Adr1, Adr2) :-
    kb_relationship(constrained_by, Symbol, Adr1),
    kb_relationship(constrained_by, Symbol, Adr2),
    Adr1 \= Adr2,
    Adr1 @< Adr2.

%% deprecated_still_used(+Adr, -Symbols)
% Deprecated/archived/rejected ADRs that still constrain symbols.
deprecated_still_used(Adr, Symbols) :-
    kb_entity(Adr, adr, Props),
    memberchk(status=Status, Props),
    normalize_term_atom(Status, StatusAtom),
    memberchk(StatusAtom, [deprecated, archived, rejected]),
    setof(Symbol, kb_relationship(constrained_by, Symbol, Adr), Symbols),
    !.
deprecated_still_used(_, []).

normalize_term_atom(Val^^_Type, Atom) :-
    !,
    normalize_term_atom(Val, Atom).
normalize_term_atom(literal(type(_, Val)), Atom) :-
    !,
    normalize_term_atom(Val, Atom).
normalize_term_atom(Val, Atom) :-
    string(Val),
    !,
    atom_string(ValAtom, Val),
    normalize_uri_atom(ValAtom, Atom).
normalize_term_atom(Val, Atom) :-
    atom(Val),
    !,
    normalize_uri_atom(Val, Atom).
normalize_term_atom(Val, Atom) :-
    term_string(Val, ValStr),
    atom_string(ValAtom, ValStr),
    normalize_uri_atom(ValAtom, Atom).

normalize_uri_atom(Value, Atom) :-
    (   sub_atom(Value, _, _, _, '/')
    ->  atomic_list_concat(Parts, '/', Value),
        last(Parts, Last),
        Atom = Last
    ;   Atom = Value
    ).

coerce_timestamp_atom(Val^^_Type, Atom) :-
    !,
    coerce_timestamp_atom(Val, Atom).
coerce_timestamp_atom(literal(type(_, Val)), Atom) :-
    !,
    coerce_timestamp_atom(Val, Atom).
coerce_timestamp_atom(Val, Atom) :-
    atom(Val),
    !,
    Atom = Val.
coerce_timestamp_atom(Val, Atom) :-
    string(Val),
    !,
    atom_string(Atom, Val).
coerce_timestamp_atom(Val, Atom) :-
    term_string(Val, Str),
    atom_string(Atom, Str).
