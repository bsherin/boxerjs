
import _ from 'lodash';

import {findNamedBoxesInScope,_createLocalizedFunctionCall, _getMatchingNode, current_turtle_id} from "./transpile.js";
export {doExecution}

var _name_index;
var _base_node;

let delay_amount = 1;


function changeNodePromise(uid, param_name, new_val) {
    return new Promise(function(resolve, reject) {
        window.changeNode(uid, param_name, new_val, (data)=>{
            resolve(data)
        })
    })
}

function delay(msecs) {
    return new Promise(resolve => setTimeout(resolve, msecs));
}

function addConverted(cdict) {
    let nstring = "";
    for (let nd in cdict) {
        nstring += "\n" + cdict[nd].converted
    }
    return nstring
}

async function doExecution(the_code_line, box_id, base_node) {
    window.context_functions = {};
    window.virtualNodeTrees = {};
    window.tell_function_counter = 0;
    let _fname = _createLocalizedFunctionCall(the_code_line, box_id, base_node, true);

    let _full_code = "";

    for (let cfunc in window.context_functions) {
        _full_code += `${window.context_functions[cfunc]};\n`
    }

    _full_code += `
    ${_fname}()
    `;
    try {
        let _result = await eval(_full_code);
        return _result;
    } catch (error) {
        window.addErrorDrawerEntry({title: error.message, content: `<pre>${error.stack}</pre>`})
    }
}



function findNamedNode(name, starting_id, my_context_name) {
    let start_node = _getMatchingNode(starting_id, window.virtualNodeTrees[my_context_name]);
    let [named_nodes, tid] = findNamedBoxesInScope(start_node, window.virtualNodeTrees[my_context_name]);
    for (let node of named_nodes) {
        if (node.name == name) {
            return node
        }
    }
    return null
}

async function change(boxname, newval, my_node_id, eval_in_place=null) {
    let is_local_var;
    let mnode;
    let estring;
    if (!eval_in_place) {
        eval_in_place = eval
    }
    let _my_context_name = await eval_in_place("_context_name");
    if (typeof(newval) == "object") {
        let dbstring = JSON.stringify(_newval);
        estring = boxname + " = " + dbstring;
        eval_in_place(estring);
        let _newval = _.cloneDeep(newval);
        if (_newval.kind == "databox") {
            window.updateIds(_newval.line_list);
            for (let lin of _newval.line_list) {
                lin.parent = mnode.unique_id
            }
        }
        let mnode = findNamedNode(boxname, my_node_id, _my_context_name);
        if (!mnode || mnode.virtual) {
            return new Promise(function (resolve, reject) {
                resolve()
            })
        } else {
            return new Promise(function (resolve, reject) {
                window.changeNode(mnode.unique_id, "line_list", _newval.line_list, async (data) => {
                    await delay(delay_amount);
                    resolve(data)
                })
            })
        }
    }
    else {
        if (!newval) {
            estring = boxname + " = null"
        }
        if (isNaN(newval)) {
            estring = boxname + " = '" + newval + "'"
        }
        else {
            estring = boxname + " = " + newval
        }
        eval_in_place(estring);
        let mnode = findNamedNode(boxname, my_node_id, _my_context_name);
        if (!mnode || mnode.virtual) {
            return new Promise(function(resolve, reject) {
                    resolve()
            })
        }
        else {
            let newtext = window.newTextNode(String(newval));
            let newline = window.newLineNode([newtext]);
            newline.parent = mnode.unique_id;
            return new Promise(function(resolve, reject) {
                window.changeNode(mnode.unique_id, "line_list", [newline], async (data)=>{
                    await delay(delay_amount);
                    resolve(data)
                })
            })
        }
    }
}

async function redisplay() {
    await delay(delay_amount)
}

async function forward(current_turtle_id, steps) {
    window.turtle_box_refs[current_turtle_id].current._moveForward(steps);
}

async function back(current_turtle_id, steps) {
    window.turtle_box_refs[current_turtle_id].current._moveForward(-1 * steps);
}

function clear(current_turtle_id) {
    window.turtle_box_refs[current_turtle_id].current._clear()
}

function clean(current_turtle_id) {
    window.turtle_box_refs[current_turtle_id].current._clean()
}


function reset(current_turtle_id) {
    window.turtle_box_refs[current_turtle_id].current._clear()
}

function setGraphicsMode(current_turtle_id, boxorstring) {
    window.turtle_box_refs[current_turtle_id].current._setGraphicsMode(boxorstring)
}

function showTurtle(current_turtle_id) {
    window.turtle_box_refs[current_turtle_id].current._showTurtle()
}

function hideTurtle(current_turtle_id) {
    window.turtle_box_refs[current_turtle_id].current._hideTurtle()
}

function penup(current_turtle_id) {
    window.turtle_box_refs[current_turtle_id].current._penup();
}

function pendown(current_turtle_id) {
    window.turtle_box_refs[current_turtle_id].current._pendown();
}

function setPenWidth(current_turtle_id, w) {
    window.turtle_box_refs[current_turtle_id].current._setPenWidth(w);
}

function stampRectangle(current_turtle_id, w, h) {
    window.turtle_box_refs[current_turtle_id].current._stampRectangle(w, h);
}

function stampHollowRectangle(current_turtle_id, w, h) {
    window.turtle_box_refs[current_turtle_id].current._stampRectangle(w, h, true);
}

function dot(current_turtle_id, ) {
    window.turtle_box_refs[current_turtle_id].current._dot();
}

function stampEllipse(current_turtle_id, w, h) {
    window.turtle_box_refs[current_turtle_id].current._stampEllipse(w, h);
}

function stampHollowEllipse(current_turtle_id, w, h) {
    window.turtle_box_refs[current_turtle_id].current._stampEllipse(w, h, true);
}

function stampCircle(current_turtle_id, r) {
    window.turtle_box_refs[current_turtle_id].current._stampEllipse(r * 2, r * 2);
}

function stampHollowCircle(current_turtle_id, r) {
    window.turtle_box_refs[current_turtle_id].current._stampEllipse(r * 2, r * 2, true);
}

function type(current_turtle_id, boxortext) {
    window.turtle_box_refs[current_turtle_id].current._type(boxortext);
}

function setTypeFont(current_turtle_id, boxortext) {
    window.turtle_box_refs[current_turtle_id].current._setTypeFont(boxortext);
}

function right(current_turtle_id, degrees) {
    // current_turtle_ref.current.right(degrees)
    window.turtle_box_refs[current_turtle_id].current._right(degrees)
}

function left(current_turtle_id, degrees) {
    window.turtle_box_refs[current_turtle_id].current._left(degrees)
}

function setxy(current_turtle_id, x, y) {
    window.turtle_box_refs[current_turtle_id].current._moveTo(x, y)
}

function setheading(current_turtle_id, degrees) {
    window.turtle_box_refs[current_turtle_id].current._setHeading(degrees)
}

function setPenColor(current_turtle_id, the_text) {
    window.turtle_box_refs[current_turtle_id].current._setPenColor(the_text)
}

function setBackgroundColor(current_turtle_id, the_text) {
    window.turtle_box_refs[current_turtle_id].current._setBackgroundColor(the_text)
}

function setSpriteSize(current_turtle_id, the_size) {
    window.turtle_box_refs[current_turtle_id].current._setSpriteSize(the_size)
}


function setfont(font) {

    window.turtle_box_refs[current_turtle_id].current.setfont(font)
}


