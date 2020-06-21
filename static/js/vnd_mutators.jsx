

import {
    graphicsNodeDict,
} from "./actions/node_creator_actions.js";
import {isKind, guid} from "./utilities.js";
import {findNamedNode} from "./transpile.js";
import {shape_classes, Triangle} from "./pixi_shapes.js";
import {batch} from "react-redux";
import {data_kinds, graphics_kinds} from "./shared_consts.js";
import {cloneLineSourceTarget} from "./actions/action_helpers.js";
import {cloneLineToStore, healLine, setLineList, createCloset} from "./actions/composite_actions.js";
import {changeNode} from "./actions/core_actions.js";
import {newTextNode, newLineNode, newDataBoxNode, newColorBox} from "./actions/node_creator_actions.js"
import {container_kinds} from "./shared_consts.js";

export {newErrorNode, createTextLine, changeGraphics, change, makeColor, snap, makeGraphicsNode,
    turtleShape, makeChildrenVirtual, makeChildrenNonVirtual, insertVirtualNode}

function newErrorNode(first_part, body, new_id) {
    return (dispatch, getState) => {
        let new_dbox_id = guid();
        batch(() => {
            let body_list = body.split("\n")
            let line_ids = [];
            let tline_id = guid();
            dispatch(createTextLine(first_part, tline_id));
            line_ids.push(tline_id)


            for (let btext of body_list) {
                let bline_id = guid();
                dispatch(createTextLine(btext, bline_id));
                line_ids.push(bline_id)
            }


            dispatch(newDataBoxNode(line_ids, false, new_dbox_id));
        })
        return {vid: new_dbox_id}
    }
}

function createTextLine(the_text, linid) {
    return (dispatch, getState) => {
        batch(()=>{
            let ttext_id = guid();
            dispatch(newTextNode(the_text, ttext_id));
            dispatch(newLineNode([ttext_id], linid));
            dispatch(changeNode(ttext_id, "parent", linid))
        })
    }

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

async function changeBase(boxname, newval, my_node_id) {
    return (dispatch, getState) => {
        batch(() => {
            let mnode = findNamedNode(boxname, my_node_id);
            if (mnode.kind == "port") {
                mnode = getState().node_dict[mnode.target]
            }
            if (!mnode) {
                return new Promise(function(resolve, reject) {
                    resolve()
                })
            }
            if (typeof(newval) == "object") {
                let the_node = window.vstore.getState().node_dict[newval.vid];
                if (!data_kinds.includes(mnode.kind) || !data_kinds.includes(the_node.kind)) {
                    return new Promise(function (resolve, reject) {
                        resolve()
                    })
                }

                let new_line_list = [];
                let target_dict = window.getNodeDict();
                for (let lin_id of the_node.line_list) {
                    let new_line_id = guid();
                    dispatch(cloneLineToStore(lin_id, getState().node_dict, new_line_id));
                    new_line_list.push(new_line_id)
                }

                mnode.line_list = new_line_list

                if (!mnode.virtual) {

                    let temp_dict = {};
                    for (let lin_id of new_line_list) {
                        temp_dict = cloneLineSourceTarget(lin_id, getState().node_dict, lin_id, temp_dict);
                        makeChildrenNonVirtual(new_line_id, temp_dict)
                    }
                    for (let lin_id of new_line_list) {
                        window.store.dispatch(cloneLineToStore(lin_id, temp_dict, lin_id));
                    }
                    return new Promise(function (resolve, reject) {
                        window.store.dispatch(setLineList(mnode.unique_id, new_line_list));
                        resolve(data)
                    })
                }

            }
            else {
                let newline_id = guid();
                dispatch(createTextLine(String(newval), newline_id));
                dispatch(setLineList(mnode.unique_id, [newline_id]))
                mnode.line_list = [newline_id];
                if (!mnode.virtual) {
                    store.dispatch(cloneLineToStore(newline_id, getState().node_dict, new_line_id));
                    store.dispatch(changeNode(mnode.unique_id, "line_list", [new_line_id]))
                    store.dispatch(healLine(new_line_id, true))
                }
            }
        })
        return Promise.resolve()
    }
}

async function change(boxname, newval, my_node_id) {

    return new Promise(async (resolve, reject) => {
        vstore.dispatch(changeBase(boxname, newval, my_node_id)).then(()=>{
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

function makeGraphicsNode(inner_text, kind, graphics_fixed_height, graphics_fixed_width, drawn_components=[]) {
    let newboxid = guid();
    let new_line_id = guid();
    window.vstore.dispatch(createTextLine("", new_line_id));

    let newbox = graphicsNodeDict(newboxid, gbox.kind, [new_line_id]);
    newbox.drawn_components = gbox.drawn_components;
    newbox.graphics_fixed_height = gbox.graphics_fixed_height;
    newbox.graphics_fixed_width = gbox.graphics_fixed_width;
    let newgnode = new GraphicsNode(newbox)
    window.vstore.dispatch(createEntry(newgnode))
    return newgnode
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

// Insert the node nodeToInsertId in the closet of boxToInsertInId
// Assumes both nodes already exist in virtualNodeDict
function insertVirtualNode(nodeToInsertId, boxToInsertInId) {
    return (dispatch, getState) => {
        batch(() => {
            let boxToInsertIn = getState().node_dict[boxToInsertInId];
            let cline_id;
            if (!boxToInsertIn.closetLine) {
                dispatch(createCloset(boxToInsertInId, false));
            }
            cline_id = getState().node_dict[boxToInsertInId].closetLine;
            dispatch(changeNode(cline_id, "virtual", true));

            dispatch(changeNode(cline_id, "node_list", [...getState().node_dict[cline_id].node_list, nodeToInsertId]));
            dispatch(healLine(cline_id, false))
            dispatch(changeNode(nodeToInsertId, "virtual", true));
            dispatch(makeChildrenVirtual(nodeToInsertId));
        })
    }
}


function makeChildrenVirtual(node_id) {
     return (dispatch, getState) => {
        batch(() => {
            let node = getState().node_dict[node_id];
            if (container_kinds.includes(node.kind)) {
                for (let line_id of node.line_list) {
                    let the_line = getState().node_dict[line_id];
                    the_line.virtual = true;
                    for (let lnode_id of the_line.node_list) {
                        dispatch(changeNode(lnode_id, "virtual",true));
                        dispatch(makeChildrenVirtual(lnode_id));
                    }
                }
                if (node.closetLine) {
                    node.closetLine.virtual = true;
                    for (let lnode_id of node.closetLine.node_list) {
                        dispatch(changeNode(lnode_id, "virtual",true));
                        dispatch(makeChildrenVirtual(lnode_id));
                    }
                }
            }
        })
     }
}

function makeChildrenNonVirtual(lin_id) {
    return (dispatch, getState) => {
        batch(() => {
            let the_line = getState().node_dict[lin_id];
            for (let nd_id of the_line.node_list) {
                let anode = getState().node_dict[nd_id];
                dispatch(changeNode(nd_id, "virtual", false));
                if (container_kinds.includes(anode.kind)) {
                    for (let line_id of anode.line_list) {
                        dispatch(changeNode(line_id, "virtual", false))
                        dispatch(makeChildrenVirtual(line_id))
                    }
                    if (anode.closetLine) {
                        dispatch(changeNode(anode.closetLine, "virtual", false));
                        dispatch(makeChildrenNonVirtual(anode.closetLine))
                    }
                }
            }
        })
    }
}

