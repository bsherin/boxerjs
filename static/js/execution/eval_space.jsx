
import _ from 'lodash';
import React from "react";
import {findNamedBoxesInScope,_createLocalizedFunctionCall, getPortTarget,
    dataBoxToValue, boxObjectToValue, _convertFunctionNode, findNamedNode} from "./transpile.js";
import {degreesToRadians, radiansToDegrees} from "../utility/utilities.js"
import {setNodeDict, setGlobal, createEntry} from "../redux/actions/core_actions.js";
import {newErrorNode, changeBase, makeGraphicsNode} from "../redux/actions/vnd_mutators.js";
import {collectGarbage} from "../redux/actions/composite_actions.js";
import {guid, isKind} from "../utility/utilities.js";
import {shape_classes, Triangle} from "../pixi_shapes";
import {newColorBox} from "../redux/actions/node_creator_actions.js";
import {graphics_kinds} from "../shared_consts.js";

export {doExecution, _mouseClickOnSprite, _mouseClickOnGraphics}


var _name_index;
var _base_node;

let delay_amount = 1;
window.TICK_INTERVAL = 40;
window.user_aborted = false;

window.getNodeDict = () => {return window.store.getState().node_dict};


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

async function doExecution(the_code_line_id) {
    // window.context_functions = {};
    let the_code_line = window.getNodeDict()[the_code_line_id];
    let box_id = the_code_line.parent;
    window.vstore.dispatch(setNodeDict(_.cloneDeep(window.getNodeDict())));
    startTicker();
    if (window.TICK_INTERVAL >= 0) {
        window.update_on_ticks = true;
    }
    window.store.dispatch(setGlobal("executing", true));
    // window.tell_function_counter = 0;
    let _inserted_start_node_id = _createLocalizedFunctionCall(the_code_line, box_id);
    let _result
    try {
        window._running += 1;
        window.user_aborted = false;
        _result = await getBoxValue(vstore.getState().node_dict[_inserted_start_node_id].name, box_id)()
        window._running -= 1;
        if (window._running == 0) {
            window.store.dispatch(setGlobal("executing", false)); // To force a refresh at the end
        }
    } catch (error) {
        window._running = 0;
        window.store.dispatch(setGlobal("executing", false))  // This is to force a refresh
        // window.addErrorDrawerEntry({title: error.message, content: `<pre>${error.stack}</pre>`})
        _result = window.vstore.dispatch(newErrorNode(error.name, error.message + "\n" + error.stack));
    } finally {
        window.clearInterval(window.ticker);
        window.store.dispatch(collectGarbage())
        window.user_aborted = false;
        window.update_on_ticks = false;
    }
    return _result
}

function getBoxValue(boxName, startId) {
    let _node = findNamedNode(boxName, startId);
    let _node_id = _node.unique_id;
    if (_node.kind == "port") {
        _node = getPortTarget(_node,window.vstore.getState().node_dict);
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

        eval("_node.cfunc = " + window.vstore.getState().node_dict[_node_id].raw_func)
    }
    return _node.cfunc
}

async function changeGraphics(boxname, newvalstub, my_node_id, eval_in_place=null) {
    let newval = window.vstore.getState().node_dict[newvalstud.vid]
    if (!isKind(newval, "graphics")) return;
    let estring;
    if (!eval_in_place) {
        eval_in_place = eval
    }
    let _my_context_name = await eval_in_place("_context_name");
    let mnode = findNamedNode(boxname, my_node_id);
    if (mnode.kind == "port") {
        mnode = window.getNodeDict()[mnode.target]
    }
    if (!mnode || mnode.virtual || !isKind(mnode, "graphics")) {
        return new Promise(function (resolve, reject) {
            resolve()
        })
    }
    let new_drawn_components  = [];
    for (let comp of newval.drawn_components)  {
        let Dcomp = shape_classes[comp.type];
        let new_comp = <Dcomp {...comp.props}/>;
        new_drawn_components.push(new_comp)
    }
    return await change (mnode.unique_id, "drawn_components", new_drawn_components);
}


async function change(boxname, newval, my_node_id) {

    return new Promise(async (resolve, reject) => {
        window.vstore.dispatch(changeBase(boxname, newval, my_node_id)).then(()=>{
            resolve()
        })
    })
}

async function makeColor(r, g, b) {
    let color_string = `${r} ${g} ${b}`;
    let new_id = guid();
    window.vstore.dispatch(newColorBox(color_string, new_id));

    return {vid: new_id}
}

