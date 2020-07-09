
import _ from 'lodash';
import React from "react";
import {findNamedBoxesInScope,_createLocalizedFunctionCall, getPortTarget,
    dataBoxToStub, _convertFunctionNode, findNamedNode} from "./transpile.js";
import {degreesToRadians, radiansToDegrees} from "../utility/utilities.js"
import {setNodeDict, setGlobal, createEntry, addToBuffer, clearBuffer} from "../redux/actions/action_creators.js";
import {newErrorNode, changeBase, makeGraphicsNode, setTargetBase, changeGraphicsBase} from "../redux/actions/vnd_mutators.js";
import {collectGarbage, dispatchBufferedActions} from "../redux/actions/composite_actions.js";
import {guid, dataBoxToNumber, dataBoxToString} from "../utility/utilities.js";
import {Triangle} from "../pixi_shapes";
import {newColorBox} from "../redux/actions/node_creator_actions.js";
import {graphics_kinds} from "../shared_consts.js";
import {newValueBox} from "../redux/actions/node_creator_actions";

export {doExecution, _mouseClickOnSprite, _mouseClickOnGraphics}

// new comment

var _name_index;
var _base_node;

let delay_amount = 1;
window.TICK_INTERVAL = 40;
window.user_aborted = false;

window.getNodeDict = () => {return window.store.getState().node_dict};
window.getVirtualNodeDict = () => {return window.vstore.getState().node_dict};
var vndict = ()=>{return window.vstore.getState().node_dict};

function delay(msecs) {
    return new Promise(resolve => setTimeout(resolve, msecs));
}

