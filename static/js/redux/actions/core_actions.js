
import { batch } from 'react-redux'

import {sprite_params} from "../../shared_consts.js";

export {createEntry, changeNode, changeSpriteParam, setNodeDict, insertNode, insertNodes, insertLine, insertLines, changeNodeMulti,
    clearClipboard, addToClipboard, setClipboardDict, createClipboardEntry, setClipboardList, changeClipboardNode,
    replaceNode, replaceLine, removeNode, removeLine, setGlobal, setGlobals, storeFocus, changeNodePure}
export {SET_GLOBAL, CREATE_ENTRY, CHANGE_NODE, SET_NODE_DICT, INSERT_NODE, CHANGE_SPRITE_PARAM,
    INSERT_NODES, INSERT_LINE, INSERT_LINES, REMOVE_NODE, REMOVE_LINE, REPLACE_NODE, REPLACE_LINE,
    STORE_FOCUS, CLEAR_CLIPBOARD, ADD_TO_CLIPBOARD, SET_CLIPBOARD_DICT, CREATE_CLIPBOARD_ENTRY, SET_CLIPBOARD_LIST,
    CHANGE_CLIPBOARD_NODE
}


function template(uid, valdict) {
    return (dispatch, getState) => {
        batch(() => {

        })
    }
}

const SET_GLOBAL = "SET_GLOBAL";
function setGlobal(param, val) {
    return {
        type: SET_GLOBAL,
        param: param,
        val: val
    }
}

const SET_GLOBALS = "SET_GLOBALS";
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

const CLEAR_CLIPBOARD = "CLEAR_CLIPBOARD";
function clearClipboard() {
    return {
        type: CLEAR_CLIPBOARD
    }
}

const CHANGE_CLIPBOARD_NODE = "CHANGE_CLIPBOARD_NODE";
function changeClipboardNode(uid, param_name, new_val) {
    return {
        type: CHANGE_CLIPBOARD_NODE,
        uid: uid,
        param_name: param_name,
        new_val: new_val
    }
}

const CREATE_CLIPBOARD_ENTRY = "CREATE_CLIPBOARD_ENTRY";
function createClipboardEntry(new_node) {
    return {
        type: CREATE_CLIPBOARD_ENTRY,
        new_node:new_node
    }
}

const ADD_TO_CLIPBOARD = "ADD_TO_CLIPBOARD";
function addToClipboard(nodeid) {
    return {
        type: ADD_TO_CLIPBOARD,
        nodeid: nodeid
    }
}

const SET_CLIPBOARD_DICT = "SET_CLIPBOARD_DICT"
function setClipboardDict(new_clipboard_dict) {
    return {
        type: SET_CLIPBOARD_DICT,
        new_clipboard_dict: new_clipboard_dict
    }
}

const SET_CLIPBOARD_LIST = "SET_CLIPBOARD_LIST"
function setClipboardList(new_clipboard_list) {
    return {
        type: SET_CLIPBOARD_LIST,
        new_clipboard_list: new_clipboard_list
    }
}

const CREATE_ENTRY = "CREATE_ENTRY";
function createEntry(new_node) {
    return {
        type: CREATE_ENTRY,
        new_node:new_node
    }
}


const CHANGE_NODE = "CHANGE_NODE";
function changeNodePure(uid, param_name, new_val) {
    return {
        type: CHANGE_NODE,
        uid: uid,
        param_name: param_name,
        new_val: new_val
    }
}

function changeNode(uid, param_name, new_val) {
    return (dispatch, getState) => {
        dispatch(changeNodePure(uid, param_name, new_val));
    }
}

const CHANGE_SPRITE_PARAM = "CHANGE_SPRITE_PARAM";
function changeSpriteParam(uid, param_name, new_val) {
    return {
        type: CHANGE_SPRITE_PARAM,
        uid: uid,
        param_name: param_name,
        new_val: new_val
    }
}

const SET_NODE_DICT = "SET_NODE_DICT"
function setNodeDict(new_node_dict) {
    return {
        type: SET_NODE_DICT,
        new_node_dict: new_node_dict
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

const INSERT_NODE = "INSERT_NODE";
function insertNode(new_node_id, line_id, position) {
    return {
        type: INSERT_NODE,
        new_node_id: new_node_id,
        line_id: line_id,
        position: position
    }
}

const INSERT_NODES = "INSERT_NODES";
function insertNodes(new_id_list, line_id, position) {
    return {
        type: INSERT_NODES,
        node_id_list: new_id_list,
        line_id: line_id,
        position: position
    }
}

const INSERT_LINE = "INSERT_LINE";
function insertLine(new_line_id, box_id, position) {
    return {
        type: INSERT_LINE,
        new_line_id: new_line_id,
        box_id: box_id,
        position: position
    }
}

const INSERT_LINES = "INSERT_LINES";
function insertLines(new_id_list, box_id, position) {
    return {
        type: INSERT_LINES,
        line_id_list: new_id_list,
        box_id: box_id,
        position: position
    }
}

const REMOVE_NODE = "REMOVE_NODE"
function removeNode(uid, parent_id) {
    return {
        type: REMOVE_NODE,
        uid: uid,
        parent_id: parent_id
    }
}

const REMOVE_LINE = "REMOVE_LINE"
function removeLine(uid, parent_id) {
    return {
        type: REMOVE_LINE,
        uid: uid,
        parent_id: parent_id
    }
}

const REPLACE_NODE = "REPLACE_NODE"
function replaceNode(node_id, parent_line_id, position) {
    return {
        type: REPLACE_NODE,
        node_id: node_id,
        parent_line_id: parent_line_id,
        position: position
    }
}

const REPLACE_LINE = "REPLACE_LINE"
function replaceLine(line_id, parent_node_id, position) {
    return {
        type: REPLACE_LINE,
        line_id: line_id,
        parent_node_id: parent_node_id,
        position: position
    }
}


const STORE_FOCUS = "STORE_FOCUS"
function storeFocus(uid, position, portal_root) {
    return {
        type: STORE_FOCUS,
        last_focus_id: uid,
        last_focus_pos: position,
        last_focus_portal_root: portal_root
    }
}


