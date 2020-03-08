
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
    async function _outerFunc() {
        ${global_declarations_string}
        ${_tempFuncString}
        return await _tempFunc()
    }
    _outerFunc()
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
    window.turtle_box_refs[current_turtle_id].current._moveForward(steps);
}

async function back(steps) {
    window.turtle_box_refs[current_turtle_id].current._moveForward(-1 * steps);
}

function clear() {
    window.turtle_box_refs[current_turtle_id].current._clear()
}

function clean() {
    window.turtle_box_refs[current_turtle_id].current._clean()
}


function reset() {
    window.turtle_box_refs[current_turtle_id].current._clear()
}

function setGraphicsMode(boxorstring) {
    window.turtle_box_refs[current_turtle_id].current._setGraphicsMode(boxorstring)
}

function showTurtle() {
    window.turtle_box_refs[current_turtle_id].current._showTurtle()
}

function hideTurtle() {
    window.turtle_box_refs[current_turtle_id].current._hideTurtle()
}

function redrawOnMove(bool) {
    window.turtle_box_refs[current_turtle_id].current.redrawOnMove(bool)
}

function penup() {
    window.turtle_box_refs[current_turtle_id].current._penup();
}

function pendown() {
    window.turtle_box_refs[current_turtle_id].current._pendown();
}

function setPenWidth(w) {
    window.turtle_box_refs[current_turtle_id].current._setPenWidth(w);
}

function stampRectangle(w, h) {
    window.turtle_box_refs[current_turtle_id].current._stampRectangle(w, h);
}

function stampHollowRectangle(w, h) {
    window.turtle_box_refs[current_turtle_id].current._stampRectangle(w, h, true);
}

function dot() {
    window.turtle_box_refs[current_turtle_id].current._dot();
}

function stampEllipse(w, h) {
    window.turtle_box_refs[current_turtle_id].current._stampEllipse(w, h);
}

function stampHollowEllipse(w, h) {
    window.turtle_box_refs[current_turtle_id].current._stampEllipse(w, h, true);
}

function stampCircle(r) {
    window.turtle_box_refs[current_turtle_id].current._stampEllipse(r * 2, r * 2);
}

function stampHollowCircle(r) {
    window.turtle_box_refs[current_turtle_id].current._stampEllipse(r * 2, r * 2, true);
}

function type(boxortext) {
    window.turtle_box_refs[current_turtle_id].current._type(boxortext);
}

function setTypeFont(boxortext) {
    window.turtle_box_refs[current_turtle_id].current._setTypeFont(boxortext);
}

function right(degrees) {
    // current_turtle_ref.current.right(degrees)
    window.turtle_box_refs[current_turtle_id].current._right(degrees)
}

function left(degrees) {
    window.turtle_box_refs[current_turtle_id].current._left(degrees)
}

function setxy(x, y) {
    window.turtle_box_refs[current_turtle_id].current._moveTo(x, y)
}

function setheading(degrees) {
    window.turtle_box_refs[current_turtle_id].current._setHeading(degrees)
}


function setPenColor(the_text) {
    window.turtle_box_refs[current_turtle_id].current._setPenColor(the_text)
}

function setSpriteSize(the_size) {
    window.turtle_box_refs[current_turtle_id].current._setSpriteSize(the_size)
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

