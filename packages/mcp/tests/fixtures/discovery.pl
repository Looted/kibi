:- module(discovery, [graph_expand_json/8]).

:- use_module(library(http/json)).

graph_expand_json(_SeedIds, _Relationships, _Direction, _Depth, _EntityTypes, _MaxNodes, _MaxEdges, JsonString) :-
    atom_json_dict(JsonString, json{
        nodes: [json{id:'REQ-skillopt-1', type:req, title:'skillopt graph fixture', status:open}],
        edges: [],
        truncated: false
    }, [as(string)]).
