
import {batch} from "react-redux";
import {changeNode, changeNodeMulti} from "./core_actions.js";
import {_getParentNode, _getNthLine, _getln, _getNthNode} from "../selectors.js"
import {cloneLineToStore, splitLine, setFocus, setLineList, splitTextNode, createCloset,
    positionAfterBox, healLine, healStructure} from "./composite_actions.js"
import{cloneNodeSourceTarget, cloneLineSourceTarget} from "./action_helpers.js";
import {setGlobal, setGlobals, insertNodes, insertLines, clearClipboard, addToClipboard, setClipboardDict, removeLine, removeNode,
    createClipboardEntry, changeClipboardNode, setClipboardList} from "./core_actions.js";
import {newLineNode, textNodeDict, lineNodeDict, dataBoxNodeDict} from "./node_creator_actions.js";
import {guid} from "../../utility/utilities.js";
import _ from "lodash";
import {container_kinds} from "../../shared_consts.js";
import {cloneNodeToStore} from "./composite_actions";

export {clearSelected, deleteToLineEnd, addTextToClipboard, insertClipboard, copySelected, cutSelected, selectSpan,
    deleteBoxerSelection, deletePrecedingBox}



// Focus management

function focusInOrAfter(node_id, portal_root=null, pos=-1) {
    return (dispatch, getState) => {
        let mnode = getState().node_dict[node_id];
        if (!portal_root) {
            portal_root = getState().stored_focus.last_focus_portal_root
        }
        if (mnode.kind == "text") {
            if (pos == -1) {
                pos = mnode.the_text.length
            }
            dispatch(setFocus(node_id, portal_root, pos))
        }
        else {
            dispatch(positionAfterBox(node_id, portal_root))
        }
    }
}

// Selection management

function clearSelectedBase() {
    return (dispatch, getState) => {
        batch(() => {
            for (let nid in getState().node_dict) {
                if (getState().node_dict[nid].selected) {
                    dispatch(changeNode(nid, "selected", false))
                }
            }
            dispatch(setGlobal("boxer_selected", false))
        })
        return Promise.resolve()
    }
}

function selectChildren(node_id) {
    return (dispatch, getState) => {
        batch(() => {
            dispatch(changeNode(node_id, "selected", true));
            let node = getState().node_dict[node_id];
            if (node.kind == "line") {
                for (let child of node.node_list) {
                    dispatch(selectChildren(child))
                }
            } else if (container_kinds.includes(node.kind)) {
                for (let child of node.line_list) {
                    dispatch(selectChildren(child))
                }
                if (node.closetLine) {
                    dispatch(selectChildren(node.closetLine))
                }
            }
        })
    }
}

function clearSelected(force=false) {
    return (dispatch, getState) => {
        if (!getState().state_globals.boxer_selected && !force) {
            return
        }
        let focus_node_id = null;
        if (getState().state_globals.boxer_selected) {
            let sglobals = getState().state_globals;
            let select_parent_node = getState().node_dict[sglobals.select_parent];

            if (select_parent_node.kind == "line") {
                focus_node_id = select_parent_node.node_list[sglobals.select_range[1]];
            } else {
                let last_selected_line = getState().node_dict[select_parent_node.line_list[sglobals.select_range[1]]];
                focus_node_id = _.last(last_selected_line.node_list);
            }
        }

        dispatch(clearSelectedBase())
            .then(() => {
                if (!focus_node_id) return;
                    dispatch(focusInOrAfter(focus_node_id, null, -1));
                } )

    }
}

function setSelected(id_list) {
    return (dispatch, getState) => {
        batch(() => {
            dispatch(clearSelected(true));
            dispatch(changeClipboardNode(uid, "selected", true))
        })
    }
}


