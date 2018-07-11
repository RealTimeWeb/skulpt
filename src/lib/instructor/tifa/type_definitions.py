from literal_definitions import LiteralNum

def _dict_extends(d1, d2):
    '''
    Helper function to create a new dictionary with the contents of the two
    given dictionaries. Does not modify either dictionary, and the values are
    copied shallowly. If there are repeates, the second dictionary wins ties.
    
    The function is written to ensure Skulpt compatibility.
    
    Args:
        d1 (dict): The first dictionary
        d2 (dict): The second dictionary
    
    '''
    d3 = {}
    for key, value in d1.items():
        d3[key] = value
    for key, value in d2.items():
        d3[key] = value
    return d3

class Type:
    '''
    Parent class for all other types, used to provide a common interface.
    
    TODO: Handle more complicated object-oriented types and custom types
    (classes).
    '''
    fields = {}
    immutable = False
    def clone(self):
        return self.__class__()
    def __str__(self):
        return str(self.__class__.__name__)
    def clone_mutably(self):
        if self.immutable:
            return self.clone()
        else:
            return self
    def index(self, i):
        return self.clone()
    def load_attr(self, attr, tifa, callee=None, callee_position=None):
        if attr in self.fields:
            return self.fields[attr]
        # TODO: Handle more kinds of common mistakes
        if attr == "append":
            tifa.report_issue('Append to non-list', 
                              {'name': tifa.identify_caller(callee), 
                               'position': callee_position, 'type': self})
        return UnknownType()
    def is_empty(self):
        return True
    

class UnknownType(Type):
    '''
    A special type used to indicate an unknowable type.
    '''

class RecursedType(Type):
    '''
    A special type used as a placeholder for the result of a
    recursive call that we have already process. This type will
    be dominated by any actual types, but will not cause an issue.
    '''

class FunctionType(Type):
    '''
    
    Special values for `returns`:
        identity: Returns the first argument's type
        element: Returns the first argument's first element's type
        void: Returns the NoneType
    '''
    def __init__(self, definition=None, name="*Anonymous", returns=None):
        if returns is not None and definition is None:
            if returns == 'identity':
                def definition(ti, ty, na, args, ca):
                    if args:
                        return args[0].clone()
                    return UnknownType()
            elif returns == 'element':
                def definition(ti, ty, na, args, ca):
                    if args:
                        return args[0].index(0)
                    return UnknownType()
            elif returns == 'void':
                def definition(ti, ty, na, args, ca):
                    return NoneType()
            else:
                def definition(ti, ty, na, args, ca):
                    return returns.clone()
        self.definition = definition
        self.name = name
        
class ClassType(Type):
    def __init__(self, name):
        self.name = name
        
class NumType(Type):
    immutable = True
    def index(self, i):
        return UnknownType()
    
class NoneType(Type):
    immutable = True
    
class BoolType(Type):
    immutable = True

class TupleType(Type):
    '''
    '''
    def __init__(self, subtypes=None):
        if subtypes is None:
            subtypes = []
        self.subtypes = subtypes
    def index(self, i):
        if isinstance(i, LiteralNum):
            return self.subtypes[i.value].clone()
        else:
            return self.subtypes[i].clone()
    def clone(self):
        return TupleType([t.clone() for t in self.subtypes])
    immutable = True

class ListType(Type):
    def __init__(self, subtype=None, empty=True):
        if subtype is None:
            subtype = UnknownType()
        self.subtype = subtype
        self.empty = empty
    def index(self, i):
        return self.subtype.clone()
    def clone(self):
        return ListType(self.subtype.clone(), self.empty)
    def load_attr(self, attr, tifa, callee=None, callee_position=None):
        if attr == 'append':
            def _append(tifa, function_type, callee, args, position):
                if args:
                    if callee:
                        tifa.append_variable(callee, ListType(args[0].clone()), 
                                             position)
                    self.empty = False
                    self.subtype = args[0]
            return FunctionType(_append, 'append')
        return Type.load_attr(self, attr, tifa, callee, callee_position)
    def is_empty(self):
        return self.empty

class StrType(Type):
    def index(self, i):
        return StrType()
    fields = _dict_extends(Type.fields, {})
    immutable = True

