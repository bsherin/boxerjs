
import React from "react";
import {batch} from "react-redux";


import { changeNodePure, changeSpriteParam, setNodeDict, insertNode, insertLine,
    removeNode, setGlobal } from "./action_creators.js";
import {_getNthNode, _getln, _getContainingGraphicsBox, _isParentBoxInPort} from "../selectors.js";
import {newTextNode, newLineNode, newClosetLine, newSpriteBox, createNode,
} from "./node_creator_actions.js";
import {cloneNodeSourceTarget, cloneLineSourceTarget} from "./action_helpers.js";

import {container_kinds, initial_globals} from "../../shared_consts.js";
import {text_kinds} from "../../shared_consts.js";
import {ADD_TO_BUFFER, addToBuffer, clearBuffer, updateNodeDict} from "./action_creators";
import {guid, addToPortChain, portChainLast, portChainDropRight} from "../../utility/utilities.js";
import {_dehydrateComponents} from "../../utility/save_utilities";
import _ from "lodash";
import {postAjax} from "../../utility/communication_react";
import {doFlash} from "../../utility/toaster";
import {showModalReact} from "../../utility/modal_react";


export {healLine, healStructure, splitLine, createCloset, setLineList,
    toggleBoxTransparency, setPortTarget, enterPortTargetMode, setFocusInBox,
    setGlobals, zoomBox, unzoomBox, focusName, addGraphicsComponent, cloneLineToStore, cloneNodeToStore, collectGarbage,
    setFocus, arrowDown, arrowUp, focusLeft, focusRight, positionAfterBox, doBracket, downFromTag,
    splitTextNode, splitLineAtTextPosition, changeSpriteValueBox, addCompositeToBuffer, saveProject, saveProjectAs,
    dispatchBufferedActions, initializeMissingGlobals, updateTextNode, changeNode, changeNodeMulti,
insertBoxInText, insertBoxLastFocus, toggleCloset, setGraphicsSize, retargetPort, setNodeSize}



function setln(nid, ln, nn, param_name, new_val) {
    return (dispatch, getState) => {
        let the_id = _getln(nid, ln, nn, getState().node_dict);
        dispatch(changeNode(the_id, param_name, new_val))
    }
}

function setGlobals(val_dict) {
    return (dispatch, getState) => {
        batch(() => {
            for (let param in val_dict) {
                let new_val = val_dict[param]
                dispatch(setGlobal(param, new_val))
            }
        })
    }
}


function changeNodeMulti(uid, valdict) {
    return (dispatch, getState) => {
        batch(() => {
            for (let param in valdict) {
                let new_val = valdict[param]
                dispatch(changeNode(uid, param, new_val))
            }
        })
    }
}


function changeNode(uid, param_name, new_val) {
    return (dispatch, getState) => {
        if (param_name == "the_text" && getState().node_dict[uid].kind == "text") {
            dispatch(updateTextNode(uid, new_val, null))
        }
        else {
            dispatch(changeNodePure(uid, param_name, new_val));
        }
    }
}

function updateTextNode(nid, new_val, display_text=null) {
    return (dispatch, getSatate) => {
        dispatch(changeNodePure(nid, "the_text", new_val));
        dispatch(changeNodePure(nid, "display_text", display_text));
    }
}


function mergeTextNodes(n1, n2, line_id) {
    return (dispatch, getState) => {
        batch(() => {
            dispatch(changeNodePure(_getNthNode(line_id, n1, getState()["node_dict"]).unique_id,
                "the_text",
                _getNthNode(line_id, n1, getState()["node_dict"]).the_text + _getNthNode(line_id, n2, getState()["node_dict"]).the_text));
            dispatch(removeNode(_getNthNode(line_id, n2, getState()["node_dict"]).unique_id, line_id))
        })
    }
}

function renumberLines(node_id) {
    return (dispatch, getState) => {
        let counter = 0;

        batch(() => {
            for (let lineid of getState()["node_dict"][node_id].line_list) {
                dispatch(changeNode(lineid, "position", counter))
                counter += 1
            }
        })

    }
}

