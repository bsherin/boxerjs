import {guid} from "../../utility/utilities.js";
import _ from "lodash";
import {container_kinds} from "../../shared_consts";
import update from "immutability-helper";

export {cloneNodeSourceTarget, cloneLineSourceTarget}


function changeNodeAndReturn(uid, param_name, input_val, new_dict) {
     let new_val = _.cloneDeep(input_val)

     let query = {[uid]: {[param_name]: {$set: new_val}}}
     new_dict = update(new_dict, query)
     return new_dict
}

function createEntryAndReturn(new_node, new_dict){
    let query = {[new_node.unique_id]: {$set: new_node}};
    return update(new_dict, query)
}

function cloneNodeSourceTarget(source_id, source_dict, target_id, target_dict) {

    let copied_node = _.cloneDeep(source_dict[source_id]);
    copied_node.unique_id = target_id;
    target_dict = createEntryAndReturn(copied_node, target_dict)
    if (container_kinds.includes(target_dict[target_id].kind)) {
        let new_line_list = [];
        for (let lin_id of source_dict[source_id].line_list) {
            let new_line_id = guid();
            target_dict = cloneLineSourceTarget(lin_id, source_dict, new_line_id, target_dict)

            new_line_list.push(new_line_id)
        }
        target_dict = changeNodeAndReturn(target_id, "line_list", new_line_list, target_dict);
    }

    return target_dict
}

function cloneLineSourceTarget(source_id, source_dict, target_id, target_dict) {

    let copied_line = _.cloneDeep(source_dict[source_id]);
    copied_line.unique_id = target_id;
    target_dict = createEntryAndReturn(copied_line, target_dict)
    let new_node_list = [];
    for (let nd_id of source_dict[source_id].node_list) {
        let new_node_id = guid();
        target_dict = cloneNodeSourceTarget(nd_id, source_dict, new_node_id, target_dict)
        new_node_list.push(new_node_id)
    }
    target_dict = changeNodeAndReturn(target_id, "node_list", new_node_list, target_dict);
    return target_dict
}