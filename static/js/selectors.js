
import _ from "lodash";
import {container_kinds, graphics_kinds} from "./shared_consts";

export {_getNthNode, _getln, _getNthLine, _getContainingGraphicsBox, _containsPort, _getParentNode}


// Given a line id returns nth node
// Returns the last if nn = -1

function _getNthNode(line_id, nn, node_dict) {
    if (nn == -1) {
        return node_dict[_.last(node_dict[line_id].node_list)]
    }
    else {
        return node_dict[node_dict[line_id].node_list[nn]]
    }
}

function _getNthLine(node_id, ln, node_dict=null) {
    if (ln == -1) {
        return target_dict[_.last(node_dict[node_id].line_list)]
    }
    else {
        return node_dict[node_dict[node_id].line_list[ln]]
    }
}

function _getln(nid, ln, nn, node_dict){
    let target_node = node_dict[nid];
    if (target_node.kind == "line") {
        if (nn == -1) {
            return _.last(_getNthNode(nid, ln, node_dict).line_list)
        } else {
            return _getNthNode(nid, ln, node_dict).line_list[nn]
        }
    }
    else {
        if (nn == -1) {
            return _.last(_getNthLine(nid, ln, node_dict).node_list)
        } else {
            return _getNthLine(nid, ln, node_dict).node_list[nn]
        }

    }
}

function _getParentNode(nid, node_dict) {
    return node_dict[node_dict[nid].parent]
}

function _containsPort(boxId, node_dict) {
    let mnode = node_dict[boxId];
    let self = this;
    return checkNode(mnode);

    function checkNode(the_node) {
        if (container_kinds.includes(the_node.kind)) {
            for (let lin_id of the_node.line_list) {
                let lin = node_dict[lin_id];
                for (let nd_id of lin.node_list) {
                    let nd = node_dict[nd_id];
                    if (nd.kind == "port") {
                        return true
                    }
                    if (checkNode(nd)) {
                        return true
                    }
                }
            }
        }
        return false
    }
}

function _getContainingGraphicsBox(start_id, node_dict) {
    let base_id = "world";
    function getGBox(the_id) {
        if (the_id == base_id) {
            return null;
        }
        let cnode = node_dict[the_id];
        if (graphics_kinds.includes(cnode.kind)) {
            return cnode;
        } else {
            return getGBox(cnode.parent);
        }
    }
    return getGBox(start_id);
}