function addCompositeToBuffer(func, ...args) {
    return (dispatch, getState) => {
        let act = {
            composite: true,
            func: func,
            args: _.cloneDeep(args)
        }
        dispatch({
            type: ADD_TO_BUFFER,
            action_dict: act
        })
    }
}

function renumberNodes(line_id) {
    return (dispatch, getState) => {
        let counter = 0;

        batch(() => {
            for (let nodeid of getState()["node_dict"][line_id].node_list) {
                dispatch(changeNode(nodeid, "position", counter))
                counter += 1
            }
        })

    }
}

function collectGarbage() {
    return (dispatch, getState) => {
        let ndict = _.cloneDeep(getState().node_dict);
        for (let ndid in ndict) {
            ndict[ndid].still_used = false
        }
        let marked_dict = mark_used("world", ndict)
        let final_dict = {}
        for (let ndid in marked_dict) {
            if (ndict[ndid].still_used) {
                final_dict[ndid] = _.cloneDeep(ndict[ndid])
            }
        }
        dispatch(setNodeDict(final_dict))
        function mark_used(start_id, local_dict) {
            local_dict[start_id].still_used = true;
            if (container_kinds.includes(local_dict[start_id].kind)) {
                for (let lin_id of ndict[start_id].line_list) {
                    local_dict[lin_id].still_used = true;
                    for (let ndid of local_dict[lin_id].node_list) {
                        local_dict = mark_used(ndid, local_dict)
                    }
                }
                if (ndict[start_id].closetLine) {
                    local_dict[ndict[start_id].closetLine].still_used = true;
                    for (let ndid of local_dict[ndict[start_id].closetLine].node_list) {
                        local_dict = mark_used(ndid, local_dict)
                    }
                }
            }
            return local_dict
        }
    }

}


function healStructure(start_node_id) {

    return (dispatch, getState) => {

        batch(() => {
            let node_dict = getState()["node_dict"];
            let start_node = node_dict[start_node_id];
            if (start_node.kind == "line") {
                dispatch(healLine(start_node_id, true))
            }
            else if (container_kinds.includes(start_node.kind)) {
                if (start_node.line_list.length == 0) {
                    let lin_id = guid();
                    dispatch(newLineNode([], lin_id));
                    dispatch(changeNode(lin_id, "parent", start_node_id));
                    dispatch(setLineList(start_node.unique_id, [lin_id]));
                    dispatch(healStructure(lin_id));
                }
                else {
                    for (let lin_id of start_node.line_list) {
                        dispatch(changeNode(lin_id, "parent", start_node_id));
                        dispatch(healStructure(lin_id))
                    }
                }

                dispatch(renumberLines(start_node_id));
                node_dict = getState()["node_dict"];
                if (node_dict[start_node_id].closetLine) {
                    dispatch(changeNodeMulti(node_dict[start_node_id].closetLine,
                        {"parent": start_node_id, "amCloset": true}))
                    dispatch(healStructure(node_dict[start_node_id].closetLine))
                }
            }
        })
    }
}

