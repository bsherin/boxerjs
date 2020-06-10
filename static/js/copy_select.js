import {_getMatchingNode} from "./mutators.js";
import {container_kinds} from "./shared_consts.js";
import _ from "lodash";

export {copySelectMixin}

let copySelectMixin = {

    _clearClipboard() {
        this.clipboard = [];
        this.clipboard_dict = {}
    },

    _selectChildren(node_id, update=true, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
        target_dict = this.changeNodeAndReturn(node_id, "selected", true, target_dict)
        let node = target_dict[node_id];
        if (node.kind == "line") {
            for (let child of node.node_list) {
                target_dict = this._selectChildren(child, false, target_dict)
            }
        }
        else if (container_kinds.includes(node.kind)) {
            for (let child of node.line_list) {
                target_dict = this._selectChildren(child, false, target_dict)
            }
            if (node.closetLine) {
                target_dict = this._selectChildren(node.closetLine, false, target_dict)
            }
        }
        if (update) {
            this.setState({node_dict: target_dict})
        }
        return target_dict
    },

    _addTextToClipBoardStart(the_text, clear=false) {
        let new_node_id;

        if (clear) {
            let new_line_id, new_node_id;
            this.clipboard_dict = {};
            [new_node_id, this.clipboard_dict] = this._newTextNode(the_text, this.clipboard_dict);
            [new_line_id, this.clipboard_dict] = this._newLineNode([new_node_id], this.clipboard_dict);
            this.clipboard = [new_line_id];
            this.clipboard_dict[new_node_id].parent = new_line_id
        }
        else {
            [new_node_id, this.clipboard_dict] = this._newTextNode(the_text, this.clipboard_dict);
            let first_line = this.clipboard_dict[this.clipboard[0]];
            first_line.node_list.unshift(new_node_id);
            this.clipboard_dict[new_node_id].parent = first_line.unique_id
            if (first_line.node_list.length > 1) {
                if (this.clipboard_dict[first_line.node_list[0]].kind == "text"
                    && this.clipboard_dict[first_line.node_list[1]].kind == "text") {
                    this.clipboard_dict = this._mergeTextNodes(0, 1, first_line.unique_id, this.clipboard_dict, false)
                }
            }
        }
    },

    _addToClipboardStart(new_node_id, clear=false, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
        if (clear) {
            let new_line_id;
            this.clipboard_dict = {};
            this.clipboard_dict[new_node_id] = _.cloneDeep(target_dict[new_node_id]);
            [new_line_id, target_dict] = this._newLineNode([new_node_id], this.clipboard_dict);
            this.clipboard = [new_line_id];
            this.clipboard_dict[new_line_id] = new_node_id;
            this.clipboard_dict[new_node_id].parent = new_line_id
        }
        else {
            this.clipboard_dict[new_node_id] = _.cloneDeep(target_dict[new_node_id]);
            let first_line = this.clipboard_dict[this.clipboard[0]];
            first_line.node_list.unshift(new_node_id);
            this.clipboard_dict[new_node_id].parent = first_line.unique_id;
            if (first_line.node_list.length > 1) {
                if (this.clipboard_dict[first_line.node_list[0]].kind == "text"
                    && this.clipboard_dict[first_line.node_list[1]].kind == "text") {
                    target_dict = this._mergeTextNodes(0, 1, first_line.unique_id, this.clipboard_dict, false)
                }
            }
        }
        return target_dict
    },

   _insertClipboard(text_id, cursor_position, portal_root, target_dict=null) {
        if (!this.clipboard || this.clipboard.length == 0) {
            return
        }
        if (target_dict == null) {
            target_dict = this.state.node_dict;
        }

        target_dict = this._splitTextAtPosition(text_id, cursor_position, target_dict);
        let first_text_id, second_text_id;
        let parent_line = target_dict[target_dict[text_id].parent];
        if (cursor_position == 0) {
            second_text_id = text_id;
            first_text_id = parent_line.node_list[target_dict[text_id].position - 1]
        }
        else {
            first_text_id = text_id
            second_text_id = parent_line.node_list[target_dict[text_id].position + 1]
        }

        let temp_node_id;
        [temp_node_id, this.clipboard_dict] = this._newDataBoxNode(this.clipboard, false, this.clipboard_dict)
        let focus_type;
        let focus_text_pos;
        let focus_node_id;
        if (this.clipboard.length == 1) {
            if (this._getNthLine(temp_node_id, 0, this.clipboard_dict).node_list.length == 1) {
                let inserted_node = this.clipboard_dict[this._getln(temp_node_id, 0, 0, this.clipboard_dict)];
                if (inserted_node.kind == "text") {
                    focus_type = "text";
                    let nodeA = target_dict[text_id];
                    if (nodeA.kind == "text") {
                        focus_node_id = nodeA.unique_id;
                        focus_text_pos = nodeA.the_text.length + inserted_node.the_text.length
                    }
                    else {
                        focus_node_id = inserted_node.unique_id;
                        focus_text_pos = inserted_node.the_text.length
                    }
                }
                else {
                    focus_type = "box";
                    focus_node_id = inserted_node.unique_id
                }
            }
            else {
                let last_inserted_node = this.clipboard_dict[this._getln(temp_node_id, 0, -1, this.clipboard_dict)];
                if (last_inserted_node.kind == "text") {
                    focus_type = "text";
                    focus_node_id = last_inserted_node.unique_id;
                    focus_text_pos =last_inserted_node.the_text.length
                }
                else {
                    focus_type = "box";
                    focus_node_id = last_inserted_node.unique_id
                }
            }
            let lin_id = this.clipboard[0];
            let updated_line_id;
            [updated_line_id, target_dict] = this._cloneLine(lin_id, this.clipboard_dict, target_dict, true)
            let nodeA = target_dict[first_text_id];
            let targetLine = target_dict[nodeA.parent];
            target_dict = this._insertNodesAndReturn(target_dict[updated_line_id].node_list, targetLine.unique_id, nodeA.position + 1, target_dict);
        }
        else {
            let updated_line_list = [];
            for (let lin_id of this.clipboard) {
                let updated_line_id;
                [updated_line_id, target_dict] = this._cloneLine(lin_id, this.clipboard_dict, target_dict, true)
                updated_line_list.push(updated_line_id)
            }
            let nodeA = target_dict[first_text_id];
            let targetLine = target_dict[nodeA.parent];
            let nodeB = target_dict[second_text_id];
            target_dict = this._splitLineAndReturn(targetLine.unique_id, nodeB.position, target_dict);

            target_dict = this._insertNodesAndReturn(target_dict[updated_line_list[0]].node_list, targetLine.unique_id,
                targetLine.node_list.length, target_dict);
            let last_inserted_node = target_dict[this._getln(temp_node_id, -1, -1, this.clipboard_dict)]
            if (last_inserted_node.kind == "text") {
                    focus_type = "text";
                    focus_node_id = last_inserted_node.unique_id;
                    focus_text_pos =last_inserted_node.the_text.length
            }
            else {
                focus_type = "box";
                focus_node_id = last_inserted_node.unique_id
            }
            nodeA = target_dict[first_text_id];
            targetLine = target_dict[nodeA.parent];
            let targetBox = target_dict[targetLine.parent];
            let targetLine2 = target_dict[targetBox.line_list[targetLine.position + 1]];
            target_dict = this._insertNodesAndReturn(target_dict[_.last(updated_line_list)].node_list, targetLine2.unique_id, 0, target_dict)
            if (this.clipboard.length > 2) {
                targetBox = target_dict[targetLine.parent];
                target_dict = this.insertLinesAndReturn(updated_line_list.slice(1, this.clipboard.length - 1), targetBox.unique_id,
                    targetLine.position + 1, target_dict)
            }
        }
        let self = this;
        this._clearSelected(target_dict, true, positionCursor, true);

        function positionCursor(){
            if (focus_type == "text") {
                self._changeNode(focus_node_id, "setFocus", [portal_root, focus_text_pos], null, target_dict)
            }
            else  {
                self._positionAfterBox(focus_node_id, target_dict)
            }

        }
    },

    _startNewClipboardLine(clear=false){
        let new_line1_id, new_line2_id;
        [new_line1_id, this.clipboard_dict] = this._newLineNode();
        if (clear) {
            [new_line2_id, this.clipboard_dict] = this._newLineNode();
            this.clipboard = [new_line1_id, new_line2_id];
        }
        else {
            this.clipboard.unshift(new_line1_id)
        }
    },

    _setSelected(id_list) {
        this._clearSelected(null, true,()=>{
            let new_base = this.state.base_node;
            for (let uid of id_list) {
                new_base = this.changeNodeAndReturn(uid, "selected", true, new_base)
            }
            this.setState({base_node: new_base})
        })
    },
    _cutSelected() {
        let target_dict = this.state.node_dict;
        if (this.state.boxer_selected) {
            this._deleteBoxerSelection();
            return
        }
        let sel = window.getSelection();
        let the_text = sel.toString();
        if (!the_text) {
            return
        }
        let text_id, line_id;
        this.clipboard_dict = {};
        [text_id, this.clipboard_dict] = this._newTextNode(the_text, this.clipboard_dict);
        [line_id, this.clipboard_dict] = this._newLineNode([newTextNode], this.clipboard_dict);
        this.clipboard = [line_id];
        let tnode = target_dict[sel.anchorNode.parentNode.id];
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
            setFocus: [this.last_focus_portal_root, start]
        }
        this._changeNodeMulti(tnode.unique_id, val_dict, target_dict)
    },

    _clearSelected(target_dict=null, update=true, callback=null, force=true) {

        if (!this.state.boxer_selected && !force) {
            return
        }
        if (!target_dict) {
            target_dict = this.state.node_dict;
        }

        for (let nid in target_dict) {
            if (target_dict[nid].selected) {
                target_dict = this.changeNodeAndReturn(nid, "selected", false, target_dict)
            }
        }
        if (update) {
            this.setState({node_dict: target_dict, boxer_selected: false}, callback)
        } else {
            return target_dict
        }
    },
    _copySelected() {
        if (this.state.boxer_selected) {
            this._copyBoxerSelection();
            return
        }
        let the_text = window.getSelection().toString();
        if (!the_text) {
            return
        }
        this._clearClipboard();
        let newTextId, newLineId;
        [newTextId, this.clipboard_dict] = this._newTextNode(the_text, this.clipboard_dict);
        [newLineId, this.clipboard_dict] = this._newLineNode([newTextId], this.clipboard_dict);
        this.clipboard = [newLineId];
        this._clearSelected()
    },

    _copyBoxerSelection() {
        if (!this.state.boxer_selected) {
            return
        }
        this._clearClipboard();
        let target_dict = this.state.node_dict;
        let select_parent_node = target_dict[this.state.select_parent];
        if (select_parent_node.kind == "line") {
            let copied_node_ids = select_parent_node.node_list.slice(this.state.select_range[0],
                this.state.select_range[1] + 1);
            let _discard, new_line_id;
            for (let ndid of copied_node_ids) {
                [_discard, this.clipboard_dict] = this._cloneNode(ndid, target_dict, this.clipboard_dict, false)
            }
            [new_line_id, this.clipboard_dict] = this._newLineNode(copied_node_ids, this.clipboard_dict)
            this.clipboard = [new_line_id]
        }
        else {
            let copied_line_ids = select_parent_node.line_list.slice(this.state.select_range[0],
                this.state.select_range[1] + 1);
            let _discard;
            for (let lin_id of copied_line_ids) {
                [_discard, this.clipboard_dict] = this._cloneLine(lin_id, target_dict, this.clipboard_dict, false)
            }
            this.clipboard = copied_line_ids;
        }
        this._clearSelected()
    },


    _deleteBoxerSelection() {
        if (!this.state.boxer_selected) {
            return
        }
        this._clearClipboard();
        let target_dict = this.state.node_dict;
        let select_parent_node = target_dict[this.state.select_parent];
        let num_to_delete = this.state.select_range[1] - this.state.select_range[0] + 1;
        if (select_parent_node.kind == "line") {
            let start_spot = this.state.select_range[0];
            let deleted_node_ids = select_parent_node.node_list.slice(start_spot, num_to_delete);
            for (let ndid of deleted_node_ids) {
                [_discard, this.clipboard_dict] = this._cloneNode(ndid, target_dict, this.clipboard_dict, false)
            }
            let new_line_id;
            [new_line_id, this.clipboard_dict] = this._newLineNode(deleted_node_ids, this.clipboard_dict)
            this.clipboard = [new_line_id]
            for (let ndid of deleted_node_ids) {
                target_dict = this._removeNodeAndReturn(ndid, target_dict, true)
            }
            target_dict = this._healLine(select_parent_node.unique_id, false, target_dict);
            let focus_node_id;
            if (start_spot >= select_parent_node.node_list.length) {
                focus_node_id= select_parent_node.node_list[select_parent_node.node_list.length - 1];
                target_dict = this.changeNodeAndReturn(focus_node_id, "setFocus",
                    [this.last_focus_portal_root, target_dict[focus_node_id].the_text.length],
                    target_dict);
            }
            else if (select_parent_node.node_list[start_spot].kind != "text") {
                focus_node_id = select_parent_node.node_list[start_spot + 1];
                target_dict = this.changeNodeAndReturn(focus_node_id, "setFocus",
                    [this.last_focus_portal_root, 0],
                    target_dict);

            }
            else {
                focus_node_id = select_parent_node.node_list[start_spot];
                target_dict = this.changeNodeAndReturn(focus_node_id, "setFocus",
                    [this.last_focus_portal_root, target_dict[focus_node_id].the_text.length],
                    target_dict);
            }
            this.setState({node_dict: target_dict})

        }
        else {
            let deleted_line_ids = select_parent_node.line_list.splice(this.state.select_range[0], num_to_delete);
            for (let line_id of deleted_line_ids) {
                [_discard, this.clipboard_dict] = this._cloneLine(line_id, target_dict, this.clipboard_dict, false)
            }
            this.clipboard = deleted_line_ids;
            let focus_node;
            let focus_line;
            for (let line_id of deleted_line_ids) {
                target_dict = this._removeLineAndReturn(line_id, target_dict, true)
            }
            if (target_dict[this.state.select_parent].line_list.length == 0) {
                let new_line_id;
                [new_line_id, target_dict] = this._newLineNode([], target_dict);
                target_dict = this._changeNodeMultiAndReturn(new_line_id,
                    {parent: this.state.select_parent, position: 0}, target_dict);

                target_dict = this.changeNodeAndReturn(this.state.select, "line_list",
                    [new_line_id], target_dict)

                focus_node_id = target_dict[new_line_id].node_list[0];
                target_dict = this.changeNodeAndReturn(focus_node_id, "setFocus", [this.last_focus_portal_root, 0])
            }
            if (this.state.select_range[0] >= target_dict[this.state.select_parent].line_list.length) {
                let focus_line_id = target_dict[this.state.select_parent].line_list[this.state.select_range[0] - 1];
                let focus_node_id = _.last(target_dict[focus_line_id].node_list);
                target_dict = this.changeNodeAndReturn(focus_node_id, "setFocus",
                    [this.last_focus_portal_root, focus_node.the_text.length])
                focus_node.setFocus = [this.last_focus_portal_root, target_dict[focus_node_id].the_text.length]
            }
            else {
                let focus_line_id = target_dict[this.state.select_parent].line_list[this.state.select_range[0]];
                focus_node_id = target_dict[focus_line_id].node_list[0];
                target_dict = this.changeNodeAndReturn(focus_node_id, "setFocus", [this.last_focus_portal_root, 0])
            }
            for (let lin_id of target_dict[this.state.select_parent].line_list) {
                target_dict = this._healLine(lin_id, true, target_dict);
            }
             this.setState({node_dict: target_dict})
        }
    },


    _selectSpan(start_id, end_id) {
        let target_dict = this.state.node_dict;
        let start_parent_ids = this._findParents(start_id, target_dict);
        let end_parent_ids = this._findParents(end_id, target_dict);
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
        let start_parent = target_dict[start_parent_id];
        let end_parent = target_dict[end_parent_id];
        if (start_parent.position > end_parent.position) {
            range = [end_parent.position, start_parent.position]
        }
        else {
            range = [start_parent.position, end_parent.position]
        }
        let cp = target_dict[common_parent];
        let nd_list;
        if (container_kinds.includes(cp.kind)) {
            nd_list = cp.line_list
        }
        else {
            nd_list = cp.node_list
        }
        for (let i = range[0]; i<=range[1]; ++i) {
            target_dict = this._selectChildren(nd_list[i], false, target_dict)
        }
        this.setState({
            boxer_selected: true,
            select_parent: common_parent,
            select_range: range,
            node_dict: target_dict
        })
    },


}