
import update from "immutability-helper";
import {applyMiddleware, combineReducers, createStore} from 'redux';
import {SET_GLOBAL, CREATE_ENTRY, CHANGE_NODE, SET_NODE_DICT, INSERT_NODE, INSERT_LINE, INSERT_LINES, REPLACE_NODE, REPLACE_LINE,
    INSERT_NODES, REMOVE_NODE, REMOVE_LINE} from "../redux/actions/core_actions.js"
import thunk from "redux-thunk";

export {virtualReducer}


function node_dict(state={}, action) {
    switch (action.type) {
        case CREATE_ENTRY:
          return update(state, {[action.new_node.unique_id]: {$set: action.new_node}})
        case CHANGE_NODE:
          return update(state, {[action.uid]: {[action.param_name]: {$set: action.new_val}}})
        case INSERT_NODE:
            return update(state,
                {[action.line_id]: {node_list: {$splice: [[action.position, 0, action.new_node_id]]}}})
        case SET_NODE_DICT:
            return action.new_node_dict
        case INSERT_NODES:
            return update(state,
                {[action.line_id]: {node_list: {$splice: [[action.position, 0, ...action.node_id_list]]}}})
        case INSERT_LINE:
            return update(state,
                {[action.box_id]: {line_list: {$splice: [[action.position, 0, action.new_line_id]]}}})
        case INSERT_LINES:
            return update(state,
                {[action.box_id]: {line_list: {$splice: [[action.position, 0, ...action.line_id_list]]}}})
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
}

function state_globals(state=initial_globals, action) {

    switch(action.type) {
        case SET_GLOBAL:
            return update(state, {[action.param]: {$set: action.val}})
        default:
            return state
    }
}


const virtualReducer = combineReducers({
    node_dict,
    state_globals,
})


var vstore = createStore(virtualReducer, applyMiddleware(thunk));
window.vstore = vstore;