function healLine(line_id, recursive=false) {
    return (dispatch, getState) => {
        let done = false;
        batch(() => {
            while (!done) {
               dispatch(renumberNodes(line_id));
                done = true;
                for (let i = 0; i < getState()["node_dict"][line_id].node_list.length - 1; ++i) {
                    let node_dict = getState()["node_dict"];
                    if ((_getNthNode(line_id, i, node_dict).kind == "text") && (_getNthNode(line_id, i + 1, node_dict).kind == "text")) {
                        dispatch(mergeTextNodes(i, i + 1, line_id));
                        done = false;
                        break
                    }
                }
            }
            // Insert text node at start if necessary
            if (_getNthNode(line_id, 0, getState()["node_dict"]).kind != "text") {
                let new_node_id = guid();
                let node_dict = getState()["node_dict"];
                dispatch(newTextNode("", new_node_id));
                dispatch(insertNode(new_node_id, line_id, 0));
            }
            // Insert text node at end if necessary
            if (_getNthNode(line_id, -1, getState()["node_dict"]).kind != "text") {
                let new_node_id = guid();
                dispatch(newTextNode("", new_node_id));
                let node_dict = getState()["node_dict"];
                let pos = node_dict[line_id].node_list.length;
                dispatch(insertNode(new_node_id, line_id, pos));
            }
            done = false;

            // Insert text nodes between adjacent boxes
            while (!done) {
                dispatch(renumberNodes(line_id));
                done = true;
                let node_dict = getState()["node_dict"];
                let the_len = node_dict[line_id].node_list.length;
                for (let i = 0; i < the_len - 1; ++i) {
                    if ((_getNthNode(line_id, i, node_dict).kind != "text") &&
                        (_getNthNode(line_id, i + 1, node_dict).kind != "text")) {
                        let new_node_id = guid();
                        dispatch(newTextNode("", new_node_id));
                        dispatch(insertNode(new_node_id, line_id, i + 1))
                        done = false;
                        break
                    }
                }
            }
            // make sure parents are marked
            for (let ndid of getState()["node_dict"][line_id].node_list) {
                if (getState()["node_dict"][ndid].parent != line_id) {
                    dispatch(changeNode(ndid, "parent", line_id))
                }
            }
            if (recursive) {
                let node_dict = getState()["node_dict"];
                for (let node_id of node_dict[line_id].node_list) {
                    dispatch(healStructure(node_id))

                }
            }
        })
    }
}


function setLineList(uid, new_line_list) {
    return (dispatch, getState) => {
        let {node_dict} = getState();
        batch(()=>{
            dispatch(changeNode(uid, "line_list", new_line_list));
            for (let lin_id of new_line_list) {
                dispatch(changeNode(lin_id, "parent", uid));
            }
            dispatch(renumberLines(uid))
        })
    }
}

function cloneNodeToStore(source_node_id, source_dict, target_node_id, heal=true) {
    return (dispatch, getState) => {
        let temp_dict = {};
        temp_dict[target_node_id] = _.cloneDeep(getState().node_dict[target_node_id]);
        let new_temp_dict = cloneNodeSourceTarget(source_node_id, source_dict, target_node_id, temp_dict)
        batch(()=>{
            dispatch(updateNodeDict(new_temp_dict))
            if (heal) {
                dispatch(healStructure(target_node_id))
            }
        })

    }
}


function cloneLineToStore(source_line_id, source_dict, target_line_id, heal = true, buffer=false) {
    return (dispatch, getState) => {
        let temp_dict = {};
        temp_dict[target_line_id] = _.cloneDeep(getState().node_dict[target_line_id]);
        let new_temp_dict = cloneLineSourceTarget(source_line_id, source_dict, target_line_id, temp_dict);
        batch(() => {
            dispatch(updateNodeDict(new_temp_dict));
            if (buffer) {
                dispatch(addToBuffer(updateNodeDict(new_temp_dict)))
            }
            if (heal) {
                dispatch(healLine(target_line_id));
                if (buffer) {
                    dispatch(addCompositeToBuffer(healLine, target_line_id))
                }
            }
        });
    };
}

function splitTextNode(text_id, cursor_position) {
    return (dispatch, getState) => {
        batch(() => {
            let new_node_id = guid();
            let node_dict = getState()["node_dict"];
            let mnode = node_dict[text_id];
            let parent = mnode.parent;
            let pos = mnode.position;
            let text_split = [mnode.the_text.slice(0, cursor_position), mnode.the_text.slice(cursor_position,)];
            dispatch(newTextNode(text_split[1], new_node_id));
            dispatch(changeNodePure(text_id, "the_text", text_split[0]));
            dispatch(insertNode(new_node_id, parent, pos + 1));
            dispatch(changeNode(new_node_id, "parent", parent))
        })
    }
}

