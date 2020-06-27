

import {
    graphicsNodeDict,
} from "./node_creator_actions.js";
import {findNamedNode} from "../../execution/transpile.js";
import {batch} from "react-redux";
import {data_kinds, sprite_params} from "../../shared_consts.js";
import {cloneLineSourceTarget} from "./action_helpers.js";
import {cloneLineToStore, healLine, setLineList, createCloset, changeBoxValue} from "./composite_actions.js";
import {changeNode} from "./core_actions.js";
import {newColorBox, createTextLine, newDataBoxNode} from "./node_creator_actions.js"
import {container_kinds} from "../../shared_consts.js";
import {GraphicsNode} from "../../graphics_box_commands";
import {createEntry} from "./core_actions.js";
import {changeSpriteParam} from "./core_actions";
import {_extractValue, guid} from "../../utility/utilities.js";

export {newErrorNode, changeBase, makeChildrenVirtual, makeChildrenNonVirtual, insertVirtualNode, makeGraphicsNode}

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

function changeBase(boxname, newval, my_node_id) {
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
                    let sparent_id = mnode.sprite_parent
                    if (sparent_id && mnode.name && sprite_params.includes(mnode.name)) {
                        window.store.dispatch(changeSpriteParam(sparent_id, mnode.name, _extractValue(new_val)));
                    }

                    let temp_dict = {};
                    for (let lin_id of new_line_list) {
                        temp_dict = cloneLineSourceTarget(lin_id, getState().node_dict, lin_id, temp_dict);
                        makeChildrenNonVirtual(lin_id, temp_dict)
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
                dispatch(changeBoxValue(mnode.unique_id, String(newval)));
                if (!mnode.virtual) {
                    let sparent_id = mnode.sprite_parent
                    if (sparent_id && mnode.name && sprite_params.includes(mnode.name)) {
                        window.store.dispatch(changeSpriteParam(sparent_id, mnode.name, newval));
                    }
                    window.store.dispatch(changeBoxValue(mnode.unique_id, String(newval)));

                }
            }
        })
        return Promise.resolve()
    }
}


function makeGraphicsNode(inner_text, kind, graphics_fixed_height, graphics_fixed_width, drawn_components=[]) {
    let newboxid = guid();
    let new_line_id = guid();
    window.vstore.dispatch(createTextLine("", new_line_id));

    let newbox = graphicsNodeDict(newboxid, kind, [new_line_id]);
    newbox.drawn_components = drawn_components;
    newbox.graphics_fixed_height = graphics_fixed_height;
    newbox.graphics_fixed_width = graphics_fixed_width;
    let newgnode = new GraphicsNode(newbox)
    return newgnode
}

// Insert the node nodeToInsertId in the closet of boxToInsertInId
// Assumes both nodes already exist in virtualNodeDict
function insertVirtualNode(nodeToInsertId, boxToInsertInId) {
    return (dispatch, getState) => {
        batch(() => {
            let boxToInsertIn = getState().node_dict[boxToInsertInId];
            if (boxToInsertIn.kind == "port") {
                boxToInsertInId = boxToInsertIn.target;
                boxToInsertIn = getState().node_dict[boxToInsertInId];
            }
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
                   getState().node_dict[node.closetLine].virtual = true;
                    for (let lnode_id of getState().node_dict[node.closetLine].node_list) {
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

