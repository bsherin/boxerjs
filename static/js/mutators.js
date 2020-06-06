import update from "immutability-helper";
import _ from "lodash";
import {container_kinds, text_kinds} from "./shared_consts.js";
import {repairCopiedDrawnComponents} from "./eval_space.js";

export {mutatorMixin, _getMatchingNode, _getMatchingNodePath}

let mutatorMixin = {

    _buildChangeQuery(startingMatchPath, param_name, new_val, base_id) {
        let matchPath = _.cloneDeep(startingMatchPath)
        let fnode = matchPath.shift()
        let query;
        if (fnode.unique_id == base_id) {
            if (matchPath.length == 0) {
                query = {[param_name]: {$set: new_val}}
                }
            else {
                query = this._buildChangeQuery(matchPath, param_name, new_val, base_id)
            }
        }
        else if (fnode.kind == "line") {
            if (!fnode.amCloset) {
                if (matchPath.length == 0) {
                    query = {line_list: {[fnode.position]: {[param_name]: {$set: new_val}}}}
                }
                else {
                    query = {line_list: {[fnode.position]: this._buildChangeQuery(matchPath, param_name, new_val, base_id)}}
                }
            }
            else {
                if (matchPath.length == 0) {
                    query = {closetLine: {[param_name]: {$set: new_val}}}
                }
                else {
                    query = {closetLine: this._buildChangeQuery(matchPath, param_name, new_val, base_id)};
                }
            }
        }
        else if (container_kinds.includes(fnode.kind) || text_kinds.includes(fnode.kind)) {
            if (matchPath.length == 0) {
                query = {node_list: {[fnode.position]: {[param_name]: {$set: new_val}}}}
            }
            else {
                query = {node_list: {[fnode.position]: this._buildChangeQuery(matchPath, param_name, new_val, base_id)}}
            }

        }
        else if (fnode.kind == "port") {
            query = {node_list: {[fnode.position]: {[param_name]: {$set: new_val}}}}
        }
        else {
            query = null
        }
        return query
    },

    _buildReplaceLineQuery(matchPathToParent, new_line, base_id) {
        let fnode = matchPathToParent.shift()
        let query;
        if (fnode.unique_id == base_id) {
            if (matchPathToParent.length == 0) {
                query =  {line_list: {$splice: [[new_line.position, 1, new_line]]}}
            }
            else {
                query = this._buildReplaceLineQuery(matchPathToParent, new_line, base_id)
            }
        }
        else if (fnode.kind == "line") {
            if (!fnode.amCloset) {
                query = {line_list: {[fnode.position]: this._buildReplaceLineQuery(matchPathToParent, new_line, base_id)}}

            }
            else {
                query = {closetLine: this._buildReplaceLineQuery(matchPathToParent, new_line, base_id)};
            }
        }
        else if (container_kinds.includes(fnode.kind) || text_kinds.includes(fnode.kind)) {
            if (matchPathToParent.length == 0) {
                query = {node_list: {[fnode.position]: {line_list: {$splice: [[new_line.position, 1, new_line]]}}}}
            }
            else {
                query = {node_list: {[fnode.position]: this._buildReplaceLineQuery(matchPathToParent, new_line, base_id)}}
            }

        }
        else {
            return null
        }
        return query
    },

    // This doesn't seem to be used currently
    _buildReplaceNodeQuery(matchPathToParent, new_node, base_id) {
        let fnode = matchPathToParent.shift()
        let query;
        if (fnode.unique_id == base_id) {
            query = this._buildReplaceLineQuery(matchPathToParent, new_line, base_id)
        }
        else if (fnode.kind == "line") {
            if (!fnode.amCloset) {
                if (matchPathToParent.length == 0) {
                    query = {line_list: {[fnode.position]: {node_list: {$splice: [[new_node.position, 1, new_node]]}}}}
                }
                else {
                    query = {line_list: {[fnode.position]: this._buildReplaceNodeQuery(matchPathToParent, new_node, base_id)}}
                }
            }
            else {
                if (matchPathToParent.length == 0) {
                    query = {closetLine: {node_list: {$splice: [[new_node.position, 1, new_node]]}}}
                }
                else {
                    query = {closetLine: this._buildReplaceLineQuery(matchPathToParent, new_node, base_id)};
                }

            }
        }
        else if (container_kinds.includes(fnode.kind) || text_kinds.includes(fnode.kind)) {
            query = {node_list: {[fnode.position]: this._buildReplaceLineQuery(matchPathToParent, new_node, base_id)}}
        }
        else {
            return null
        }
        return query
    },

    _changeNode(uid, param_name, new_val, callback=null) {
        let newBase = this.changeNodeAndReturn(uid, param_name, new_val)
        this.setState({base_node: newBase}, callback)
    },

    changeNodeAndReturn(uid, param_name, input_val, new_base=null) {
         let new_val = _.cloneDeep(input_val)
         repairCopiedDrawnComponents(new_val, true);
         if (!new_base) {
            new_base = this.state.base_node
         }
         let mpath = _getMatchingNodePath(uid, [], new_base);

         if (mpath) {
             let query = this._buildChangeQuery(mpath, param_name, new_val, new_base.unique_id);
             let newBase = update(new_base, query)
             return newBase
         }
         return null
    },

    _changeNodeMulti(uid, valdict, callback=null) {
         let mpath = _getMatchingNodePath(uid, [], this.state.base_node);

         if (mpath) {
             let newBase = this.state.base_node
             for (let param in valdict) {
                 let new_val = val_dict["param"]
                 repairCopiedDrawnComponents(new_val, true);
                 let query = this._buildChangeQuery(mpath, param, new_val, newBase.unique_id);
                 newBase = update(newBase, query)
             }
             this.setState({base_node: newBase})
         }
    },

    _insertNodeIh(new_node, line_id, position, callback=null) {
        let newBase = this._insertNodeAndReturn(new_node, line_id, position, this.state.base_node, true)
        this.setState({base_node: newBase}, callback)
    },

    _insertNodeAndReturn(new_node, line_id, position, base, heal_line=false) {
        let parent_line = _.cloneDeep(_getMatchingNode(line_id, base));
        new_node.parent= line_id;
        parent_line.node_list.splice(position, 0, new_node);
        if (heal_line) {
            this._healLine(parent_line);
        }
        else {
            this._renumberNodes(parent_line.node_list)
        }
        let newBase = this.changeNodeAndReturn(line_id, "node_list", parent_line.node_list)
        return newBase
    },

    _insertNodesAndReturn(new_nodes, line_id, position, base) {

        let parent_line = _.cloneDeep(_getMatchingNode(line_id, base));
        for (let node of new_nodes) {
            node.parent = line_id
        }

        parent_line.node_list.splice(position, 0, ...new_nodes);
        this._healLine(parent_line);

        let mpath = _getMatchingNodePath(parent_line.parent, [], base);
        let query = this._buildReplaceLineQuery(mpath, parent_line, base.unique_id)
        let newBase = update(base, query)
        return newBase
    },

    _splitTextAtPosition(text_id, cursor_position, new_base) {

        let mnode = _.cloneDeep(_getMatchingNode(text_id, new_base));
        let new_node;
        if (cursor_position == 0) {
            new_node = this._newTextNode("");
            new_base = this._insertNodeAndReturn(new_node, mnode.parent, mnode.position, new_base)
        }
        else if (cursor_position == mnode.the_text.length) {
            new_node = this._newTextNode("");
            new_base = this._insertNodeAndReturn(new_node, mnode.parent, mnode.position + 1, new_base)
        }
        else {
            let text_split = [mnode.the_text.slice(0, cursor_position), mnode.the_text.slice(cursor_position,)];
            new_node = this._newTextNode(text_split[1]);
            new_base = this.changeNodeAndReturn(text_id, "the_text", text_split[0], new_base)
            new_base = this._insertNodeAndReturn(new_node, mnode.parent, mnode.position + 1, new_base)
        }
        return new_base
    },

    _insertLineAndReturn(new_line, box_id, position, new_base=null) {
        let newBase = this.insertLinesAndReturn([new_line], box_id, position, new_base)
        return newBase
    },

    insertLinesAndReturn(new_lines, boxId, position=0, new_base=null) {
        if (new_base == null) {
            new_base = this.state.base_node;
        }
        let parent_box = _.cloneDeep(_getMatchingNode(boxId, new_base));
        for (let lin of new_lines) {
            lin.parent = boxId
        }
        parent_box.line_list.splice(position, 0, ...new_lines);
        this._renumberNodes(parent_box.line_list);
        let newBase = this.changeNodeAndReturn(parent_box.unique_id, "line_list", parent_box.line_list, new_base)
        return newBase
    },

    _insertClipboard(text_id, cursor_position, portal_root, new_base=null, update=true) {
        if (!this.clipboard || this.clipboard.length == 0) {
            return
        }
        if (new_base == null) {
            new_base = this.state.base_node;
        }

        new_base = this._splitTextAtPosition(text_id, cursor_position, new_base, false);
        let nodeA = _getMatchingNode(text_id, new_base);
        let targetLine = _getMatchingNode(nodeA.parent, new_base);
        let nodeB = targetLine.node_list[nodeA.position + 1];
        let targetBox = _getMatchingNode(targetLine.parent, new_base);

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

    _splitLineAtTextPosition(text_id, cursor_position, portal_root="root",
                             new_base=null, update=true) {
        if (new_base == null) {
            new_base = this.state.base_node;
        }
        new_base = this._splitTextAtPosition(text_id, cursor_position, new_base);
        let mnode = _getMatchingNode(text_id, new_base);
        let pos = mnode.position;
        let linid = mnode.parent;
        let parent_line = _getMatchingNode(linid, new_base);
        let parent_line_pos = parent_line.position;
        new_base = this._splitLineAndReturn(linid, pos + 1, new_base, false);
        let dbox = _getMatchingNode(parent_line.parent, new_base);
        dbox.line_list[parent_line_pos + 1].node_list[0].setFocus = [portal_root, 0];

        if (update) {
            this.setState({base_node: new_base})
        }
    },

    _splitLineAndReturn(line_id, position, new_base=null) {
        if (new_base == null) {
            new_base = this.state.base_node
        }
        let the_line = _.cloneDeep(_getMatchingNode(line_id, new_base));
        let new_node_list = the_line.node_list.slice(position,);
        this._renumberNodes(new_node_list);

        let new_line = this._newLineNode(new_node_list);
        for (let nd of new_node_list) {
            nd.parent = new_line.unique_id
        }
        the_line.node_list = the_line.node_list.slice(0, position);
        new_base = this.changeNodeAndReturn(the_line.unique_id, "node_list", the_line.node_list, new_base);
        new_base = this._insertLineAndReturn(new_line, the_line.parent, the_line.position + 1, new_base);
        return new_base
    },

    _insertBoxInText(kind, text_id, cursor_position, portal_root, new_base=null, update=true, is_doit=false) {
        if (new_base == null) {
            new_base = this.state.base_node;
        }
        new_base = this._splitTextAtPosition(text_id, cursor_position, new_base, false);
        let mnode = _getMatchingNode(text_id, new_base);
        let new_node;
        if (kind == "sprite") {
            let use_svg = false;
            let gbox = this._getContainingGraphicsBox(text_id)
            if (gbox && gbox.kind == "svggraphics") {
                use_svg = true;
            }
            new_node = this._nodeCreators()[kind](use_svg)
        }
        else {
            new_node = this._nodeCreators()[kind]()
        }
        if (["databox", "doitbox"].includes(kind)) {
            new_node.line_list[0].node_list[0].setFocus = [portal_root, 0];
        }
        else if (text_kinds.includes(kind)) {
            new_node.setFocus = [portal_root, 0];
        }
        else if (kind == "port") {
            this._enterPortTargetMode(new_node.unique_id)
        }
        let self = this;
        let newBase = this._insertNodeAndReturn(new_node, mnode.parent, mnode.position + 1, new_base, true);
        this.setState({base_node: newBase}, ()=>{
                 self._clearSelected()
             });
    },
    _removeLineAndReturn(uid, new_base=null) {
        if (new_base == null) {
            new_base = this.state.base_node;
        }
        let mline = _getMatchingNode(uid, new_base);
        let parent_box = _.cloneDeep(_getMatchingNode(mline.parent, new_base));
        parent_box.line_list.splice(mline.position, 1);
        this._renumberNodes(parent_box.line_list);
        let newBase = this.changeNodeAndReturn(parent_box.unique_id, "line_list", parent_box.line_list, new_base);
        return newBase
    },

    _removeNodeAndReturn(uid, new_base=null) {
        if (new_base == null) {
            new_base = this.state.base_node;
        }
        let mnode = _getMatchingNode(uid, new_base);
        let parent_line = _getMatchingNode(mnode.parent, new_base);
        parent_line.node_list.splice(mnode.position, 1);
        this._healLine(parent_line);
        let mpath = _getMatchingNodePath(parent_line.parent, [], base);
        let query = this._buildReplaceLineQuery(mpath, parent_line, new_base.unique_id)
        let newBase = update(new_base, query)
        return newBase
    },

    _removeNodeIh(uid, callback) {
        let mnode = _getMatchingNode(uid, this.state.base_node);
        let parent_line = _.cloneDeep(_getMatchingNode(mnode.parent, this.state.base_node));
        parent_line.node_list.splice(mnode.position, 1);
        this._healLine(parent_line);
        let mpath = _getMatchingNodePath(parent_line.parent, [], this.state.base_node);
        let query = this._buildReplaceLineQuery(mpath, parent_line, this.state.base_node.unique_id)
        let newBase = update(this.state.base_node, query)
        this.setState({base_node: newBase}, callback)
    },


    _deleteToLineEnd(text_id, caret_pos) {
        let new_base = this.state.base_node;
        let mnode = _getMatchingNode(text_id, this.state.base_node);
        let parent_line = _getMatchingNode(mnode.parent, new_base);
        if (caret_pos == 0) {
            if (mnode.position == 0)  {
                this.clipboard = [_.cloneDeep(parent_line)];
                if (parent_line.amCloset) {
                    let newnode = this._newTextNode();
                    newnode.parent = parent_line.unique_id;
                    // parent_line.node_list = [new_node]
                    this._changeNode(parent_line.unique_id, "node_list", [new_node], ()=>{
                        this._clearSelected()
                    })
                }
                else {
                    new_base = this._removeLineAndReturn(parent_line.unique_id, new_base);
                    this.setState({base_node: new_base}, ()=>{
                        this._clearSelected()
                    })
                }
                return
            }
        }
        if (caret_pos < mnode.the_text.length - 1) {
            new_base = this._splitTextAtPosition(text_id, caret_pos, new_base);
        }
        else {
            return
        }
        parent_line = _getMatchingNode(mnode.parent, new_base);
        let deleted_nodes = parent_line.node_list.splice(mnode.position + 1,);
        this.clipboard = [this._newLineNode(deleted_nodes)];
        this.setState({base_node: new_base},()=>{
            this._clearSelected()
        })
    },

    _mergeWithPrecedingLine(second_line, callback=null) {

        let dbox = _.cloneDeep(_getMatchingNode(second_line.parent, this.state.base_node));
        let first_line = dbox.line_list[second_line.position - 1];

        first_line.node_list = first_line.node_list.concat(_.cloneDeep(second_line.node_list));
        this._healLine(first_line);
        dbox.line_list.splice(second_line.position, 1);
        this._renumberNodes(dbox.line_list);
        this._changeNode(dbox.unique_id, "line_list", dbox.line_list, callback)
    },
    _deletePrecedingBox(text_id, clearClipboard=true, portal_root) {
        let mnode = _getMatchingNode(text_id, this.state.base_node);
        let parent_line = _getMatchingNode(mnode.parent, this.state.base_node);
        let focus_node;
        let focus_pos;
        let self = this;
        if (mnode.position == 0) {
            if (!parent_line.amCloset && parent_line.position != 0) {
                let dbox = _getMatchingNode(parent_line.parent, this.state.base_node);
                let first_line = dbox.line_list[parent_line.position - 1];
                let preceding_node = _.last(first_line.node_list);

                if (preceding_node.kind == "text") {
                    focus_node = preceding_node.unique_id;
                    focus_pos = preceding_node.the_text.length
                }
                else {
                    focus_node = text_id;
                    focus_pos = 0
                }
                this._mergeWithPrecedingLine(parent_line, null, true, positionCursor);
                this._startNewClipboardLine(clearClipboard)
            }
        }
        else {
            let preceding_node = parent_line.node_list[mnode.position - 1];
            if ((mnode.position - 2) < 0) {
                focus_node = text_id;
                focus_pos = 0
            }
            else {
                let pre_preceding_node = parent_line.node_list[mnode.position - 2];
                if (pre_preceding_node.kind == "text") {
                    focus_node = pre_preceding_node.unique_id;
                    focus_pos = pre_preceding_node.the_text.length
                }
                else {
                    focus_node = text_id;
                    focus_pos = 0
                }
            }

            if (preceding_node.kind != "text") {
                this._addToClipboardStart(preceding_node, clearClipboard);
                this._removeNodeIh(preceding_node.unique_id, positionCursor)
            }
        }

        function positionCursor(){
            self._changeNode(focus_node, "setFocus", [portal_root, focus_pos])
        }
    },

    _addGraphicsComponent(uid, the_comp, callback=null) {
        let mnode = _getMatchingNode(uid, this.state.base_node);
        let new_drawn_components = [...mnode.drawn_components, the_comp];
        this._changeNode(mnode.unique_id, "drawn_components", new_drawn_components, callback)
    },

    _setSpriteParams(uid, pdict, callback=null) {
        let mnode = _getMatchingNode(uid, this.state.base_node);
        let vnode = _getMatchingNode(uid, window.virtualNodeTree)
        let new_base = this.state.base_node
        for (let lin of mnode.line_list) {
            for (let nd of lin.node_list) {
                if (nd.name && pdict.hasOwnProperty(nd.name)) {
                    new_base = this.changeNodeAndReturn(nd.line_list[0].node_list[0].unique_id, "the_text", String(pdict[nd.name]), new_base)
                }
            }
        }
        if (vnode) {
            for (let lin of vnode.line_list) {
                for (let nd of lin.node_list) {
                    if (nd.name && pdict.hasOwnProperty(nd.name)) {
                        nd.line_list[0].node_list[0].the_text = String(pdict[nd.name])
                    }
                }
            }
        }
        for (let nd of mnode.closetLine.node_list) {
            if (nd.name && pdict.hasOwnProperty(nd.name)) {
                new_base = this.changeNodeAndReturn(nd.line_list[0].node_list[0].unique_id, "the_text", String(pdict[nd.name]), new_base)
            }
        }
        if (vnode) {
            for (let nd of vnode.closetLine.node_list) {
                if (nd.name && pdict.hasOwnProperty(nd.name)) {
                    nd.line_list[0].node_list[0].the_text = String(pdict[nd.name])
                }
            }
        }
        this.setState({base_node: new_base}, callback)
    },
     _zoomBox(uid) {
        let newBase = this.changeNodeAndReturn(uid, "am_zoomed", true);
        this.setState({base_node: newBase, zoomed_node_id: uid})
    },
    _unzoomBox(uid) {
        let mnode = _getMatchingNode(uid, this.state.base_node);
        if (mnode.parent == null) {
            return
        }

        let new_base = this.changeNodeAndReturn(uid, "am_zoomed", false);

        let found = false;
        while (!found) {
            let parent_id = mnode.parent;
            if (parent_id == null) {
                found = true
            }
            let parent_line = _getMatchingNode(parent_id, this.state.base_node);
            mnode = _getMatchingNode(parent_line.parent, this.state.base_node);
            if (mnode.am_zoomed) {
                found = true
            }
        }

        this.setState({base_node: new_base, zoomed_node_id: mnode.unique_id});
    },

    _focusName(uid=null, box_id=null, portal_root="root") {
        if (box_id == null) {
            if (uid == null) {
                uid = document.activeElement.id
            }
            let mnode = _getMatchingNode(uid, this.state.base_node);
            if (mnode.kind == "jsbox") {
                box_id = mnode.unique_id
            }
            else {
                let line_id = mnode.parent;
                box_id = this._getParentId(line_id);
            }
        }

        let currentName = _getMatchingNode(box_id, this.state.base_node).name;
        let self = this;
        if (currentName == null) {
            this._changeNode(box_id, "name", "", doFocus)
        }
        else {
            doFocus()
        }

        function doFocus() {
            self._changeNode(box_id, "focusName", portal_root)
        }
    },

    _healStructure(start_node, parent_node, parent_id=null) {
        if (start_node.kind.includes("turtle")) {
            let new_turtlebox = this._newTurtleBox();
            new_turtlebox.parent = start_node.unique_id;
            parent_node.node_list.splice(start_node.position, 1, new_turtlebox);
            return
        }
        this._addMissingParams(start_node);
        if (parent_id) {
            start_node.parent = parent_id
        }
        if (start_node.kind == "line") {
            this._healLine(start_node, true)
        }
        else if (container_kinds.includes(start_node.kind)) {
            for (let lin of start_node.line_list) {
                // noinspection JSPrimitiveTypeWrapperUsage
                lin.parent = start_node.unique_id;
                this._healStructure(lin, start_node)
            }
            this._renumberNodes(start_node.line_list);
            if (start_node.closetLine) {
                start_node.closetLine.parent = start_node.unique_id;
                start_node.amCloset = true;
                this._healStructure(start_node.closetLine)
            }
        }
    },

    _addMissingParams(start_node) {
        let model_node = this._nodeCreators()[start_node.kind]();
        for (let param in model_node) {
            if (!start_node.hasOwnProperty(param)) {
                start_node[param] = model_node[param]
            }
        }
        if (start_node.kind == "sprite") {
            let model_main_line = model_node.line_list[0];
            let current_main_line = start_node.line_list[0];
            let new_main_nodes = [];
            for (let mnd of model_main_line.node_list) {
                let found = false;
                for (let nd of current_main_line.node_list) {
                    if (nd.name == mnd.name) {
                        found = true;
                        break
                    }
                }
                if (!found) {
                    let new_node = _.cloneDeep(mnd);
                    new_main_nodes.push(new_node)
                }
            }
            current_main_line.node_list = current_main_line.node_list.concat(new_main_nodes);
            this._renumberNodes(current_main_line.node_list);
            let model_closet_line = model_node.closetLine;
            let current_closet_line = start_node.closetLine;
            let new_closet_nodes = [];
            for (let mnd of model_closet_line.node_list) {
                let found = false;
                for (let nd of current_closet_line.node_list) {
                    if (nd.name == mnd.name) {
                        found = true;
                        break
                    }
                }
                if (!found) {
                    let new_node = _.cloneDeep(mnd);
                    new_closet_nodes.push(new_node)
                }
            }
            current_closet_line.node_list = current_closet_line.node_list.concat(new_closet_nodes);
        }
    }
}

function _getMatchingNode(uid, node) {
    if (node.unique_id == uid) {
        return node
    }
    if (!container_kinds.includes(node.kind) || (node.line_list.length == 0)) {
        return false
    }
    if (node.closetLine) {
        if (node.closetLine.unique_id == uid) {
            return node.closetLine
        }
        for (let nd of node.closetLine.node_list) {
            let match = _getMatchingNode(uid, nd);
            if (match) {
                return match
            }
        }
    }
    for (let lin of node.line_list) {
        if (lin.unique_id == uid) {
            return lin
        }
        for (let nd of lin.node_list) {
            let match = _getMatchingNode(uid, nd);
            if (match) {
                return match
            }
        }
    }
    return false
}

function _getMatchingNodePath(uid, path_list, node) {
    path_list.push(node)
    if (node.unique_id == uid) {
        return path_list
    }
    if (!container_kinds.includes(node.kind) || (node.line_list.length == 0)) {
        return false
    }
    if (node.closetLine) {
        if (node.closetLine.unique_id == uid) {
            path_list.push(node.closetLine)
            return path_list
        }
        for (let nd of node.closetLine.node_list) {
            let match = _getMatchingNodePath(uid, [node.closetLine], nd);
            if (match) {
                path_list = path_list.concat(match)
                return path_list
            }
        }
    }
    for (let lin of node.line_list) {
        if (lin.unique_id == uid) {
            path_list.push(lin)
            return path_list
        }
        for (let nd of lin.node_list) {
            let match = _getMatchingNodePath(uid, [lin], nd);
            if (match) {
                path_list = path_list.concat(match)
                return path_list
            }
        }
    }
    return false
}