function splitLineAtTextPosition(text_id, cursor_position, port_chain="root",) {
    return (dispatch, getState) => {
        batch(() => {
            dispatch(splitTextNode(text_id, cursor_position));
            let linid = getState().node_dict[text_id].parent;
            let parent_line = getState().node_dict[linid];
            let parent_line_pos = parent_line.position;
            let box_parent_id = parent_line.parent;
            dispatch(splitLine(linid, getState().node_dict[text_id].position + 1));
            dispatch(healStructure(box_parent_id));
            let nd_for_focus = _getln(parent_line.parent, parent_line_pos + 1, 0, getState().node_dict);
            dispatch(setFocus(nd_for_focus, port_chain, 0));
        })
    }
}

function splitLine(line_id, position) {
    return (dispatch, getState) => {
        batch(() => {
            let the_line = getState().node_dict[line_id]
            let new_node_list = the_line.node_list.slice(position,);
            dispatch(changeNode(line_id, "node_list",
                [...the_line.node_list.slice(0, position)]));

            dispatch(renumberNodes(line_id));

            let new_line_id = guid();
            dispatch(newLineNode(new_node_list, new_line_id));
            for (let nd_id of new_node_list) {
                dispatch(changeNode(nd_id, "parent", new_line_id));
            }
            dispatch(renumberNodes(new_line_id))

            dispatch(insertLine(new_line_id, the_line.parent, the_line.position + 1));
            dispatch(changeNode(new_line_id, "parent", the_line.parent));
        })
    }
}

function insertBoxBase(kind, text_id, cursor_position, new_node_id) {
    return (dispatch, getState) => {
       batch(() => {
            dispatch(splitTextNode(text_id, cursor_position));
            if (kind == "sprite") {
                let use_svg = false;
                let gbox = _getContainingGraphicsBox(text_id, getState().node_dict)
                if (gbox && gbox.kind == "svggraphics") {
                    use_svg = true;
                }
                dispatch(newSpriteBox(use_svg, new_node_id))
            }
            else {
                dispatch(createNode(kind, new_node_id));
            }
            let pos = getState().node_dict[text_id].position + 1
            dispatch(insertNode(new_node_id, getState().node_dict[text_id].parent, pos));
            dispatch(healLine(getState().node_dict[text_id].parent, true))
        })
        return Promise.resolve();
    }
}

function insertBoxInText(kind, text_id, cursor_position, port_chain) {
    return (dispatch, getState) => {
        let new_node_id = guid();
        dispatch(insertBoxBase(kind, text_id, cursor_position, new_node_id)).then(()=>{
            if (["databox", "doitbox"].includes(kind)) {
                dispatch(setFocus(_getln(new_node_id, 0, 0, getState().node_dict), port_chain, 0));
            } else if (text_kinds.includes(kind)) {
                dispatch(setFocus(new_node_id, port_chain, 0))
            }
            // dispatch(clearSelected());
            if (kind == "port") {
                dispatch(enterPortTargetMode(new_node_id));
            }
        })
    }
}

function insertBoxLastFocus(kind) {
    return (dispatch, getState) => {
        let stored_focus = getState().stored_focus;
        dispatch(insertBoxInText(kind, stored_focus.last_focus_id, stored_focus.last_focus_pos, stored_focus.last_focus_port_chain))
    }
}

function setPortTarget(port_id, target_id) {
    return (dispatch, getState) => {
        dispatch(changeNode(port_id, "target", target_id))
    }
}

function enterPortTargetMode(port_id) {
    return (dispatch, getState) => {
        document.addEventListener("click", gotClick);

        function gotClick(event) {
            let target = event.target.closest(".targetable");
            if (!target) return;
            dispatch(setPortTarget(port_id, target.id));
            document.removeEventListener("click", gotClick)
        }
    }
}

function retargetPort(port_id) {
    return (dispatch, getState) => {
        dispatch(changeNode(port_id, "target", null));
        dispatch(enterPortTargetMode(port_id))
    }
}

function retargetPortLastFocus() {
    return (dispatch, getState) => {
        dispatch(retargetPort(getState().stored_focus.last_focus_port_chain))
    }
}

