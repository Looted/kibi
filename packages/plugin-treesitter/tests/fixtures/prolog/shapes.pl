:- module(shapes, [area/2, describe//1]).
:- use_module(library(lists)).

%!  area(+Shape, -Area) is det.
%
%   Area of a shape.
% implements REQ-demo-shape-area
area(square(Side), Area) :-
    Area is Side * Side.
area(circle(R), Area) :-
    Area is pi * R ** 2.

area(Shape) :-
    area(Shape, _).

describe(Shape) --> [shape(Shape)].

shapes:scale(Factor, Shape, scaled(Factor, Shape)).
user:portray(square(_)) :- write(square).

normalize(Shape, Out), Shape = square(_) => Out = Shape.
'quoted pred'(_).