async function snap(gbox) {
    if (!graphics_kinds.includes(gbox.kind)) return;
    let newgnode = makeGraphicsNode("", gbox.kind, gbox["graphics_fixed_width"], gbox["graphics_fixed_height"]);
    window.vstore.dispatch(createEntry(newgnode));
    // repairCopiedDrawnComponents(newbox, false);
    return {vid: newgnode.unique_id}
}

async function doRepeat(times, statement_list) {
    for (let _i = 0; _i < times; ++_i) {
        if (window.user_aborted) break;
        eval(`async function lfunc() {${statement_list}}; lfunc();`)
        await delay(1)
    }

}



async function turtleShape() {
    const tw = 11;
    const th = 15;
    const turtleColor = 0x008000;
    let tshape = <Triangle tw={tw} th={th} tcolor={turtleColor}/>;
    let newgnode = makeGraphicsNode("", "graphics", 50, 50, [tshape]);
    newgnode.name = "shape";
    window.vstore.dispatch(createEntry(newgnode))
    return {vid: newgnode.id}
}

function startTicker() {
    window.ticker = window.setInterval(generateTick, window.TICK_INTERVAL);
}

function setTickInterval(interval) {
    window.TICK_INTERVAL = interval
}

async function generateTick() {
    window.tick_received += 1;
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

async function sqrt(x) {
    return Math.sqrt(x)
}

async function redisplay() {
    await delay(delay_amount)
}

function getSprite(current_turtle_id) {
    return window.getNodeDict()[current_turtle_id]
}


async function getMousePosition(current_turtle_id) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        let mpos = the_sprite.getMousePosition();
        let mpos_string = `${Math.round(mpos.x)} ${Math.round(mpos.y)}`;
        let new_id = guid();
        window.vstore.dispatch(newValueBox(null, mpos_string, new_id))
    }
    return {vid: new_id}

}

async function forward(current_turtle_id, steps, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.moveForward(steps);
    }
}

async function back(current_turtle_id, steps, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.moveForward(-1 * steps);
    }
}

async function clear(current_turtle_id, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.clear()
    }
}

async function clean(current_turtle_id, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.clean()
    }
}


async function reset(current_turtle_id, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.clear()
    }
}

async function setGraphicsMode(current_turtle_id, boxorstring) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.setGraphicsMode(boxorstring,)
    }
}

async function showTurtle(my_node_id) {
    return change("shown", true, my_node_id);
}


function hideTurtle(my_node_id) {
    return change("shown", false, my_node_id);
}


async function penup(current_turtle_id, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.penup();
    }
}

async function pendown(current_turtle_id, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.pendown();
    }
}

async function setPenWidth(current_turtle_id, w, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.setPenWidth(w);
    }
}

async function stampRectangle(current_turtle_id, w, h) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.stampRectangle(w, h);
    }
}

async function stampHollowRectangle(current_turtle_id, w, h) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.stampRectangle(w, h, true);
    }
}

async function dot(current_turtle_id, ) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.dot();
    }
}

async function stampEllipse(current_turtle_id, w, h) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.stampEllipse(w, h);
    }
}

async function stampHollowEllipse(current_turtle_id, w, h) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.stampEllipse(w, h, true);
    }
}

async function stampCircle(current_turtle_id, r) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.stampEllipse(r * 2, r * 2);
    }
}

async function stampHollowCircle(current_turtle_id, r) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.stampEllipse(r * 2, r * 2, true);
    }
}

async function type(current_turtle_id, boxortext) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.type(boxortext);
    }
}

async function setPosition(current_turtle_id, abox) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.setPosition(abox);
    }
}

async function setTypeFont(current_turtle_id, boxortext, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.setTypeFont(boxortext,);
    }
}

async function right(current_turtle_id, degrees, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.right(degrees)
    }
}

async function left(current_turtle_id, degrees, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.left(degrees)
    }
}

async function setxy(current_turtle_id, x, y, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.moveTo(x, y, null)
    }
}


async function setheading(degrees, my_node_id) {
    return change("heading", degrees, my_node_id);
}

async function setPenColor(current_turtle_id, the_text, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.setPenColor(the_text)
    }
}

async function setBackgroundColor(current_turtle_id, the_text) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.setBackgroundColor(the_text)
    }
}

async function setSpriteSize(current_turtle_id, the_size, eval_in_place=null) {
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.setSpriteSize(the_size)
    }
}