StrType.fields.update({
    # Methods that return strings
    "capitalize": FunctionType(name='capitalize', returns=StrType()),
    "center": FunctionType(name='center', returns=StrType()),
    "expandtabs": FunctionType(name='expandtabs', returns=StrType()),
    "join": FunctionType(name='join', returns=StrType()),
    "ljust": FunctionType(name='ljust', returns=StrType()),
    "lower": FunctionType(name='lower', returns=StrType()),
    "lstrip": FunctionType(name='lstrip', returns=StrType()),
    "replace": FunctionType(name='replace', returns=StrType()),
    "rjust": FunctionType(name='rjust', returns=StrType()),
    "rstrip": FunctionType(name='rstrip', returns=StrType()),
    "strip": FunctionType(name='strip', returns=StrType()),
    "swapcase": FunctionType(name='swapcase', returns=StrType()),
    "title": FunctionType(name='title', returns=StrType()),
    "translate": FunctionType(name='translate', returns=StrType()),
    "upper": FunctionType(name='upper', returns=StrType()),
    "zfill": FunctionType(name='zfill', returns=StrType()),
    # Methods that return numbers
    "count": FunctionType(name='count', returns=NumType()),
    "find": FunctionType(name='find', returns=NumType()),
    "rfind": FunctionType(name='rfind', returns=NumType()),
    "index": FunctionType(name='index', returns=NumType()),
    "rindex": FunctionType(name='rindex', returns=NumType()),
    # Methods that return booleans
    "startswith": FunctionType(name='startswith', returns=BoolType()),
    "endswith": FunctionType(name='endswith', returns=BoolType()),
    "isalnum": FunctionType(name='isalnum', returns=BoolType()),
    "isalpha": FunctionType(name='isalpha', returns=BoolType()),
    "isdigit": FunctionType(name='isdigit', returns=BoolType()),
    "islower": FunctionType(name='islower', returns=BoolType()),
    "isspace": FunctionType(name='isspace', returns=BoolType()),
    "istitle": FunctionType(name='istitle', returns=BoolType()),
    "isupper": FunctionType(name='isupper', returns=BoolType()),
    # Methods that return List of Strings
    "rsplit": FunctionType(name='rsplit', returns=ListType(StrType())),
    "split": FunctionType(name='split', returns=ListType(StrType())),
    "splitlines": FunctionType(name='splitlines', returns=ListType(StrType()))
})
class FileType(Type):
    def index(self, i):
        return StrType()
    fields = _dict_extends(Type.fields, {
        'close': FunctionType(name='close', returns='void'),
        'read': FunctionType(name='read', returns=StrType()),
        'readlines': FunctionType(name='readlines', returns=ListType(StrType(), False))
    })
    
class DictType(Type):
    def __init__(self, empty=False, literals=None, keys=None, values=None):
        self.empty = empty
        self.literals = literals
        self.values = values
        self.keys = keys
    def clone(self):
        return DictType(self.empty, self.literals, self.keys, self.values)
    def is_empty(self):
        return self.empty
    def index(self, i):
        if self.empty:
            return UnknownType()
        elif self.literals is not None:
            for literal, value in zip(self.literals, self.values):
                if are_literals_equal(literal, i):
                    return value.clone()
            return UnknownType()
        else:
            return self.keys.clone()
    def load_attr(self, attr, tifa, callee=None, callee_position=None):
        if attr == 'items':
            def _items(tifa, function_type, callee, args, position):
                if self.literals is None:
                    return ListType(TupleType([self.keys, self.values]))
                else:
                    return ListType(TupleType([self.literals[0].type(),
                                               self.values[0]]))
            return FunctionType(_items, 'items')
        elif attr == 'keys':
            def _keys(tifa, function_type, callee, args, position):
                if self.literals is None:
                    return ListType(self.keys)
                else:
                    return ListType(self.literals[0].type())
            return FunctionType(_keys, 'keys')
        elif attr == 'values':
            def _items(tifa, function_type, callee, args, position):
                if self.literals is None:
                    return ListType(self.values)
                else:
                    return ListType(self.values[0])
            return FunctionType(_values, 'values')
        return Type.load_attr(self, attr, tifa, callee, callee_position)

class ModuleType(Type):
    def __init__(self, name="*UnknownModule", submodules=None, fields=None):
        self.name = name
        if submodules is None:
            submodules = {}
        self.submodules = submodules
        if fields is None:
            fields = {}
        self.fields = fields

class SetType(ListType):
    pass

class GeneratorType(ListType):
    pass

# Custom parking class in blockpy    
class TimeType(Type): pass
class DayType(Type): pass