function setFocus(focus_node_id, port_chain, pos) {
    return (dispatch, getState) => {
        if (pos == -1) {
            pos = getState().node_dict[focus_node_id].the_text.length
        }
        dispatch(changeNode(focus_node_id, "setTextFocus", [port_chain, pos]))
    }
}

function setFocusInBox(box_id, port_chain, pos) {
    return (dispatch, getState) => {
        let targetBox = getState().node_dict[box_id];
        let final_box_id = box_id;
        let final_port_chain = port_chain;
        if (targetBox.kind == "port") {
            let final_port_chain = addToPortChain(port_chain, box_id);
            final_box_id = targetBox.target;

        }
        let focus_node_id;
        if (targetBox.showCloset) {
            focus_node_id =_getClosetn(final_box_id, 0, getState().node_dict)
        }
        else {
            focus_node_id = _getln(final_box_id, 0, 0, getState().node_dict);
        }
        dispatch(changeNode(focus_node_id, "setTextFocus", [final_port_chain, pos]))
    }
}

function positionAfterBox(databox_id, port_chain) {
    return (dispatch, getState) => {
        let mnode = getState().node_dict[databox_id];

        let target_id = _getNthNode(mnode.parent, mnode.position + 1, getState().node_dict).unique_id;
        dispatch(setFocus(target_id, port_chain, 0))
    }
}

function arrowDown(text_id, port_chain) {
    return (dispatch, getState) => {
        let ndict = getState().node_dict;
        let my_line = ndict[ndict[text_id].parent];
        let myDataBox = ndict[my_line.parent];
        if (my_line.amCloset) {
            let firstTextNodeId =
                ndict[ndict[myDataBox.line_list[0]].node_list[0]].unique_id;
            dispatch(setFocus(firstTextNodeId, port_chain, 0));
        }
        if (my_line.position < (myDataBox.line_list.length - 1)) {
            let firstTextNodeId = ndict[ndict[myDataBox.line_list[my_line.position + 1]].node_list[0]].unique_id;
            dispatch(setFocus(firstTextNodeId, port_chain, 0));
        }
    }
}

function arrowUp(text_id, am_in_port, port_chain) {
    return (dispatch, getState) => {
        let ndict = getState().node_dict;
        let my_line = ndict[ndict[text_id].parent];
        let myDataBox = ndict[my_line.parent];
        if (my_line.amCloset || (my_line.position == 0 && !myDataBox.showCloset)) {
            dispatch(focusName(null, port_chain))
        }
        else if (my_line.position == 0) {
            let firstTextNodeId =
                ndict[ndictt[myDataBox.closetLine].node_list[0]].unique_id;
            dispatch(setFocus(firstTextNodeId, port_chain, 0));
        }
        else {
            let firstTextNodeId =
                ndict[ndict[myDataBox.line_list[my_line.position - 1]].node_list[0]].unique_id;
            dispatch(setFocus(firstTextNodeId, port_chain, 0));
        }
    }
}

function focusLeft(text_id, position, port_chain) {
    return (dispatch, getState) => {
        let ndict = getState().node_dict;
        let my_line = ndict[ndict[text_id].parent];
        for (let pos = position - 1; pos >= 0; --pos) {
            let candidate = ndict[ndict[my_line.node_list[pos]].unique_id];
            if (candidate.kind == "text") {
                dispatch(setFocus(candidate.unique_id, port_chain, candidate.the_text.length));
                return
            }
        }
    }
}

function focusRight(text_id, position, port_chain) {
    return (dispatch, getState) => {
        let ndict = getState().node_dict;
        let my_line = ndict[ndict[text_id].parent];
        let nnodes = my_line.node_list.length;
        if (position == nnodes - 1) {
            return
        }
        for (let pos = position + 1; pos < nnodes; ++pos) {
            let candidate = ndict[ndict[my_line.node_list[pos]].unique_id];
            if (candidate.kind == "text") {
                dispatch(setFocus(candidate.unique_id, port_chain, 0));
                return
            }
        }
    }
}