async function doExecution(the_code_line_id) {
    // comment
    let the_code_line = window.getNodeDict()[the_code_line_id];
    let box_id = the_code_line.parent;
    window.vstore.dispatch(setNodeDict(_.cloneDeep(window.getNodeDict())));
    window.vstore.dispatch(clearBuffer())
    startTicker();
    if (window.TICK_INTERVAL >= 0) {
        window.update_on_ticks = true;
    }
    window.store.dispatch(setGlobal("executing", true));
    // window.tell_function_counter = 0;
    let _inserted_start_node_id = _createLocalizedFunctionCall(the_code_line, box_id);
    let _result;
    try {
        window._running += 1;
        window.user_aborted = false;
        _result = await getBoxValue(vstore.getState().node_dict[_inserted_start_node_id].name, box_id)()
        window._running -= 1;
        if (window._running == 0) {
            window.store.dispatch(setGlobal("executing", false)); // To force a refresh at the en
            window.vstore.dispatch(dispatchBufferedActions());// d
        }
    } catch (error) {
        window._running = 0;
        window.store.dispatch(setGlobal("executing", false))  // This is to force a refresh
        let name = error.hasOwnProperty("name") ? error.name : "Execution Error";
        let message = error.hasOwnProperty("message") ? error.message : String(error)
        _result = window.vstore.dispatch(newErrorNode(name, message, error.original_node_id));
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
    if (_node.kind != "doitbox") {
        return dataBoxToStub(_node)
    }
    if (!_node.hasOwnProperty("cfunc") || _node.cfunc == null) {
        if (!_node.hasOwnProperty("raw_func") || _node.raw_func == null) {
            _convertFunctionNode(_node)
        }

        eval("_node.cfunc = " + window.vstore.getState().node_dict[_node_id].raw_func)
    }
    return _node.cfunc
}

function getBoxTargetFromName(boxName, startId) {
    let _node = findNamedNode(boxName, startId);
    if (!_node) {
        return null
    }
    return _node.unique_id
}

function stubToNumber(stub) {
    if (stub.hasOwnProperty("value")) {
        return stub.value
    }
    let nd = vndict();
    return dataBoxToNumber(nd[stub.vid])
}


function stubToString(stub) {
    if (stub.hasOwnProperty("value")) {
        return stub
    }
    let nd = vndict();
    return dataBoxToString(nd[stub.vid])
}

function createStub(value) {

    return {value: value}
}

async function changeGraphicsByName(targetName, newvalstub, my_node_id, eval_in_place=null) {
    let targetid = findNamedNode(targetName, my_node_id).unique_id;
    await changeGraphics({vid: targetid}, newvalstub, my_node_id, eval_in_place)
}


async function changeGraphics(targetstub, newvalstub, my_node_id, eval_in_place=null) {
    let targetid = targetstub.vid;
    let newval = window.vstore.getState().node_dict[newvalstub.vid];
    changeGraphicsBase(targetid, newval)
}


async function change(targetstub, newval, my_node_id) {

    return new Promise(async (resolve, reject) => {
        window.vstore.dispatch(changeBase(targetstub.vid, newval, my_node_id)).then(()=>{
            resolve()
        })
    })
}

async function changeByName(targetName, newval, my_node_id) {
    let targetid = findNamedNode(targetName, my_node_id).unique_id;
    return new Promise(async (resolve, reject) => {
        window.vstore.dispatch(changeBase(targetid, newval, my_node_id)).then(()=>{
            resolve()
        })
    })
}

function targetPort(portName, new_target_stub, my_node_id) {
    let port_id = findNamedNode(portName, my_node_id).unique_id;
    window.vstore.dispatch(setTargetBase(port_id, new_target_stub.vid))
}

async function makeColorBase(r, g, b) {
    let color_string = `${r} ${g} ${b}`;
    let new_id = guid();
    window.vstore.dispatch(newColorBox(color_string, new_id));
    window.vstore.dispatch(addToBuffer(createEntry(new_id)))
    return {vid: new_id}
}

async function makeColor(rstub, gstub, bstub) {
    let r = stubToNumber(rstub);
    let g = stubToNumber(gstub);
    let b = stubToNumber(bstub);
    return makeColorBase(r, g, b);
}

async function snap(vstub) {
    let gbox = window.vstore.getState().node_dict[vstub.vid]
    if (!graphics_kinds.includes(gbox.kind)) return;
    let newgnode = makeGraphicsNode("", gbox.kind, gbox["graphics_fixed_width"],
        gbox["graphics_fixed_height"],
        gbox["drawn_components"]);
    window.vstore.dispatch(createEntry(newgnode));
    return {vid: newgnode.unique_id}
}

async function setPrintingPrecision(new_precision_stub) {
    let new_precision = stubToNumber(new_precision_stub)
    window.store.dispatch(setGlobal("printing_precision", new_precision))
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
    window.vstore.dispatch(dispatchBufferedActions())
    window.tick_received += 1;
}

async function sin(angle_stub) {
    let angle = stubToNumber(angle_stub);
    return createStub(Math.sin(degreesToRadians(angle)))
}

async function asin(ystub, xstub) {
    let y = stubToNumber(ystub);
    let x = stubToNumber(xstub);
    return createStub(radiansToDegrees(Math.asin(y, x)))
}

async function cos(angle_stub) {
    let angle = stubToNumber(angle_stub);
    return createStub(Math.cos(degreesToRadians(angle)))
}

async function acos(ystub, xstub) {
    let y = stubToNumber(ystub);
    let x = stubToNumber(xstub);
    return createStub(radiansToDegrees(Math.acos(y, x)))
}

async function tan(angle_stub) {
    let angle = stubToNumber(angle_stub);
    return createStub(Math.tan(degreesToRadians(angle)))
}

async function atan(ystub, xstub) {
    let y = stubToNumber(ystub);
    let x = stubToNumber(xstub);
    return createStub(radiansToDegrees(Math.atan2(y, x)))
}

async function sqrt(xstub) {
    let x = stubToNumber(xstub);
    return createStub(Math.sqrt(x))
}

async function redisplay() {
    await delay(delay_amount)
}

function getSprite(current_turtle_id) {
    return window.getVirtualNodeDict()[current_turtle_id]
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

async function forward(current_turtle_id, steps_stub, eval_in_place=null) {
    let steps = stubToNumber(steps_stub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.moveForward(steps);
    }
}

async function back(current_turtle_id, steps_stub, eval_in_place=null) {
    let steps = stubToNumber(steps_stub);
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

async function setGraphicsMode(current_turtle_id, mstub) {
    let the_sprite = await getSprite(current_turtle_id);
    let mode = stubToString(mstub);
    if (the_sprite) {
        the_sprite.setGraphicsMode(mode)
    }
}

async function showTurtle(my_node_id) {
    return changeByName("shown", true, my_node_id);
}


function hideTurtle(my_node_id) {
    return changeByName("shown", false, my_node_id);
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

async function setPenWidth(current_turtle_id, wstub, eval_in_place=null) {
    let w = stubToNumber(wstub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.setPenWidth(w);
    }
}

async function stampRectangle(current_turtle_id, wstub, hstub) {
    let w = stubToNumber(wstub);
    let h = stubToNumber(hstub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.stampRectangle(w, h);
    }
}

async function stampHollowRectangle(current_turtle_id, wstub, hstub) {
    let w = stubToNumber(wstub);
    let h = stubToNumber(hstub);
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

async function stampEllipse(current_turtle_id, wstub, hstub) {
    let w = stubToNumber(wstub);
    let h = stubToNumber(hstub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.stampEllipse(w, h);
    }
}

async function stampHollowEllipse(current_turtle_id, wstub, hstub) {
    let w = stubToNumber(wstub);
    let h = stubToNumber(hstub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.stampEllipse(w, h, true);
    }
}

async function stampCircle(current_turtle_id, rstub) {
    let r = stubToNumber(rstub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.stampEllipse(r * 2, r * 2);
    }
}

async function stampHollowCircle(current_turtle_id, rstub) {
    let r = stubToNumber(rstub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.stampEllipse(r * 2, r * 2, true);
    }
}

async function type(current_turtle_id, typestub) {
    let the_type = stubToString(typestub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.type(the_type);
    }
}

async function setPosition(current_turtle_id, aboxstub) {
    let the_text = stubToString(aboxstub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.setPosition(the_text);
    }
}

async function setTypeFont(current_turtle_id, textstub, eval_in_place=null) {
    let the_text = stubToString(textstub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.setTypeFont(the_text,);
    }
}

async function right(current_turtle_id, degrees_stub, eval_in_place=null) {
    let degrees = stubToNumber(degrees_stub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.right(degrees)
    }
}

async function left(current_turtle_id, degrees_stub, eval_in_place=null) {
    let degrees = stubToNumber(degrees_stub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.left(degrees)
    }
}

async function setxy(current_turtle_id, xstub, ystub, eval_in_place=null) {
    let y = stubToNumber(ystub);
    let x = stubToNumber(xstub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.moveTo(x, y, null)
    }
}

async function setheading(degrees_stub, my_node_id) {
    let degrees = stubToNumber(degrees_stub);
    return changeByName("heading", degrees, my_node_id);
}

async function setPenColor(current_turtle_id, text_stub, eval_in_place=null) {
    let the_text = stubToString(text_stub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.setPenColor(the_text)
    }
}

async function setBackgroundColor(current_turtle_id, text_stub) {
    let the_text = stubToString(text_stub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.setBackgroundColor(the_text)
    }
}

async function setSpriteSize(current_turtle_id, the_size_stub, eval_in_place=null) {
    let the_size = stubToNumber(the_size_stub);
    let the_sprite = await getSprite(current_turtle_id)
    if (the_sprite) {
        the_sprite.setSpriteSize(the_size)
    }
}

function _mult(first, second) {
    return createStub(stubToNumber(first) * stubToNumber(second))
}

function _div(first, second) {
    return createStub(stubToNumber(first) / stubToNumber(second))
}

function _add(first, second) {
    return createStub(stubToNumber(first) + stubToNumber(second))
}

function _subtract(first, second) {
    return createStub(stubToNumber(first) - stubToNumber(second))
}

function _lt(first, second) {
    return createStub(stubToNumber(first) < stubToNumber(second))
}

function _gt(first, second) {
    return createStub(stubToNumber(first) > stubToNumber(second))
}

function _ltet(first, second) {
    return createStub(stubToNumber(first) <= stubToNumber(second))
}

function _gtet(first, second) {
    return createStub(stubToNumber(first) >= stubToNumber(second))
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
