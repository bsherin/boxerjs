import {_getMatchingNode} from "./mutators.js";
import {container_kinds} from "./shared_consts.js";
import _ from "lodash";

export {copySelectMixin}

let copySelectMixin = {

    _clearClipboard() {
        this.clipboard = []
    },

    _selectChildren(node) {
        node.selected = true;
        this._changeNode(node.unique_id, "selected", true)
        if (node.kind == "line") {
            for (let child of node.node_list) {
                this._selectChildren(child)
            }
        }
        else if (container_kinds.includes(node.kind)) {
            for (let child of node.line_list) {
                this._selectChildren(child)
            }
            if (node.closetLine) {
                this._selectChildren(node.closetLine)
            }
        }
    },

    _addToClipboardStart(new_node_id, clear=false, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
        if (clear) {
            let new_line;
            [new_line, target_dict] = this._newLineNode([new_node_id]);
            this.clipboard = [new_line];
        }
        else {
            let first_line = target_dict[this.clipboard[0]];
            first_line.node_list.unshift(new_node_id);
            target_dict = this.changeNode(new_node_id, "parent", first_line.unique_id);
            if (first_line.node_list.length > 1) {
                if (first_line.node_list[0].kind == "text" && first_line.node_list[1].kind == "text") {
                    target_dict = this._mergeTextNodes(0, 1, first_line.unique_id, target_dict)
                }
            }
        }
        return target_dict
    },

   _insertClipboard(text_id, cursor_position, portal_root, target_dict=null, update=true) {
        if (!this.clipboard || this.clipboard.length == 0) {
            return
        }
        if (target_dict == null) {
            target_dict = this.state.node_dict;
        }

        target_dict = this._splitTextAtPosition(text_id, cursor_position, target_dict, false);
        let nodeA = target_dict[text_id];
        let targetLine = target_dict[nodeA.parent];
        let nodeB = targetLine.node_list[nodeA.position + 1];

        let updated_lines = _.cloneDeep(this.clipboard);
        this._updateIds(updated_lines);
        let focus_type;
        let focus_text_pos;
        let focus_node_id;
        if (updated_lines.length == 1) {
            if (updated_lines[0].node_list.length == 1) {
                let inserted_node = updated_lines[0].node_list[0];
                if (inserted_node.kind == "text") {
                    focus_type = "text";
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
                let last_inserted_node = _.last(updated_lines[0].node_list);
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
            new_base = this._insertNodesAndReturn(updated_lines[0].node_list, targetLine.unique_id, nodeA.position + 1, new_base)
        }
        else {
            let nodeB = targetLine.node_list[nodeA.position + 1];
            new_base = this._splitLineAndReturn(targetLine.unique_id, nodeB.position, new_base);
            targetLine = _getMatchingNode(targetLine.unique_id, new_base);
            new_base = this._insertNodesAndReturn(updated_lines[0].node_list, targetLine.unique_id,
                targetLine.node_list.length, new_base);
            let last_inserted_node = _.last(_.last(updated_lines).node_list);
            if (last_inserted_node.kind == "text") {
                    focus_type = "text";
                    focus_node_id = last_inserted_node.unique_id;
                    focus_text_pos =last_inserted_node.the_text.length
            }
            else {
                focus_type = "box";
                focus_node_id = last_inserted_node.unique_id
            }

            let targetBox = _getMatchingNode(targetLine.parent, new_base);
            let targetLine2 = targetBox.line_list[targetLine.position + 1];
            new_base = this._insertNodesAndReturn(_.last(updated_lines).node_list, targetLine2.unique_id, 0, new_base)
            if (updated_lines.length > 2) {
                new_base = this.insertLinesAndReturn(updated_lines.slice(1, updated_lines.length - 1), targetBox.unique_id,
                    targetLine.position + 1, new_base)
            }
        }
        let self = this;
        if (update) {
            this._clearSelected(null, new_base, null, true);
            this.setState({base_node: new_base}, positionCursor)
        }
        else{
            positionCursor()
        }

        function positionCursor(){
            if (focus_type == "text") {
                self._changeNode(focus_node_id, "setFocus", [portal_root, focus_text_pos])
            }
            else  {
                self._positionAfterBox(focus_node_id)
            }

        }
    },

    _startNewClipboardLine(clear=false, target_dict){
        let new_line1_id;
        target_dict = this.state.node_dict;
        [new_line1_id, target_dict] = this._newLineNode();
        if (clear) {
            [new_line1_id, target_dict] = this._newLineNode();
            this.clipboard = [new_line1_id, new_line2_id];
        }
        else {
            this.clipboard.unshift(new_line1)
        }
        return target_dict
    },

    _setSelected(id_list) {
        this._clearSelected(null, null,()=>{
            let new_base = this.state.base_node;
            for (let uid of id_list) {
                new_base = this.changeNodeAndReturn(uid, "selected", true)
            }
            this.setState({base_node: new_base})
        })
    },
    _cutSelected() {
        if (this.state.boxer_selected) {
            this._deleteBoxerSelection();
            return
        }
        let sel = window.getSelection();
        let the_text = sel.toString();
        if (!the_text) {
            return
        }

        let newTextNode = this._newTextNode(the_text);
        this.clipboard = [this._newLineNode([newTextNode])];
        let base_node = this.state.base_node;
        let tnode = _getMatchingNode(sel.anchorNode.parentNode.id, base_node);
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
        this._changeNodeMulti(tnode.unique_id, val_dict)
    },

    _clearSelected(node=null, new_base=null, callback=null, force=true) {
        if (!this.state.boxer_selected && !force) {
            return
        }
        let do_update = false;
        if (new_base == null) {
            new_base = this.state.base_node;
            do_update = true;
        }
        if (node == null) {
            node = new_base
        }
        if (node.closetLine) {
            node.closetLine.selected = false;
            for (let nd of node.closetLine.node_list) {
                if (nd.selected ) {
                    new_base = this.changeNodeAndReturn(nd.unique_id, "selected", false, new_base)
                }
                if (container_kinds.includes(nd.kind) || nd.kind == "line") {
                    new_base = this._clearSelected(nd, new_base, null, true)
                }
            }
        }

        if (node.line_list.length == 0) {
            return
        }
        for (let lin of node.line_list) {
            if (lin.selected ) {
                new_base = this.changeNodeAndReturn(lin.unique_id, "selected", false, new_base)
            }
            for (let nd of lin.node_list) {
                if (nd.selected ) {
                    new_base = this.changeNodeAndReturn(nd.unique_id, "selected", false, new_base)
                }
                if (container_kinds.includes(nd.kind) || nd.kind == "line") {
                   new_base = this._clearSelected(nd, new_base, null, true)
                }
            }
        }
        if (do_update) {
            this.setState({base_node: new_base, boxer_selected: false}, callback)
        }
        else {
            return new_base
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
        let newTextNode = this._newTextNode(the_text);
        this.clipboard = [this._newLineNode([newTextNode])]
    },

    _copyBoxerSelection() {
        if (!this.state.boxer_selected) {
            return
        }
        let select_parent_node = _getMatchingNode(this.state.select_parent, this.state.base_node);
        if (select_parent_node.kind == "line") {
            let copied_nodes = select_parent_node.node_list.slice(this.state.select_range[0],
                this.state.select_range[1] + 1);
            this.clipboard = [this._newLineNode(_.cloneDeep(copied_nodes))]
        }
        else {
            let copied_lines = select_parent_node.line_list.slice(this.state.select_range[0],
                this.state.select_range[1] + 1);
            this.clipboard = copied_lines;
        }
        this._clearSelected()
    },

    _deleteBoxerSelection() {
        if (!this.state.boxer_selected) {
            return
        }
        let select_parent_node = _.cloneDeep(_getMatchingNode(this.state.select_parent, this.state.base_node));
        let num_to_delete = this.state.select_range[1] - this.state.select_range[0] + 1;
        if (select_parent_node.kind == "line") {
            let start_spot = this.state.select_range[0];
            let deleted_nodes = select_parent_node.node_list.splice(start_spot, num_to_delete);
            this.clipboard = [this._newLineNode(_.cloneDeep(deleted_nodes))];
            this._healLine(select_parent_node);
            let focus_node;
            if (start_spot >= select_parent_node.node_list.length) {
                focus_node = select_parent_node.node_list[select_parent_node.node_list.length - 1];
                focus_node.setFocus = [this.last_focus_portal_root, focus_node.the_text.length]
            }
            else if (select_parent_node.node_list[start_spot].kind != "text") {
                focus_node = select_parent_node.node_list[start_spot + 1];
                focus_node.setFocus = [this.last_focus_portal_root, 0]

            }
            else {
                focus_node = select_parent_node.node_list[start_spot];
                focus_node.setFocus = [this.last_focus_portal_root, focus_node.the_text.length]
            }
            this._changeNode(select_parent_node.unique_id, "node_list", select_parent_node.node_list);

        }
        else {
            this.clipboard = select_parent_node.line_list.splice(this.state.select_range[0], num_to_delete);
            let focus_node;
            let focus_line;
            this._renumberNodes(select_parent_node.line_list);
            if (select_parent_node.line_list.length == 0) {
                let new_line = this._newLineNode();
                new_line.parent = select_parent_node.unique_id;
                new_line.position = 0;
                select_parent_node.line_list = [new_line];
                focus_node = new_line.node_list[0];
                focus_node.setFocus = [this.last_focus_portal_root, 0];
            }
            if (this.state.select_range[0] >= select_parent_node.line_list.length) {
                focus_line = select_parent_node.line_list[this.state.select_range[0] - 1];
                focus_node = focus_line.node_list[focus_line.node_list.length - 1];
                focus_node.setFocus = [this.last_focus_portal_root, focus_node.the_text.length]
            }
            else {
                focus_line = select_parent_node.line_list[this.state.select_range[0]];
                focus_node = focus_line.node_list[0];
                focus_node.setFocus = [this.last_focus_portal_root, 0]
            }
            for (let lin of select_parent_node.line_list) {
                this._healLine(lin, true);
            }
            this._changeNode(select_parent_node.unique_id, "line_list", select_parent_node.line_list);
        }
    },


    _selectSpan(start_id, end_id) {
        let base_node = this.state.base_node;
        let start_parents = this._findParents(start_id, base_node);
        let end_parents = this._findParents(end_id, base_node);
        let common_parent = null;
        for (let par of start_parents) {
            if (end_parents.includes(par)) {
                common_parent = par;
                break;
            }
        }
        if (!common_parent) {
            return null
        }
        let start_parent_id = start_parents[start_parents.indexOf(common_parent) - 1];
        let end_parent_id = end_parents[end_parents.indexOf(common_parent) - 1];
        let range;
        let start_parent = _getMatchingNode(start_parent_id, base_node);
        let end_parent = _getMatchingNode(end_parent_id, base_node);
        if (start_parent.position > end_parent.position) {
            range = [end_parent.position, start_parent.position]
        }
        else {
            range = [start_parent.position, end_parent.position]
        }
        let cp = _getMatchingNode(common_parent, base_node);
        let nd_list;
        if (container_kinds.includes(cp.kind)) {
            nd_list = cp.line_list
        }
        else {
            nd_list = cp.node_list
        }
        for (let i = range[0]; i<=range[1]; ++i) {
            this._selectChildren(nd_list[i])
        }
        this.setState({
            boxer_selected: true,
            select_parent: common_parent,
            select_range: range
        })
    },


}