
import update from "immutability-helper";


function reducerFunc(state, action) {
    switch (action.type) {
        case CREATE_ENTRY:
          return update(state, {[action.new_node.unique_id]: {$set: action.new_node}})
        case CHANGE_NODE:
          return update(state, {[action.uid]: {[action.param_name]: {$set: action.new_val}}})
        default:
          return state
      }
}