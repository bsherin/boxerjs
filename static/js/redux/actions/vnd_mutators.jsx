

import {
    graphicsNodeDict, newLineNode
} from "./node_creator_actions.js";
import {findNamedNode} from "../../execution/transpile.js";
import {batch} from "react-redux";
import {data_kinds, sprite_params} from "../../shared_consts.js";
import {changeNode,cloneLineToStore, healLine, setLineList, createCloset, addCompositeToBuffer} from "./composite_actions.js";
import { addToBuffer} from "./action_creators.js";
import {createTextLine, newDataBoxNode, newPort} from "./node_creator_actions.js"
import {container_kinds} from "../../shared_consts.js";
import {GraphicsNode} from "../../graphics_box_commands";
import {changeNodePure, changeSpriteParam} from "./action_creators";
import {_extractValue, guid, convertAndRound} from "../../utility/utilities.js";
import {_getln} from "../selectors";
import {healStructure} from "./composite_actions";

export {newErrorNode, changeBase, makeChildrenVirtual, makeChildrenNonVirtual, insertVirtualNode, makeGraphicsNode,
    setSpriteParams}

function newErrorNode(first_part, body, original_node_id = null) {
    return (dispatch, getState) => {
        let new_dbox_id = guid();
        batch(() => {

            let line_ids = [];

            let body_list = body.split("\n")
            let tline_id = guid();
            dispatch(createTextLine(first_part, tline_id));
            line_ids.push(tline_id)


            for (let btext of body_list) {
                let bline_id = guid();
                dispatch(createTextLine(btext, bline_id));
                line_ids.push(bline_id)
            }

            if (original_node_id) {
                let port_id = guid();
                dispatch(newPort(original_node_id, port_id));
                dispatch(changeNodePure(port_id, "closed", true));
                let pline_id = guid();
                dispatch(newLineNode([port_id], pline_id));
                line_ids.push(pline_id)
            }

            dispatch(newDataBoxNode(line_ids, false, new_dbox_id));
            dispatch(healStructure(new_dbox_id))
        })
        return {vid: new_dbox_id}
    }
}


function changeBoxValue(nid, new_val, buffer=false) {
    return (dispatch, getState) => {
        let the_id = _getln(nid, 0, 0, getState().node_dict);
        dispatch(changeNodePure(the_id, "the_text", new_val))
        if (buffer) {
            let rounded_val = String(convertAndRound(new_val, window.store.getState().state_globals.printing_precision));
            if (rounded_val == new_val) {
                rounded_val = null
            }
            dispatch(addToBuffer(changeNodePure(the_id, "the_text", new_val)));
            dispatch(addToBuffer(changeNodePure(the_id, "display_text", rounded_val)));
        }
    }
}


function setSpriteParams(uid, pdict, buffer=true) {
    return (dispatch, getState) => {
        batch(() => {
            let mnode = getState().node_dict[uid];
            if (mnode) {
                for (let sparam in pdict) {
                    let updated_param = pdict[sparam];
                    dispatch(changeSpriteParam(uid, sparam, updated_param));
                    if (buffer)(
                        dispatch(addToBuffer(changeSpriteParam(uid, sparam, updated_param)))
                    )
                    dispatch(changeBoxValue(mnode.param_box_ids[sparam], String(updated_param), buffer))
                }
            }

        })
        return Promise.resolve()
    }
}


function changeBase(targetid, newval, my_node_id) {
    return (dispatch, getState) => {
        batch(() => {
            // let mnode = findNamedNode(boxname, my_node_id);
            let mnode = getState().node_dict[targetid];
            if (mnode.kind == "port") {
                mnode = getState().node_dict[mnode.target]
            }
            if (!mnode) {
                return new Promise(function(resolve, reject) {
                    resolve()
                })
            }
            let is_virtual = mnode.hasOwnProperty("virtual") && mnode.virtual
            if (typeof(newval) == "object") {
                let the_node = getState().node_dict[newval.vid];
                if (!data_kinds.includes(mnode.kind) || !data_kinds.includes(the_node.kind)) {
                    return new Promise(function (resolve, reject) {
                        resolve()
                    })
                }

                let sparent_id = mnode.sprite_parent
                if (sparent_id && mnode.name && sprite_params.includes(mnode.name)) {
                    if (mnode.name == "shape") {
                        if (the_node.hasOwnProperty("drawn_components")) {
                            dispatch(changeSpriteParam(sparent_id, "shape_components", the_node.drawn_components))
                            if (!is_virtual) {
                                dispatch(addToBuffer(changeSpriteParam(sparent_id, "shape_components", the_node.drawn_components)));
                            }
                        }

                    }
                    // I'm not sure this can ever be followed productively
                    // If there's a value to be extracted then I think newval shouldn't be an object
                    else {
                        dispatch(changeSpriteParam(sparent_id, mnode.name, _extractValue(the_node)));
                        if (!is_virtual) {
                            dispatch(addToBuffer(changeSpriteParam(sparent_id, mnode.name, _extractValue(the_node))));
                        }
                    }

                }

                let new_line_list = [];
                for (let lin_id of the_node.line_list) {
                    let new_line_id = guid();
                    dispatch(cloneLineToStore(lin_id, getState().node_dict, new_line_id, true, !is_virtual));
                    new_line_list.push(new_line_id)
                }

                dispatch(setLineList(mnode.unique_id, new_line_list));
                return new Promise(function (resolve, reject) {
                    dispatch(setLineList(mnode.unique_id, new_line_list));
                    if (!is_virtual) {
                        dispatch(addCompositeToBuffer(setLineList, mnode.unique_id, new_line_list))
                    }
                    resolve()
                })


            }
            else {
                let sparent_id = mnode.sprite_parent
                if (sparent_id && mnode.name && sprite_params.includes(mnode.name)) {
                    dispatch(changeSpriteParam(sparent_id, mnode.name, newval));
                    if (!is_virtual) {
                        dispatch(addToBuffer(dispatch(changeSpriteParam(sparent_id, mnode.name, newval))));
                    }
                }

                dispatch(changeBoxValue(mnode.unique_id, String(newval), !is_virtual));
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

