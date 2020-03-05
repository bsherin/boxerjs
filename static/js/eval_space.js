
import _ from 'lodash';

import {_convertNamedDoit, findNamedBoxesInScope, dataBoxToString, insertVirtualNode, _getMatchingNode, current_turtle_id} from "./transpile.js";
export {doExecution}

var _name_index;
var _base_node;

let delay_amount = 30;


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
    let local_the_code_line = _.cloneDeep(the_code_line);
    let _tempDoitNode = window.newDoitNode([local_the_code_line]);
    _tempDoitNode.name = "_tempFunc";
    let _virtualNodeTree = _.cloneDeep(base_node);
    let _start_node = _getMatchingNode(box_id, _virtualNodeTree);
    let _inserted_start_node = insertVirtualNode(_tempDoitNode, _start_node, _virtualNodeTree);
    let _tempFuncString = _convertNamedDoit(_inserted_start_node, _virtualNodeTree);

    let _named_nodes = findNamedBoxesInScope(_start_node, _virtualNodeTree);
    let global_declarations_string = "";
    for (let _node of _named_nodes) {
        if (_node.kind == "databox") {
            global_declarations_string += "\n" + dataBoxToString(_node)
        }
        if (_node.kind == "jsbox") {
            global_declarations_string += "\n" + jsBoxToString(_node)
        }
    }

    let _full_code = `
        ${global_declarations_string}
        ${_tempFuncString}
        _tempFunc()
    `;
    window.virtualNodeTree = _virtualNodeTree;
    try {
        let _result = await eval(_full_code);
        return _result;
    } catch (error) {
        window.addErrorDrawerEntry({title: error.message, content: `<pre>${error.stack}</pre>`})
    }
}



function findNamedNode(name, starting_id) {
    let start_node = _getMatchingNode(starting_id, window.virtualNodeTree);
    let named_nodes = findNamedBoxesInScope(start_node, window.virtualNodeTree);
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
        let mnode = findNamedNode(boxname, my_node_id);
        if (!mnode || mnode.virtual) {
            return new Promise(function (resolve, reject) {
                resolve()
            })
        } else {
            return new Promise(function (resolve, reject) {
                window.changeNode(mnode.unique_id, "line_list", _newval.line_list, async (data) => {
                    await delay(300);
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
        let mnode = findNamedNode(boxname, my_node_id);
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
    await delay(300)
}

async function forward(steps) {
    for (let i=0; i<steps; ++i) {
        // window.current_turtle_ref.current.forward(1);
        window.turtle_box_refs[current_turtle_id].current.forward(1);
        //await delay(1)
    }
}

function clear() {
    window.turtle_box_refs[current_turtle_id].current.clear()
}

function reset() {
    window.turtle_box_refs[current_turtle_id].current.reset()
}

function wrap() {
    window.turtle_box_refs[current_turtle_id].current.wrap()
}

function showTurtle() {
    window.turtle_box_refs[current_turtle_id].current.showTurtle()
}

function hideTurtle() {
    window.turtle_box_refs[current_turtle_id].current.hideTurtle()
}

function redrawOnMove(bool) {
    window.turtle_box_refs[current_turtle_id].current.redrawOnMove(bool)
}

function penup() {
    window.turtle_box_refs[current_turtle_id].current.penup();
}

function pendown() {
    window.turtle_box_refs[current_turtle_id].current.pendown();
}

function right(degrees) {
    // current_turtle_ref.current.right(degrees)
    window.turtle_box_refs[current_turtle_id].current.right(degrees)
}

function left(degrees) {
    window.turtle_box_refs[current_turtle_id].current.left(degrees)
}

function setxy(x, y) {
    window.turtle_box_refs[current_turtle_id].current.setxy(x, y)
}

function setheading(degrees) {
    window.turtle_box_refs[current_turtle_id].current.setheading(degrees)
}

function setlinewidth(w) {
    window.turtle_box_refs[current_turtle_id].current.width(w)
}

function write(text) {
    window.turtle_box_refs[current_turtle_id].current.write(text)
}

function setcolor(r, g, b, a) {
    window.turtle_box_refs[current_turtle_id].current.setcolor(r, g, b, a)
}

function random(low, hi){
    window.turtle_box_refs[current_turtle_id].current.random(low, hight)
}

function animate(action, ms) {
    window.turtle_box_refs[current_turtle_id].current.animate(action, ms)
}

function setfont(font) {
    window.turtle_box_refs[current_turtle_id].current.setfont(font)
}

function jsBoxToString(jsbox) {
    return `
    async function ${jsbox.name} {${jsbox.the_code}}
    `
}

