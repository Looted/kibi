"""Parser fixture with repeat names across lexical scopes."""

class Box:
    def same(self, value):
        def inner():
            return value
        return inner()

class Crate:
    def same(self):
        return None

def same():
    return None