function selectSpan(start_id, end_id) {
    return (dispatch, getState) => {
        batch(() => {
            let start_parent_ids = _findParents(start_id, getState().node_dict);
            let end_parent_ids = _findParents(end_id, getState().node_dict);
            let common_parent = null;
            for (let par of start_parent_ids) {
                if (end_parent_ids.includes(par)) {
                    common_parent = par;
                    break;
                }
            }
            if (!common_parent) {
                return null
            }
            let start_parent_id = start_parent_ids[start_parent_ids.indexOf(common_parent) - 1];
            let end_parent_id = end_parent_ids[end_parent_ids.indexOf(common_parent) - 1];
            let range;
            let start_parent = getState().node_dict[start_parent_id];
            let end_parent = getState().node_dict[end_parent_id];
            if (start_parent.position > end_parent.position) {
                range = [end_parent.position, start_parent.position]
            } else {
                range = [start_parent.position, end_parent.position]
            }
            let cp = getState().node_dict[common_parent];
            let nd_list;
            if (container_kinds.includes(cp.kind)) {
                nd_list = cp.line_list
            } else {
                nd_list = cp.node_list
            }
            for (let i = range[0]; i <= range[1]; ++i) {
                dispatch(selectChildren(nd_list[i]))
            }
            dispatch(setGlobals({
                boxer_selected: true,
                select_parent: common_parent,
                select_range: range,
            }))
        })
    }
}

// Functions that put stuff in the clipboard

function newClipboardTextNode(the_text, uid) {
    return (dispatch, getState) => {
        let new_node = textNodeDict(the_text, uid)
        dispatch(createClipboardEntry(new_node))
    }
}

function newClipboardLineNode(node_list=[], uid) {
    return (dispatch, getState) => {
        batch(() => {
            if (node_list.length == 0) {
                let new_id = guid();
                dispatch(newClipboardTextNode("", new_id));
                node_list = [new_id]
            }
            let new_line = lineNodeDict(node_list, uid);
            dispatch(createClipboardEntry(new_line))
        })
    }
}

function newClipboardDataBoxNode(line_list=[], amClosetBox=false, uid) {
    return (dispatch, getState) => {
        batch(() => {
            if (line_list.length == 0) {
                let text_id = guid();
                dispatch(newClipboardTextNode("", text_id));
                let node_list = [text_id]
                let line_id = guid();
                dispatch(newClipboardLineNode(node_list, line_id));
                line_list = [line_id]
            }
            let new_box = dataBoxNodeDict(line_list, uid);
            dispatch(createClipboardEntry(new_box))
        })
    }
}

function cloneNodeToClipboard(source_id, new_id) {
    return (dispatch, getState) => {
        let new_clip_dict = cloneNodeSourceTarget(source_id, getState().node_dict, new_id, getState().clipboard.clip_dict);
        dispatch(setClipboardDict(new_clip_dict))
    }
}

function cloneNodeListToClipboard(source_id_list) {
    return (dispatch, getState) => {
        let new_node_list = [];
        batch(() => {
            for (let ndid of source_id_list) {
                let new_id = guid();
                dispatch(cloneNodeToClipboard(ndid, new_id));
                new_node_list.push(new_id)
            }

        })
        return new_node_list
    }
}

function cloneLineToClipboard(source_id, new_id) {
    return (dispatch, getState) => {
        let new_clip_dict = cloneLineSourceTarget(source_id, getState().node_dict, new_id, getState().clipboard.clip_dict);
        dispatch(setClipboardDict(new_clip_dict))
    }
}

function cloneLineListToClipboard(source_id_list) {
    return (dispatch, getState) => {
        let new_line_list = [];
        batch(() => {
            for (let ndid of source_id_list) {
                let new_id = guid();
                dispatch(cloneLineToClipboard(ndid, new_id));
                new_line_list.push(new_id)
            }

        })
        return new_line_list
    }
}

function startNewClipboardLine(clear=false){
    return (dispatch, getState) => {
        batch(() => {
            let new_line1_id = guid();
            let new_line2_id = guid();
            dispatch(newClipboardLineNode([], new_line1_id));
            if (clear) {
                dispatch(newClipboardLineNode([], new_line2_id));
                dispatch(setClipboardList([new_line1_id, new_line2_id]));
            } else {
                dispatch(addToClipboard(new_line1_id))
            }
        })
    }
}

function addToClipboardFromNodeDict(source_node_id, clear=false) {
    return (dispatch, getState) => {
        batch(() => {
            if (clear) {
                dispatch(clearClipboard())
            }
            if (getState().node_dict[source_node_id].kind == "line") {
                let cnodeid = guid();
                dispatch(cloneLineToClipboard(source_node_id, cnodeid))
                dispatch(addToClipboard(cnodeid))
            }
            else {
                let cnodeid = guid();
                dispatch(cloneNodeToClipboard(source_node_id, cnodeid));
                if (clear) {
                    let linid = guid();
                    dispatch(newClipboardLineNode([cnodeid], linid));
                    dispatch(addToClipboard(linid))
                } else {
                    let first_line = getState().clipboard.clip_dict[getState().clipboard.clip_list[0]];
                    let new_node_list = [...first_line.node_list];
                    new_node_list.unshift(cnodeid)
                    dispatch(changeClipboardNode(first_line.unique_id, "node_list", new_node_list));
                }
            }
        })
    }
}