function doBracket(text_id, port_chain) {
    return (dispatch, getState) => {
        let ndict = getState().node_dict;
        let my_line = ndict[ndict[text_id].parent];
        if (_isParentBoxInPort(text_id, port_chain, getState().node_dict)) {
            dispatch(positionAfterBox(portChainLast(port_chain), portChainDropRight(port_chain)));
        }
        else {
            dispatch(positionAfterBox(my_line.parent, port_chain));
        }

    }
}

function downFromTag(boxId, port_chain) {
    return (dispatch, getState) => {
        let ndict = getState().node_dict;
        let myDataBox = ndict[boxId];
        if (text_kinds.includes(myDataBox.kind)) {
            dispatch(setFocus(boxId, port_chain, 0));
        }
        else {
            dispatch(setFocusInBox(boxId, port_chain, 0));
        }
    }
}

// This is for updating legacy saves when new globals are introduced
function initializeMissingGlobals() {
    return (dispatch, getState) => {
        batch(() => {
            for (let k in initial_globals) {
                if (!getState().state_globals.hasOwnProperty(k)){
                    dispatch(setGlobal(k, initial_globals[k]))
                }
            }
        })
    }

}

function zoomBox(uid) {
    return (dispatch, getState) => {
        batch (() => {
            dispatch(changeNode(uid, "am_zoomed", true));
            dispatch(setGlobal("zoomed_node_id", uid));
        })
    }
}

function unzoomBox(uid) {
    return (dispatch, getState) => {
        batch (() => {
            let mnode = getState().node_dict[uid];
            if (mnode.parent == null) {
                return
            }

            dispatch(changeNode(uid, "am_zoomed", false));

            let found = false;
            while (!found) {
                let parent_id = mnode.parent;
                if (parent_id == null) {
                    found = true
                }
                let parent_line = getState().node_dict[parent_id];
                mnode = getState().node_dict[parent_line.parent];
                if (mnode.am_zoomed) {
                    found = true
                }
            }
            dispatch(setGlobal("zoomed_node_id", mnode.unique_id))
        })
    }
}

function focusName(text_id=null, port_chain="root") {
    return (dispatch, getState) => {
        if (text_id == null) {
            text_id = document.activeElement.id
        }
        let mnode = getState().node_dict[text_id];
        let box_id;

        if (mnode.kind == "text") {
            if (_isParentBoxInPort(text_id, port_chain, getState().node_dict)) {
                box_id = portChainLast(port_chain);
                port_chain = portChainDropRight(port_chain)
            }
            else {
                let line_id = mnode.parent;
                box_id = getState().node_dict[line_id].parent;
            }

        }
        else if (text_kinds.includes(mnode.kind)) {
            box_id = text_id
        }

        let currentName = getState().node_dict[box_id].name;
        if (currentName == null) {
            dispatch(changeNode(box_id, "name", ""));
        }
        dispatch(changeNode(box_id, "focusNameTag", port_chain))
    }
}

function addGraphicsComponent(uid, the_comp, buffer=true) {
    return (dispatch, getState) => {
        let mnode = getState().node_dict[uid];
        let new_drawn_components = [...mnode.drawn_components, the_comp];
        dispatch(changeNode(uid, "drawn_components", new_drawn_components));
        if (buffer) {
            dispatch(addToBuffer(changeNodePure(uid, "drawn_components", new_drawn_components)))
        }
        return Promise.resolve();
    }

}

function toggleBoxTransparency(boxId) {
    return (dispatch, getState) => {
        let ndict = getState()["node_dict"]
        let mline = ndict[ndict[boxId].parent];
        if (mline.parent == null) return;
        let mbox = ndict[mline.parent];
        if (mbox.name == "world") return;
        dispatch(changeNode(mbox.unique_id, "transparent", !mbox.transparent))
    }

}

function setNodeSize(uid, new_width, new_height) {
    return (dispatch, getState) => {
        let val_dict = {};
        if (!new_width) {
            val_dict["fixed_size"] = false;
            val_dict["fixed_width"] = null;
            val_dict["fixed_height"] = null
        } else {
            val_dict["fixed_size"] = true;
            val_dict["fixed_width"] = new_width;
            val_dict["fixed_height"] = new_height;
        }
        dispatch(changeNodeMulti(uid, val_dict));
    }
}

