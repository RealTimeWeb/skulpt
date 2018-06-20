var $builtinmodule = function (name) {
    var mod = {};
    
    /**
     * Consumes an AST Node (JS version). Return a list of tuples of 
     * ``(fieldname, value)`` for each field in ``node._fields`` that is
     * present on *node*.
     */
    var iter_fieldsJs = function(node) {
        var fieldList = [];
        for (var i = 0; i < node._fields.length; i += 2) {
            var field = node._fields[i];
            if (field in node) {
                fieldList.push([field, node[field]]);
            }
        }
        return fieldList;
    }
    
    mod.iter_fields = function(node) {
        return node._fields;
    };
    
    var convertValue = function(value) {
        if (value === null) {
            return Sk.builtin.none.none$;
        } else if (isSpecialPyAst(value)) {
            var constructorName = functionName(value);
            return Sk.misceval.callsim(mod[constructorName], constructorName, true);
        } else if (Array === value.constructor) {
            var subvalues = [];
            for (var j = 0; j < value.length; j += 1) {
                var subvalue = value[j];
                var constructorName = functionName(subvalue.constructor);
                if (isJsAst(subvalue)) {
                    subvalue = Sk.misceval.callsim(mod[constructorName], subvalue);
                    subvalues.push(subvalue);
                }
                // No AST nodes have primitive list values, just
                //  lists of AST nodes
            }
            return Sk.builtin.list(subvalues);
        } else if (isJsAst(value)) {
            var constructorName = functionName(value.constructor)
            return Sk.misceval.callsim(mod[constructorName], value);
        } else {// Else already a Python value
            return value;
        }
    }
    
    var isJsAst = function(jsNode) {
        return jsNode instanceof Object && "_astname" in jsNode;
    }
    var isSpecialPyAst = function(val) {
        if (typeof val == "function") {
            switch (functionName(val)) {
                case "Add": case "Add": case "Sub": case "Mult": case "Div": 
                case "Mod": case "Pow": case "LShift": case "RShift": 
                case "BitOr": case "BitXor": case "BitAnd": case "FloorDiv":
                case "Store": case "Load": case "Del": case "Param":
                case "And": case "Or": case "Xor": case "Not":
                case "Invert": case "UAdd": case "USub":
                    return true;
                default: return false;
            }
        } else {
            return false;
        }
    }
    var isPyAst = function(pyValue) {
        return Sk.misceval.isTrue(Sk.builtin.isinstance(pyValue, mod.AST));
    };
    var isPyList = function(pyValue) {
        return Sk.misceval.isTrue(Sk.builtin.isinstance(pyValue, Sk.builtin.list));
    };
    
    var iter_child_nodesJs = function(node) {
        var fieldList = iter_fieldsJs(node);
        var resultList = [];
        for (var i = 0; i < fieldList.length; i += 1) {
            var field = fieldList[i][0], value = fieldList[i][1];
            if (value === null) {
                continue;
            }
            if ("_astname" in value) {
                resultList.push(value);
            } else if (value.constructor === Array) {
                for (var j = 0; j < value.length; j += 1) {
                    var subvalue = value[j];
                    if ("_astname" in subvalue) {
                        resultList.push(subvalue);
                    }
                }
            }
        }
        return resultList;
    }
    
    // Python node
    mod.iter_child_nodes = function(node) {
        var fieldList = node._fields.v;
        var childFields = [];
        for (var i = 0; i < fieldList.length; i += 1) {
            var field = Sk.ffi.remapToJs(fieldList[i].v[0]), 
                value = fieldList[i].v[1];
            if (isSpecialPyAst(value)) {
                childFields.push(value);
            } else if (isPyAst(value)) {
                childFields.push(value);
            } else if (isPyList(value)) {
                for (var j = 0; j < value.v.length; j += 1) {
                    var subvalue = value.v[j];
                    if (isPyAst(subvalue)) {
                        childFields.push(subvalue);
                    }
                }
            }
        }
        return Sk.builtin.list(childFields);
    };
    
    /**
     * Dump the tree in a pretty format
    */
    mod.dump = function(node, annotate_fields, include_attributes) {
        // Confirm valid arguments
        Sk.builtin.pyCheckArgs("dump", arguments, 1, 3);
        // node argument
        if (!isPyAst(node)) {
            throw new Sk.builtin.TypeError("expected AST, got "+Sk.abstr.typeName(node));
        }
        // annotate_fields argument
        if (annotate_fields === undefined) {
            annotate_fields = true;
        } else {
            Sk.builtin.pyCheckType("annotate_fields", "boolean", Sk.builtin.checkBool(annotate_fields));
            annotate_fields = Sk.ffi.remapToJs(annotate_fields);
        }
        // include_attributes argument
        if (include_attributes === undefined) {
            include_attributes = true;
        } else {
            Sk.builtin.pyCheckType("include_attributes", "boolean", Sk.builtin.checkBool(include_attributes));
            include_attributes = Sk.ffi.remapToJs(include_attributes);
        }
        // recursive dump
        var _format = function(node) {
            if (isSpecialPyAst(node)) {
                return functionName(node)+"()";
            } else if (isPyAst(node)) {
                var rv = node.jsNode._astname+"(";
                var fieldList = node._fields.v;
                var fieldArgs = [];
                for (var i = 0; i < fieldList.length; i += 1) {
                    var field = Sk.ffi.remapToJs(fieldList[i].v[0]), 
                        value = fieldList[i].v[1];
                    value = _format(value);
                    if (annotate_fields) {
                        fieldArgs.push(field+"="+value);
                    } else {
                        fieldArgs.push(value);
                    }
                }
                var attributeList = node._attributes.v;
                if (include_attributes) {
                    for (var i = 0; i < attributeList.length; i += 1) {
                        var field = Sk.ffi.remapToJs(attributeList[i]);
                        var value = Sk.ffi.remapToJs(node.jsNode[field])
                        fieldArgs.push(field+"="+value);
                    }
                }
                fieldArgs = fieldArgs.join(", ");
                return rv + fieldArgs + ")";
            } else if (isPyList(node)) {
                var nodes = node.v.map(_format);
                nodes = nodes.join(', ');
                return "["+nodes+"]";
            } else {
                return Sk.ffi.remapToJs(node.$r());
            }
        }
        return Sk.ffi.remapToPy(_format(node, 0));
    }

    NodeVisitor = function($gbl, $loc) {
        // Takes in Python Nodes, not JS Nodes
        $loc.visit = new Sk.builtin.func(function(self, node) {
            /** Visit a node. **/
            print("VISIT", node.jsNode._astname)
            var method_name = 'visit_' + node.jsNode._astname;
            method_name = Sk.ffi.remapToPy(method_name)
            method = Sk.builtin.getattr(self, method_name, $loc.generic_visit)
            if (method.im_self) {
                //print(method.im_func.func_code)
                result = Sk.misceval.callsim(method, node);
                print(node.jsNode._astname, "COMING BACK WITH", Sk.ffi.remapToJs(result.$r()))
                return result;
            }else {
                result = Sk.misceval.callsim(method, self, node);
                print(node.jsNode._astname, "COMING BACK WITH", result)
                return result;
            }
            
        });
        // Takes in Python Nodes, not JS Nodes
        $loc.generic_visit = new Sk.builtin.func(function(self, node) {
            /** Called if no explicit visitor function exists for a node. **/
            var fieldList = mod.iter_fields(node).v;
            for (var i = 0; i < fieldList.length; i += 1) {
                var field = fieldList[i].v[0].v, value = fieldList[i].v[1];
                if (value === null) {
                    continue;
                } else if (isPyList(value)) {
                    for (var j = 0; j < value.v.length; j += 1) {
                        var subvalue = value.v[j];
                        if (isPyAst(subvalue)) {
                            //print(self.visit)
                            Sk.misceval.callsim(self.visit, self, subvalue);
                        }
                    }
                } else if (isPyAst(value)) {
                    //print(self.visit)
                    Sk.misceval.callsim(self.visit, self, value);
                }
            }
        });
    }
    mod.NodeVisitor = Sk.misceval.buildClass(mod, NodeVisitor, "NodeVisitor", []);

    // Python node
    mod.walk = function(node) {
        if (isSpecialPyAst(node)) {
            return Sk.builtin.list([]);
        }
        var resultList = [node];
        var childList = mod.iter_child_nodes(node);
        for (var i = 0; i < childList.v.length; i += 1) {
            var child = childList.v[i];
            var children = mod.walk(child);
            resultList = resultList.concat(children.v);
        }
        return Sk.builtin.list(resultList);
    }

    /*NodeVisitor.prototype.visitList = function(nodes) {
        for (var j = 0; j < nodes.length; j += 1) {
            var node = nodes[j];
            if ("_astname" in node) {
                this.visit(node);
            }
        }
    }

    NodeVisitor.prototype.recursive_walk = function(node) {
        var todo = [node];
        var result = [];
        while (todo.length > 0) {
            node = todo.shift();
            todo = todo.concat(iter_child_nodes(node))
            result.push(node);
        }
        return result;
    }*/
    
    var depth = 0;
    AST = function($gbl, $loc) {
        var copyFromJsNode = function(self, key, jsNode) {
            if (key in self.jsNode) {
                Sk.abstr.sattr(self, key, Sk.ffi.remapToPy(jsNode[key]), true);
                self._attributes.push(Sk.builtin.str(key));
            }
        };
        $loc.__init__ = new Sk.builtin.func(function (self, jsNode, partial) {
            depth+=1;
            if (partial === true) {
                // Alternative constructor for Skulpt's weird nodes
                print(" ".repeat(depth)+"S:", jsNode);
                self.jsNode = {'_astname': jsNode};
                self.astname = jsNode;
                self._fields = Sk.builtin.list([]);
                self._attributes = Sk.builtin.list([]);
                Sk.abstr.sattr(self, '_fields', self._fields, true);
                Sk.abstr.sattr(self, '_attributes', self._attributes, true);
            } else {
                print(" ".repeat(depth)+"P:", jsNode._astname);
                self.jsNode = jsNode;
                self.astname = jsNode._astname;
                var fieldListJs = iter_fieldsJs(jsNode);
                self._fields = [];
                self._attributes = [];
                for (var i = 0; i < fieldListJs.length; i += 1) {
                    var field = fieldListJs[i][0], value = fieldListJs[i][1];
                    value = convertValue(value);
                    Sk.abstr.sattr(self, field, value, true);
                    self._fields.push(Sk.builtin.tuple([Sk.builtin.str(field), value]));
                }
                self._fields = Sk.builtin.list(self._fields)
                Sk.abstr.sattr(self, '_fields', self._fields, true);
                copyFromJsNode(self, 'lineno', self.jsNode);
                copyFromJsNode(self, 'col_offset', self.jsNode);
                copyFromJsNode(self, 'endlineno', self.jsNode);
                copyFromJsNode(self, 'col_endoffset', self.jsNode);
                self._attributes = Sk.builtin.list(self._attributes);
                Sk.abstr.sattr(self, '_attributes', self._attributes, true);
            }
            depth -= 1;
        });
        $loc.__str__ = new Sk.builtin.func(function (self) {
            return Sk.builtin.str("<_ast."+self.astname+" object>");
        });
        $loc.__repr__ = $loc.__str__;
    }
    mod.AST = Sk.misceval.buildClass(mod, AST, "AST", []);
    
    //mod.literal_eval
    // Implementation wouldn't be hard, but it does require a lot of Skulpting
    
    mod.parse = function parse(source, filename) {
        if (filename === undefined) {
            filename = '<unknown>';
        }
        var parse = Sk.parse(filename, Sk.ffi.remapToJs(source));
        ast = Sk.astFromParse(parse.cst, filename, parse.flags);
        return Sk.misceval.callsim(mod.Module, ast);
        // Walk tree and create nodes (lazily?)
    }
    
    /*
    mod.Module = function ($gbl, $loc) {
        Sk.abstr.superConstructor(mod.OrderedDict, this, items);
    }*/
    
    function functionName(fun) {
        var ret = fun.toString();
        ret = ret.substr('function '.length);
        ret = ret.substr(0, ret.indexOf('('));
        return ret;
    }
    
    var INHERITANCE_MAP = {
        'mod': [Module, Interactive, Expression, Suite],
        'stmt': [FunctionDef, ClassDef, Return_,
                  Delete_, Assign, AugAssign,
                  For_, While_, If_, With_,
                  Raise, TryExcept, TryFinally, Assert,
                  Import_, ImportFrom, Exec, Global, Expr, 
                  Pass, Break_, Continue_, Debugger_],
        'expr': [BoolOp, BinOp, UnaryOp, Lambda, IfExp,
                 Dict, Set, ListComp, SetComp, DictComp,
                 GeneratorExp, Yield, Compare, Call, Repr,
                 Num, Str, Attribute, Subscript, Name, List, Tuple],
        'expr_context': [Load, Store, Del, AugLoad, AugStore, Param],
        'slice': [Ellipsis, Slice, ExtSlice, Index],
        'boolop': [And, Or],
        'operator': [Add, Sub, Mult, Div, Mod, Pow, LShift,
                     RShift, BitOr, BitXor, BitAnd, FloorDiv],
        'unaryop': [Invert, Not, UAdd, USub],
        'cmpop': [Eq, NotEq, Lt, LtE, Gt, GtE, Is, IsNot, In_, NotIn],
        'comprehension': [],
        'excepthandler': [ExceptHandler],
        'arguments_': [],
        'keyword': [],
        'alias': []
    };
    
    for (var base in INHERITANCE_MAP) {
        var baseClass = function($gbl, $loc) { return this;};
        mod[base] = Sk.misceval.buildClass(mod, baseClass, base, [mod.AST]);
        for (var i=0; i < INHERITANCE_MAP[base].length; i++) {
            var nodeType = INHERITANCE_MAP[base][i];
            var nodeName = functionName(nodeType);
            var nodeClass = function($gbl, $loc) { return this;};
            mod[nodeName] = Sk.misceval.buildClass(mod, nodeClass, nodeName, [mod[base]])
        }
    }
    
    return mod;
};