function addTextToClipboard(the_text, clear=false) {
    return (dispatch, getState) => {
        batch(() => {
            let new_node_id = guid()

            if (clear) {
                dispatch(clearClipboard())
                dispatch(newClipboardTextNode(the_text, new_node_id))
                let new_line_id = guid();
                dispatch(newClipboardLineNode([new_node_id], new_line_id))
                dispatch(addToClipboard(new_line_id))
            }
            else {

                let first_line = getState().clipboard.clip_dict[getState().clipboard.clip_list[0]];
                let first_node = getState().clipboard.clip_dict[first_line.node_list[0]];
                if (first_node.kind == "text") {
                    dispatch(changeClipboardNode(first_node.unique_id, "the_text", the_text + first_node.the_text))
                }
                else {
                    dispatch(newClipboardTextNode(the_text, new_node_id))
                    first_line.node_list.unshift(new_node_id);
                }

            }
        })
    }
}

function _findParents(node_id, target_dict) {
    let mnode = target_dict[node_id];
    let parents = [mnode.unique_id];
    let par = mnode.parent;
    while (par) {
        parents.push(par);
        mnode = target_dict[par];
        par = mnode.parent
    }
    return parents
}


function setClipboardToNodeList(node_list) {
    return (dispatch, getState) => {
        batch(() => {
            dispatch(clearClipboard());
            let new_id_list = dispatch(cloneNodeListToClipboard(node_list));
            let nline_id = guid();
            dispatch(newClipboardLineNode(new_id_list, nline_id));
            dispatch(setClipboardList([nline_id]));
        })
    }
}

function removeNodeList(node_list, parent_id) {
    return (dispatch, getState) => {
        batch(() => {
            let parentLine = getState().node_dict[parent_id];
            for (let ndid of node_list) {
                dispatch(removeNode(ndid, parentLine.unique_id))
            }
            dispatch(healStructure(parentLine.unique_id));
        })
    }
}

function deleteToLineEnd(text_id, caret_pos) {
    return (dispatch, getState) => {
        batch(() => {
            let mnode = getState().node_dict[text_id];
            let parentLine = getState().node_dict[mnode.parent];
            let nodes_to_delete;
            if (caret_pos == 0) {
                if (mnode.position == 0) {
                    // We are at the start of the first node
                    // So delete the entire line
                    dispatch(addToClipboardFromNodeDict(mnode.parent, true));
                    if (parentLine.amCloset) {
                        dispatch(createCloset(parentLine.parent, getState().node_dict[parentLine.parent].showCloset));
                    } else {

                        dispatch(removeLine(parentLine.unique_id, parentLine.parent));
                    }
                    dispatch(clearSelected())
                    dispatch(healStructure(parentLine.parent))
                    return
                }
                else {
                    // we are at the start of a text node that is not the first node
                    // So delete it and all following nodes.
                    parentLine = getState().node_dict[mnode.parent];
                    nodes_to_delete = parentLine.node_list.slice(mnode.position, );
                }
            }
            else {
                // if we are in th middle of a text node, then split it.
                if (caret_pos < getState().node_dict[text_id].the_text.length - 1) {
                    dispatch(splitTextNode(text_id, caret_pos));
                    mnode = getState().node_dict[text_id];
                    parentLine = getState().node_dict[mnode.parent];
                }

                // Now are at the end of one text node and want to delete the rest
                // Check that there are some nodes to delete
                if (mnode.position == (parentLine.node_list.length - 1)) {
                    return
                }

                // Remove all following nodes
                nodes_to_delete = parentLine.node_list.slice(mnode.position + 1,);
            }

            dispatch(clearClipboard())
            dispatch(setClipboardToNodeList(nodes_to_delete));
            dispatch(removeNodeList(nodes_to_delete, parentLine.unique_id));
            dispatch(clearSelected());

        })
    }
}