function setGraphicsSize(uid, new_width, new_height) {
    return (dispatch, getState) => {
        let val_dict = {};
        val_dict.graphics_fixed_width = new_width;
        val_dict.graphics_fixed_height = new_height;
        dispatch(changeNodeMulti(uid, val_dict));
    }
}



function createCloset(boxId, show=false) {
    return (dispatch, getState) => {
        batch(() => {
            let cline_id = guid();
            dispatch(newClosetLine(cline_id))
            dispatch(changeNodeMulti(boxId, {"showCloset": show, "closetLine": cline_id}));
            dispatch(healStructure(boxId))
        })

    }
}

function toggleCloset(boxId) {
    return (dispatch, getState) => {
        let ndict = getState()["node_dict"]
        let mnode = ndict[boxId];
        let mline = ndict[mnode.parent];
        if (mline.parent == null) return;
        let mbox = ndict[mline.parent];
        if (!mbox.closetLine) {
            dispatch(createCloset(mbox.unique_id, !mbox.showCloset))
        } else {
            dispatch(changeNode(mbox.unique_id, "showCloset", !mbox.showCloset))
        }

    }
}

// This should be called only on a manual change of a sprite param box
function changeSpriteValueBox(value_parent_id, new_val) {
    return (dispatch, getState) => {
        batch(() => {
            let vnode = getState().node_dict[value_parent_id];

            if (vnode) {
                dispatch(changeSpriteParam(vnode.sprite_parent, vnode.name, new_val))
            }

        })
        return Promise.resolve()
    }
}

function dispatchList(action_list) {
    return (dispatch, getState) => {
        batch(() => {
            for (let action of action_list) {
                if (action.composite) {
                    dispatch(action.func(...action.args))
                }
                else {
                    dispatch(action)
                }
            }
        })
        return Promise.resolve()
    }
}

function dispatchBufferedActions() {
    return (dispatch, getState) => {
        window.store.dispatch(dispatchList(_.cloneDeep(getState().buffered_actions)));
        dispatch(clearBuffer())
    }
}

function saveProject() {
    return (dispatch, getState) => {
        if (window.world_name == "") {
            dispatch(saveProjectAs())
            return
        }
        dispatch(collectGarbage())
        let new_state = _.cloneDeep(getState());
        _dehydrateComponents(new_state.node_dict);

        const result_dict = {
            project_name: window.world_name,
            world_state: new_state
        };
        postAjax("update_project", result_dict, updateSuccess);

        function updateSuccess(data) {
            if (data.success) {
                data["alert_type"] = "alert-success";
                data.timeout = 2000;
            }
            else {
                data["alert_type"] = "alert-warning";
            }
            doFlash(data)
        }
    }
}

function saveProjectAs() {
    return (dispatch, getState) => {
        postAjax("get_project_names", {}, function (data) {
            let checkboxes;
            showModalReact("Save Project As", "New Project Name", CreateNewProject,
                "NewProject", data["project_names"], null, doCancel)
        });

        function doCancel() {
        }

        function CreateNewProject(new_name) {
            //let console_node = cleanse_bokeh(document.getElementById("console"));
            dispatch(collectGarbage())
            let new_state = _.cloneDeep(getState());
            _dehydrateComponents(new_state.node_dict);

            const result_dict = {
                "project_name": new_name,
                "world_state": new_state
            };

            postAjax("save_new_project", result_dict, save_as_success);

            function save_as_success(data_object) {
                if (data_object["success"]) {
                    window.world_name = new_name;
                    document.title = new_name;
                    data_object.alert_type = "alert-success";
                    data_object.timeout = 2000;
                    // postWithCallback("host", "refresh_project_selector_list", {'user_id': window.user_id});
                    doFlash(data_object)
                } else {
                    data_object["message"] = "Saving didn't work";
                    data_object["alert-type"] = "alert-warning";
                    doFlash(data_object)
                }
            }
        }
    }
}




