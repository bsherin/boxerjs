
import update from "immutability-helper";
import {applyMiddleware, combineReducers, createStore} from 'redux';
import {SET_GLOBAL, CREATE_ENTRY, CHANGE_NODE, SET_NODE_DICT, INSERT_NODE, INSERT_LINE, INSERT_LINES, REPLACE_NODE, REPLACE_LINE,
    INSERT_NODES, REMOVE_NODE, REMOVE_LINE, STORE_FOCUS, CLEAR_CLIPBOARD, ADD_TO_CLIPBOARD, SET_CLIPBOARD_DICT,
    CREATE_CLIPBOARD_ENTRY, SET_CLIPBOARD_LIST, CHANGE_CLIPBOARD_NODE} from "./actions/core_actions.js"
import thunk from "redux-thunk";

export {rootReducer}


function node_dict(state={}, action) {
    let pos;
    switch (action.type) {
        case CREATE_ENTRY:
          return update(state, {[action.new_node.unique_id]: {$set: action.new_node}})
        case CHANGE_NODE:
          return update(state, {[action.uid]: {[action.param_name]: {$set: action.new_val}}})
        case INSERT_NODE:
            if (action.position == -1) {
                pos = state[action.line_id].node_list.length
            }
            else {
                pos = action.position
            }
            return update(state,
                {[action.line_id]: {node_list: {$splice: [[pos, 0, action.new_node_id]]}}})
        case SET_NODE_DICT:
            return action.new_node_dict
        case INSERT_NODES:
            if (action.position == -1) {
                pos = state[action.line_id].node_list.length
            }
            else {
                pos = action.position
            }
            return update(state,
                {[action.line_id]: {node_list: {$splice: [[pos, 0, ...action.node_id_list]]}}})
        case INSERT_LINE:
            if (action.position == -1) {
                pos = state[action.box_id].line_list.length
            }
            else {
                pos = action.position
            }
            return update(state,
                {[action.box_id]: {line_list: {$splice: [[pos, 0, action.new_line_id]]}}})
        case INSERT_LINES:
            if (action.position == -1) {
                pos = state[action.box_id].line_list.length
            }
            else {
                pos = action.position
            }
            return update(state,
                {[action.box_id]: {line_list: {$splice: [[pos, 0, ...action.line_id_list]]}}})
        case REMOVE_NODE:
            let npos = state[action.parent_id].node_list.indexOf(action.uid);
            return update(state,
                {[action.parent_id]: {node_list: {$splice: [[npos, 1]] }}})
        case REMOVE_LINE:
            let lpos = state[action.parent_id].line_list.indexOf(action.uid);
            return update(state,
                {[action.parent_id]: {line_list: {$splice: [[lpos, 1]] }}})
        case REPLACE_NODE:
            return update(state,
                {[action.parent_line_id]: {node_list: {$splice: [[action.position, 1, action.node_id]]}}})
        case REPLACE_LINE:
            return update(state,
                {[action.parent_node_id]: {line_list: {$splice: [[action.position, 1, action.line_id]]}}})
        default:
          return state
      }
}

const initial_globals = {
    executing: false,
    zoomed_node_id: "world",
    boxer_selected: false,
    select_parent: null,
    select_range: null,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight
}

function state_globals(state=initial_globals, action) {

    switch(action.type) {
        case SET_GLOBAL:
            return update(state, {[action.param]: {$set: action.val}})
        default:
            return state
    }
}

const initial_clipboard = {
    clip_list: [],
    clip_dict: {}
}

function clipboard(state=initial_clipboard, action){
    switch(action.type) {
        case CLEAR_CLIPBOARD:
            return initial_clipboard
        case CREATE_CLIPBOARD_ENTRY:
          return update(state, {clip_dict: {[action.new_node.unique_id]: {$set: action.new_node}}})
        case CHANGE_CLIPBOARD_NODE:
          return update(state, {clip_dict: {[action.uid]: {[action.param_name]: {$set: action.new_val}}}})
        case ADD_TO_CLIPBOARD:
            return update(state, {clip_list: {$unshift: [action.nodeid]}})
        case SET_CLIPBOARD_DICT:
            return update(state, {clip_dict: {$set: action.new_clipboard_dict}})
        case SET_CLIPBOARD_LIST:
            return update(state, {clip_list: {$set: action.new_clipboard_list}})
        default:
            return state
    }
}

const initial_stored_focus = {
    last_focus_id: null,
    last_focus_pos: null,
    last_focus_portal_root: null
}

function stored_focus(state=initial_stored_focus, action) {
    switch(action.type) {
        case STORE_FOCUS:
            return {
                last_focus_id: action.last_focus_id,
                last_focus_pos: action.last_focus_pos,
                last_focus_portal_root: action.last_focus_portal_root
            }
        default:
            return state
    }
}

const rootReducer = combineReducers({
    node_dict,
    state_globals,
    stored_focus,
    clipboard
})

const virtualReducer = combineReducers({
    node_dict,
    state_globals,
})


var vstore = createStore(virtualReducer, applyMiddleware(thunk));
window.vstore = vstore;