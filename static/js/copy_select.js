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

    _addToClipboardStart(raw_new_node, clear=false) {
        let new_node = _.cloneDeep(raw_new_node);
        if (clear) {
            let new_line = this._newLineNode([new_node]);
            this.clipboard = [new_line];
        }
        else {
            let first_line = this.clipboard[0];
            first_line.node_list.unshift(new_node);
            new_node.parent = first_line.unique_id;
            if (first_line.node_list.length > 1) {
                if (first_line.node_list[0].kind == "text" && first_line.node_list[1].kind == "text") {
                    this._mergeTextNodes(0, 1, first_line.node_list)
                }
            }
        }
    },

    _startNewClipboardLine(clear=false){
        let new_line1 = this._newLineNode();
        if (clear) {
            let new_line2 = this._newLineNode();
            this.clipboard = [new_line1, new_line2];
        }
        else {
            this.clipboard.unshift(new_line1)
        }
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
     _healLine(line_pointer, recursive=false) {
        let done = false;

        // Merge adjacent text nodes
        while (!done) {
            this._renumberNodes(line_pointer.node_list);
            done = true;
            for (let i = 0; i < line_pointer.node_list.length - 1; ++i) {
                if ((line_pointer.node_list[i].kind == "text") && (line_pointer.node_list[i + 1].kind == "text")) {
                    this._mergeTextNodes(i, i + 1, line_pointer.node_list);
                    done = false;
                    break
                }
            }
        }
        // Insert text node at start if necessary
        if (line_pointer.node_list[0].kind != "text") {
            let new_node = this._newTextNode("");
            line_pointer.node_list.splice(0, 0, new_node);
            new_node.parent = line_pointer.unique_id;
            this._renumberNodes(line_pointer.node_list);
        }
        // Insert text node at end if necessary
        if (_.last(line_pointer.node_list).kind != "text") {
            let new_node = this._newTextNode("");
            line_pointer.node_list.push(new_node);
            new_node.parent = line_pointer.unique_id;
            this._renumberNodes(line_pointer.node_list);
        }
        done = false;

        // Insert text nodes between adjacent boxes
        while (!done) {
            this._renumberNodes(line_pointer.node_list);
            done = true;
            for (let i = 0; i < line_pointer.node_list.length - 1; ++i) {
                if ((line_pointer.node_list[i].kind != "text") && (line_pointer.node_list[i + 1].kind != "text")) {
                    let new_node = this._newTextNode("");
                    line_pointer.node_list.splice(i + 1, 0, new_node);
                    new_node.parent = line_pointer.unique_id;
                    done = false;
                    break
                }
            }
        }

        // Make sure all child notes point to the parent
        for (let node of line_pointer.node_list) {
            node.parent = line_pointer.unique_id;
        }
        if (recursive) {
            for (let node of line_pointer.node_list) {
                this._healStructure(node, line_pointer)

            }
        }
    }

}