function cutSelected() {
    return (dispatch, getState) => {
        batch(() => {
            if (getState().state_globals.boxer_selected) {
                dispatch(deleteBoxerSelection());
                return
            }
            let sel = window.getSelection();
            let the_text = sel.toString();
            if (!the_text) {
                return
            }
            let text_id = guid();
            let line_id = guid();
            dispatch(clearClipboard());
            dispatch(newClipboardTextNode(the_text, text_id));
            dispatch(newClipboardLineNode([text_id], line_id));
            dispatch(setClipboardList([line_id]));

            let tnode = getState().node_dict[sel.anchorNode.parentNode.id];
            let start;
            let num;
            if (sel.anchorOffset < sel.focusOffset) {
                start = sel.anchorOffset;
                num = sel.focusOffset - start
            }
            if (sel.anchorOffset > sel.focusOffset) {
                start = sel.focusOffset;
                num = sel.anchorOffset - start
            }
            let val_dict = {
                the_text: tnode.the_text.slice(0, start) + tnode.the_text.slice(start + num,),
                setTextFocus: [getState().stored_focus.last_focus_portal_root, start]
            }
            dispatch(changeNodeMulti(tnode.unique_id, val_dict));
        })
    }
}

function copySelected() {
    return (dispatch, getState) => {
        batch(() => {
            if (getState().state_globals.boxer_selected) {
                dispatch(copyBoxerSelection());
                return
            }
            let the_text = window.getSelection().toString();
            if (!the_text) {
                return
            }
            clearClipboard();
            let newTextId = guid();
            let newLineId = guid();
            dispatch(newClipboardTextNode(the_text, newTextId));
            dispatch(newClipboardLineNode([newTextId], newLineId));
            dispatch(setClipboardList([newLineId]));
            dispatch(clearSelected())
        })
    }
}


function copyBoxerSelection() {
    return (dispatch, getState) => {
        batch(() => {
            if (!getState().state_globals.boxer_selected) {
                return
            }
            dispatch(clearClipboard());
            let source_dict = getState().node_dict;
            let sglobals = getState().state_globals;
            let select_parent_node = source_dict[sglobals.select_parent];
            if (select_parent_node.kind == "line") {
                let copied_node_ids = select_parent_node.node_list.slice(sglobals.select_range[0],
                    sglobals.select_range[1] + 1);
                let new_line_id = guid();
                let new_node_list = dispatch(cloneNodeListToClipboard(copied_node_ids));
                dispatch(newClipboardLineNode(new_node_list, new_line_id));
                dispatch(setClipboardList([new_line_id]))
            } else {
                let copied_line_ids = select_parent_node.line_list.slice(sglobals.select_range[0],
                    sglobals.select_range[1] + 1);
                let new_line_list = dispatch(cloneLineListToClipboard(copied_line_ids))
                dispatch(setClipboardList(new_line_list))
            }
            dispatch(clearSelected())
        })
    }
}

