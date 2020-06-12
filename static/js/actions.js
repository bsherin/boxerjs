import { bindActionCreators } from 'redux'
import { batch } from 'react-redux'
import {guid} from "./utilities.js";
import _ from "lodash";
import {container_kinds} from "./shared_consts.js";

const CREATE_ENTRY = "CREATE_ENTRY";
function createEntry(new_node) {
    return {
        type: CREATE_ENTRY,
        new_node:new_node
    }
}

const CHANGE_NODE = "CREATE_ENTRY";
function changeNode(uid, param_name, new_val) {
    return {
        type: CHANGE_NODE,
        uid: uid,
        param_name: param_name,
        new_val: new_val
    }
}

function renumberLines(node_id, node_dict, dispatch) {
    let counter = 0;
    for (let lineid of node_dict[node_id].line_list) {
        target_dict = dispatch(changeNode(lineid, "position", counter))
        counter += 1
    }
}

function setLineList(uid, new_line_list, node_dict, dispatch) {
    batch(()=>{
        dispatch(changeNode(uid, "line_list", new_line_list));
        for (let lin_id of new_line_list) {
            dispatch(changeNode(lin_id, "parent", uid));
        }
        renumberLines(uid)
    })

}

function cloneNodeToStore(nd_id, new_id = null, source_dict, update_ids=false, dispatch) {
    let new_base_id;
    if (new_id) {
        new_base_id = new_id;
    }
    else if (update_ids) {
        new_base_id = guid();
    }
    else {
        new_base_id = nd_id;
    }
    let copied_node = _.cloneDeep(source_dict[nd_id]);
    copied_node.unique_id = new_base_id;
    dispatch(creatEntry(copied_node));

    if (container_kinds.includes(copied_node.kind)) {
        let new_line_list = [];
        for (let lin_id of source_dict[nd_id].line_list) {
            let new_line_id = guid();
            dispatch(cloneLineToStore(lin_id, new_line_id, source_dict, update_ids, dispatch))
            new_line_list.push(new_line_id)
        }
        dispatch(changeNode(new_base_id, "line_list", new_line_list));
    }

    return [new_base_id, target_dict]
}

function cloneLine(line_id, new_id=null, source_dict, update_ids=false, dispatch) {
    let new_base_id;
    if (new_id) {
        new_base_id = new_id;
    }
    else if (update_ids) {
        new_base_id = guid();
    }
    else {
        new_base_id = line_id;
    }
    let copied_line = _.cloneDeep(source_dict[line_id]);
    copied_line.unique_id = new_base_id;
    dispatch(creatEntry(copied_linee));
    let new_node_list = [];
    for (let nd_id of source_dict[line_id].node_list) {
        let new_node_id = guid();
        dispatch(cloneNodeToStore(nd_id, new_node_id, source_dict, update_ids, dispatch))
        new_node_list.push(new_node_id)
    }
    dispatch(changeNode(new_base_id, "node_list", new_node_list));
    return [new_base_id, target_dict]
}



function mapDispatchToProps(dispatch) {
  return {
      setLineList: (uid, new_line_list, node_dict) => {setLineList(uid, new_line_list, node_dict, dispatch)},
      ...bindActionCreators({ createEntry, changeNode }, dispatch)
  }
}
