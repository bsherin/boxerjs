
import _ from 'lodash';
import React from "react";
import {findNamedBoxesInScope,_createLocalizedFunctionCall, _getMatchingNode, getPortTarget, makeChildrenNonVirtual,
    dataBoxToValue, boxObjectToValue, _convertFunctionNode, findNamedNode} from "./transpile.js";
import {shape_classes} from "./pixi_shapes.js";
import {data_kinds, container_kinds} from "./shared_consts.js";
import {isKind, degreesToRadians, radiansToDegrees} from "./utilities.js"

export {doExecution, repairCopiedDrawnComponents, _mouseClickOnSprite, _mouseClickOnGraphics}

var _name_index;
var _base_node;

let delay_amount = 1;


function changeNodePromise(uid, param_name, new_val) {
    return new Promise(function(resolve, reject) {
        window.changeNode(uid, param_name, new_val, (data)=>{set
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

async function _mouseClickOnSprite(sprite_box_id, base_node) {
    let snode = _getMatchingNode(sprite_box_id, base_node);
    let [named_nodes, tid] = findNamedBoxesInScope(snode, base_node);
    let found = false;
    for (let node of named_nodes) {
        if (node.name == "mouseClickOnSprite") {
            found = true;
            break
        }
    }
    if (!found) return;
    let the_node = window.newTextNode("mouseClickOnSprite");
    let the_code_line = window.newLineNode([the_node]);
    await doExecution(the_code_line, sprite_box_id, base_node)
}

async function _mouseClickOnGraphics(graphics_box_id, base_node) {
    let gnode = _getMatchingNode(graphics_box_id, base_node);
    let [named_nodes, tid] = findNamedBoxesInScope(gnode, base_node);
    let found = false;
    for (let node of named_nodes) {
        if (node.name == "mouseClickOnGraphics") {
            found = true;
            break
        }
    }
    if (!found) return;
    let the_node = window.newTextNode("mouseClickOnGraphics");
    let the_code_line = window.newLineNode([the_node]);
    await doExecution(the_code_line, graphics_box_id, base_node)
}

async function doExecution(the_code_line, box_id, base_node) {
    // window.context_functions = {};
    window.virtualNodeTree = _.cloneDeep(base_node);
    // window.tell_function_counter = 0;
    let _inserted_start_node = _createLocalizedFunctionCall(the_code_line, box_id);

    try {
        let _result = getBoxValue(_inserted_start_node.name, box_id)()
        // eval("_inserted_start_node.cfunc = " + _inserted_start_node.raw_func)
        // let _result = await _inserted_start_node.cfunc();
        return _result;
    } catch (error) {
        window.addErrorDrawerEntry({title: error.message, content: `<pre>${error.stack}</pre>`})
    }
}

function getBoxValue(boxName, startId) {
    let _node = findNamedNode(boxName, startId);
    if (_node.kind == "port") {
        _node = getPortTarget(_node, window.virtualNodeTree);
        if (!_node) {
            return null;
        }
    }
    if (_node.kind == "databox") {
        return dataBoxToValue(_node)
    // } else if (_node.kind == "jsbox") {
    //     global_declarations_string += "\n" + jsBoxToString(_node, alt_name)
    } else if (_node.kind != "doitbox") {
        return boxObjectToValue(_node)
    }
    if (!_node.hasOwnProperty("cfunc") || _node.cfunc == null) {
        if (!_node.hasOwnProperty("raw_func") || _node.raw_func == null) {
            _convertFunctionNode(_node)
        }
        eval("_node.cfunc = " + _node.raw_func)
    }
    return _node.cfunc
}


function repairCopiedDrawnComponents(node, recursive=true) {
    if (node && typeof(node) == "object" && node.hasOwnProperty("kind")){
        if (container_kinds.includes(node.kind)) {
            repairTrueNode(node)
         }
        if (node.kind == "line") {
            for (let nd of node.node_list) {
                repairTrueNode(nd)
            }
        }
    }
    else if (Array.isArray(node)) {
        for (let item of node) {
            repairCopiedDrawnComponents(item, recursive)
        }
    }
    function repairTrueNode(anode) {
            if (anode.kind == "graphics") {
                let new_drawn_components  = [];
                for (let comp of anode.drawn_components)  {
                    let Dcomp = shape_classes[comp.type];
                    let new_comp = <Dcomp {...comp.props}/>;
                    new_drawn_components.push(new_comp)
                }
                anode.drawn_components = new_drawn_components
            }
            if (recursive && container_kinds.includes(anode.kind)) {
                for (let lin of anode.line_list) {
                    for (let nd of lin.node_list) {
                        repairCopiedDrawnComponents(nd, true)
                    }
                }
                if (anode.closetLine) {
                    for (let nd of anode.closetLine.node_list) {
                        repairCopiedDrawnComponents(nd, true)
                    }
                }
            }
    }

}

async function changeGraphics(boxname, newval, my_node_id, eval_in_place=null) {
    if (!isKind(newval, "graphics")) return;
    let estring;
    if (!eval_in_place) {
        eval_in_place = eval
    }
    let _my_context_name = await eval_in_place("_context_name");
    let mnode = findNamedNode(boxname, my_node_id, _my_context_name);
    if (mnode.kind == "port") {
        mnode = _getMatchingNode(mnode.target, window.getBaseNode())
    }
    if (!mnode || mnode.virtual || !isKind(mnode, "graphics")) {
        return new Promise(function (resolve, reject) {
            resolve()
        })
    }
    return new Promise(function (resolve, reject) {
        let new_drawn_components  = [];
        for (let comp of newval.drawn_components)  {
            let Dcomp = shape_classes[comp.type];
            let new_comp = <Dcomp {...comp.props}/>;
            new_drawn_components.push(new_comp)
        }
        window.changeNode(mnode.unique_id, "drawn_components", new_drawn_components, async (data) => {
            await delay(delay_amount);
            resolve(data)
        })
    })
}

async function sin(angle) {
    return Math.sin(degreesToRadians(angle))
}

async function asin(y, x) {
    return radiansToDegrees(Math.asin(y, x))
}

async function cos(angle) {
    return Math.cos(degreesToRadians(angle))
}

async function acos(y, x) {
    return radiansToDegrees(Math.acos(y, x))
}

async function tan(angle) {
    return Math.tan(degreesToRadians(angle))
}

async function atan(y, x) {
    return radiansToDegrees(Math.atan2(y, x))
}

async function change(boxname, newval, my_node_id) {
    let mnode = findNamedNode(boxname, my_node_id);
    if (mnode.kind == "port") {
        mnode = _getMatchingNode(mnode.target, window.virtualNodeTree)
    }
    if (!mnode) {
        return new Promise(function(resolve, reject) {
                resolve()
        })
    }
    if (typeof(newval) == "object") {
        if (!data_kinds.includes(mnode.kind) || !data_kinds.includes(newval.kind)) {
            return new Promise(function (resolve, reject) {
                resolve()
            })
        }

        let _newval = _.cloneDeep(newval);
        window.updateIds(_newval.line_list);
        for (let lin of _newval.line_list) {
            lin.parent = mnode.unique_id
        }
        mnode.line_list = _newval.line_list

        if (!mnode.virtual) {
            makeChildrenNonVirtual(_newval)
            return new Promise(function (resolve, reject) {
                window.changeNode(mnode.unique_id, "line_list", _newval.line_list, async (data) => {
                    await delay(delay_amount);
                    resolve(data)
                })
            })
        }

    }
    else {
        let newtext = window.newTextNode(String(newval));
        let newline = window.newLineNode([newtext]);
        newline.parent = mnode.unique_id;
        mnode.line_list = [newline];
        if (!mnode.virtual) {
            makeChildrenNonVirtual(mnode)
            return new Promise(function (resolve, reject) {
                window.changeNode(mnode.unique_id, "line_list",
                    [newline], async (data) => {
                        await delay(delay_amount);
                        resolve(data)
                    })
            })
        }
    }
}

async function makeColor(r, g, b) {
    let color_string = `${r} ${g} ${b}`;
    return window.newColorBox(color_string)
}

async function snap(gbox) {
    let newbox = window.newGraphicsBox();
    if (gbox.kind != "graphics") return;
    newbox.drawn_components = gbox.drawn_components;
    newbox.graphics_fixed_height = gbox.graphics_fixed_height;
    newbox.graphics_fixed_width = gbox.graphics_fixed_width;
    repairCopiedDrawnComponents(newbox, false);
    return newbox
}

async function turtleShape() {
    return window.newTurtleShape()
}

async function redisplay() {
    await delay(delay_amount)
}

async function getMousePosition(current_turtle_id) {
    let mpos = window.turtle_box_refs[current_turtle_id].current._getMousePosition();
    let mpos_string = `${Math.round(mpos.x)} ${Math.round(mpos.y)}`;
    return window.newValueBox(null, mpos_string)
}

async function forward(current_turtle_id, steps, eval_in_place=null) {
    window.turtle_box_refs[current_turtle_id].current._moveForward(steps);
}

async function back(current_turtle_id, steps, eval_in_place=null) {
    window.turtle_box_refs[current_turtle_id].current._moveForward(-1 * steps);
}

function clear(current_turtle_id, eval_in_place=null) {
    window.turtle_box_refs[current_turtle_id].current._clear()
}

function clean(current_turtle_id, eval_in_place=null) {
    window.turtle_box_refs[current_turtle_id].current._clean()
}


function reset(current_turtle_id, eval_in_place=null) {
    window.turtle_box_refs[current_turtle_id].current._clear(async (param_dict)=>{
        return await update_sprite_params(param_dict, eval_in_place);
    })
}

function setGraphicsMode(current_turtle_id, boxorstring) {
    window.turtle_box_refs[current_turtle_id].current._setGraphicsMode(boxorstring,)
}

async function showTurtle(my_node_id) {
    return change("shown", true, my_node_id);
}


function hideTurtle(my_node_id) {
    return change("shown", false, my_node_id);
}

function penup(current_turtle_id, eval_in_place=null) {
    window.turtle_box_refs[current_turtle_id].current._penup();
}

function pendown(current_turtle_id, eval_in_place=null) {
    window.turtle_box_refs[current_turtle_id].current._pendown();
}

function setPenWidth(current_turtle_id, w, eval_in_place=null) {
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

function setPosition(current_turtle_id, abox) {
    window.turtle_box_refs[current_turtle_id].current._setPosition(abox);
}

function setTypeFont(current_turtle_id, boxortext, eval_in_place=null) {
    window.turtle_box_refs[current_turtle_id].current._setTypeFont(boxortext,);
}

async function right(current_turtle_id, degrees, eval_in_place=null) {
    window.turtle_box_refs[current_turtle_id].current._right(degrees)
}

function left(current_turtle_id, degrees, eval_in_place=null) {
    window.turtle_box_refs[current_turtle_id].current._left(degrees)
}

function setxy(current_turtle_id, x, y, eval_in_place=null) {
    window.turtle_box_refs[current_turtle_id].current._moveTo(x, y, null, async (newX, newY)=>{
        if (eval_in_place) {
            let estring = `xPosition =${newX};\nyPosition=${newY}`;
            eval_in_place(estring);
        }
    })
}

async function update_sprite_params(param_dict, eval_in_place=null) {
    if (eval_in_place) {
        let estring = "";
        for (let param in param_dict) {
            let val = param_dict[param];
            if (typeof(val) != "object" && isNaN(val)) {
                estring += `${param} = "${param_dict[param]}"`
            }
            else {
                estring += `${param} = ${param_dict[param]}`
            }
        }
        eval_in_place(estring);
    }

    return new Promise(async function (resolve, reject) {
        await delay(delay_amount);
        resolve();
    });
}

async function setheading(degrees, my_node_id) {
    return await change("heading", degrees, my_node_id);
    // return new Promise(function (resolve, reject) {
    //             window.turtle_box_refs[current_turtle_id].current._setHeading(degrees, async (data) => {
    //                 await delay(delay_amount);
    //                 resolve()
    //             })
    //         })
}

function setPenColor(current_turtle_id, the_text, eval_in_place=null) {
    window.turtle_box_refs[current_turtle_id].current._setPenColor(the_text)
}

function setBackgroundColor(current_turtle_id, the_text) {
    window.turtle_box_refs[current_turtle_id].current._setBackgroundColor(the_text)
}

function setSpriteSize(current_turtle_id, the_size, eval_in_place=null) {
    window.turtle_box_refs[current_turtle_id].current._setSpriteSize(the_size)
}