function deleteBoxerSelection() {
    return (dispatch, getState) => {
        batch(() => {
            let sglobals = getState().state_globals;
            if (!sglobals.boxer_selected) {
                return
            }
            let sfocus = getState().stored_focus
            dispatch(clearClipboard());
            let select_parent_node = getState().node_dict[sglobals.select_parent];
            let num_to_delete = sglobals.select_range[1] - sglobals.select_range[0] + 1;
            if (select_parent_node.kind == "line") {
                let start_spot = sglobals.select_range[0];
                let deleted_node_ids = select_parent_node.node_list.slice(start_spot, num_to_delete);
                let new_deleted_node_ids = dispatch(cloneNodeListToClipboard(deleted_node_ids));
                let new_line_id = guid();
                dispatch(newClipboardLineNode(new_deleted_node_ids, new_line_id));
                dispatch(setClipboardList([new_line_id]));
                for (let ndid of deleted_node_ids) {
                    dispatch(removeNode(ndid, sglobals.select_parent));
                }
                dispatch(healLine(select_parent_node.unique_id, false));
                let focus_node_id;
                if (start_spot >= select_parent_node.node_list.length) {
                    focus_node_id = select_parent_node.node_list[select_parent_node.node_list.length - 1];
                    dispatch(focusInOrAfter(focus_node_id, null, -1));
                } else if (select_parent_node.node_list[start_spot].kind != "text") {
                    focus_node_id = select_parent_node.node_list[start_spot + 1];
                    dispatch(focusInOrAfter(focus_node_id, null, 0))

                } else {
                    focus_node_id = select_parent_node.node_list[start_spot];
                    dispatch(focusInOrAfter(focus_node_id, null, -1))
                }

            } else {
                let deleted_line_ids = select_parent_node.line_list.slice(sglobals.select_range[0], num_to_delete);
                let new_deleted_line_ids = dispatch(cloneLineListToClipboard(deleted_line_ids));
                dispatch(setClipboardList(new_deleted_line_ids));
                let focus_node_id;
                let focus_line_id;
                for (let line_id of deleted_line_ids) {
                    dispatch(removeLine(line_id, select_parent_node.unique_id))
                }
                if (getState().node_dict[sglobals.select_parent].line_list.length == 0) {
                    let new_line_id = guid();
                    dispatch(newLineNode([], new_line_id));
                    dispatch(setLineList(sglobals.select_parent, [new_line_id]));

                    focus_node_id = getState().node_dict[new_line_id].node_list[0];
                    dispatch(focusInOrAfter(focus_node_id, sfocus.last_focus_portal_root, 0));
                }
                if (sglobals.select_range[0] >= getState().node_dict[sglobals.select_parent].line_list.length) {
                    focus_line_id = getState().node_dict[sglobals.select_parent].line_list[sglobals.select_range[0] - 1];
                    focus_node_id = _.last(getState().node_dict[focus_line_id].node_list);
                    dispatch(focusInOrAfter(focus_node_id, null, -1));
                } else {
                    focus_line_id = getState().node_dict[sglobals.select_parent].line_list[sglobals.select_range[0]];
                    focus_node_id = getState().node_dict[focus_line_id].node_list[0];
                    dispatch(focusInOrAfter(focus_node_id, null, 0));
                }
            }
            dispatch(setGlobal("boxer_selected", false));
            dispatch(healStructure(sglobals.select_parent))
        })
    }
}

function mergeWithPrecedingLine(second_line_id) {
    return (dispatch, getState) => {
        batch(() => {
            let second_line = getState().node_dict[second_line_id];
            let dbox_id = second_line.parent;
            let first_line = _getNthLine(dbox_id, second_line.position - 1, getState().node_dict);

            dispatch(insertNodes(second_line.node_list, first_line.unique_id,
                first_line.node_list.length));
            dispatch(removeLine(second_line_id, dbox_id))
        })
    }
}

function deletePrecedingBoxBase(text_id, clearClipboard=true) {
    return (dispatch, getState) => {
        let focus_node = null;
        let focus_pos = null;
        batch(() => {
            let target_dict = getState().node_dict;
            let mnode = target_dict[text_id];
            let parent_line = target_dict[mnode.parent];

            if (mnode.position == 0) {
                if (!parent_line.amCloset && parent_line.position != 0) {
                    let preceding_node = target_dict[_getln(parent_line.parent, parent_line.position - 1, -1, target_dict)]

                    if (preceding_node.kind == "text") {
                        focus_node = preceding_node.unique_id;
                        focus_pos = -1
                    } else {
                        focus_node = text_id;
                        focus_pos = 0
                    }
                    dispatch(startNewClipboardLine(clearClipboard));
                    dispatch(mergeWithPrecedingLine(parent_line.unique_id));
                    dispatch(healStructure(parent_line.parent));
                }
            } else {
                let preceding_node = _getNthNode(parent_line.unique_id, mnode.position - 1, target_dict);
                if ((mnode.position - 2) < 0) {
                    focus_node = text_id;
                    focus_pos = 0
                } else {
                    let pre_preceding_node = _getNthNode(parent_line.unique_id, mnode.position - 2, target_dict);
                    if (pre_preceding_node.kind == "text") {
                        focus_node = pre_preceding_node.unique_id;
                        focus_pos = pre_preceding_node.the_text.length
                    } else {
                        focus_node = text_id;
                        focus_pos = 0
                    }
                }

                if (preceding_node.kind != "text") {
                    dispatch(addToClipboardFromNodeDict(preceding_node.unique_id, clearClipboard));
                    dispatch(removeNode(preceding_node.unique_id, parent_line.unique_id));
                    dispatch(healStructure(parent_line.unique_id))
                }
            }


        })
        return Promise.resolve({focus_node, focus_pos})
    }
}

function deletePrecedingBox(text_id, clearClipboard=true, portal_root) {
    return (dispatch, getState) => {
        dispatch(deletePrecedingBoxBase(text_id, clearClipboard))
            .then((result) => {
                dispatch(focusInOrAfter(result.focus_node, portal_root, result.focus_pos))
            })
    }
}

// From clipboard to the main store

function cloneNodesToStore(node_ids) {
    return (dispatch, getState) => {
        let new_node_ids = [];
        batch(() => {
            for (let nid of node_ids) {
                let new_id = guid();
                dispatch(cloneNodeToStore(nid, getState().clipboard.clip_dict, new_id))
                new_node_ids.push(new_id)
            }
        })
        return new_node_ids
    }
}

function cloneLinesToStore(line_ids) {
    return (dispatch, getState) => {
        let new_line_ids = [];
        batch(() => {
            for (let nid of line_ids) {
                let new_id = guid();
                dispatch(cloneLineToStore(nid, getState().clipboard.clip_dict, new_id))
                new_line_ids.push(new_id)
            }
        })
        return new_line_ids
    }
}

function insertClipboardBase(text_id, cursor_position, portal_root) {
    return (dispatch, getState) => {
        let focus_text_pos = null;
        let focus_node_id = null;
        batch(() => {
            if (getState().clipboard.clip_list.length == 0) {
                return
            }
            dispatch(splitTextNode(text_id, cursor_position))
            let parent_line = _getParentNode(text_id, getState().node_dict)
            let first_text_id = text_id;

            let clist = getState().clipboard.clip_list;
            let cdict = getState().clipboard.clip_dict;

            if (clist.length == 1) {

                // Clone the nodes from the clipboard.
                let lin_id = getState().clipboard.clip_list[0];
                let new_node_ids = dispatch(cloneNodesToStore(cdict[clist[0]].node_list))

                // Deal with focus
                // If theres only one node and the preceding node is also a text
                // node than they will be combined. So we have to use the preceding node
                // for focus
                if (new_node_ids.length == 1) {
                    let inserted_node = getState().node_dict[new_node_ids[0]];
                    let preceding_node = getState().node_dict[text_id];
                    if (inserted_node.kind == "text" && preceding_node.kind == "text") {
                        focus_node_id = text_id;
                    }
                    else {
                        focus_node_id = inserted_node.unique_id
                    }
                }
                else {
                    // We are inserting multiple nodes
                    // So what we are doing only depends on the last node
                    let focus_node_id = _.last(new_node_ids);
                }

                dispatch(insertNodes(new_node_ids, parent_line.unique_id, getState().node_dict[text_id].position + 1));
                dispatch(healStructure(parent_line.unique_id))
            } else {
                let updated_line_list = dispatch(cloneLinesToStore(clist))

                // Split the line between the two text nodes resulting from the split
                let nodeA = getState().node_dict[first_text_id];
                let targetLine = getState().node_dict[nodeA.parent];
                dispatch(splitLine(targetLine.unique_id, nodeA.position + 1));

                // insert nodes from the first clipboard line at the end of the first line
                dispatch(insertNodes(getState().node_dict[updated_line_list[0]].node_list, targetLine.unique_id, targetLine.node_list.length));

                // Figure out where to focus when done
                let last_line = getState().node_dict[_.last(updated_line_list)]
                focus_node_id = _.last(last_line.node_list)

                // Insert nodes from the last clipboard line at the start of the second line resulting
                // from the split
                nodeA = getState().node_dict[first_text_id];
                targetLine = getState().node_dict[nodeA.parent];
                let targetBox = getState().node_dict[targetLine.parent];
                let targetLine2 = getState().node_dict[targetBox.line_list[targetLine.position + 1]];
                dispatch(insertNodes(last_line.node_list, targetLine2.unique_id, 0));

                // If there are any remaining lines, insert them between the others
                if (clist.length > 2) {
                    targetBox = getState().node_dict[targetLine.parent];
                    dispatch(insertLines(updated_line_list.slice(1, clist.length - 1), targetBox.unique_id,
                        targetLine.position + 1));
                }
                dispatch(healStructure(targetBox.unique_id))

            }
            dispatch(clearSelected(true));
        })
        return Promise.resolve(focus_node_id)
    }
}
 function insertClipboard(text_id, cursor_position, portal_root) {
     return (dispatch, getState) => {
         dispatch(insertClipboardBase(text_id, cursor_position, portal_root))
             .then((focus_node_id) => {
                     dispatch(focusInOrAfter(focus_node_id, portal_root, -1));
            })
     }
 }
