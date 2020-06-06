import update from "immutability-helper";
import _ from "lodash";
import {container_kinds, text_kinds} from "./shared_consts.js";
import {repairCopiedDrawnComponents} from "./eval_space.js";

export {mutatorMixin, _getMatchingNode, _getMatchingNodePath}

let mutatorMixin = {

    _createEntryAndReturn(new_node, new_dict=null){
        if (!new_dict) {
            new_dict = this.state.node_dict
         }
        let query = {[new_node.uid]: {$set: new_node}};
        return update(new_dict, query)
    },

    _changeNode(uid, param_name, new_val, callback=null) {
        let node_dict = this.changeNodeAndReturn(uid, param_name, new_val)
        this.setState({node_dict: node_dict}, callback)
    },

    changeNodeAndReturn(uid, param_name, input_val, new_dict=null) {
         let new_val = _.cloneDeep(input_val)
         repairCopiedDrawnComponents(new_val, true);
         if (!new_dict) {
            new_dict = this.state.node_dict
         }
         let query = {[uid]: {[param_name]: {$set: new_val}}}
         let new_dict = update(new_dict, query)
         return new_dict
    },

    _changeNodeMulti(uid, valdict, callback=null) {
         let new_dict = this._changeNodeMultiAndReturn(uid, valdict, this.state.node_dict)
         this.setState({base_node: new_dict}, callback)
    },

    _changeNodeMultiAndReturn(uid, valdict, new_dict=null) {
        if (!new_dict) {
            new_dict = this.state.node_dict
        }
        for (let param in valdict) {
            let new_val = val_dict["param"]
            repairCopiedDrawnComponents(new_val, true, new_dict);
            let query = {[uid]: {[param_name]: {$set: new_val}}}
            new_dict = update(new_dict, query)
        }
        return new_dict
    },

    _insertNodeIh(new_node, line_id, position, callback=null) {
        let new_dict = this._insertNodeAndReturn(new_node, line_id, position, this.state.base_node, true)
        this.setState({node_dict: new_dict}, callback)
    },

    _insertNodeAndReturn(new_node_id, line_id, position, new_dict, heal_line=false) {
        let new_dict = this._changeNodeAndReturn(new_node_id, "parent", line_id, new_dict)
        new_dict = update(node_dict, {[line_id]: {node_list: {$splice: [[position, 0, new_node_id]]}}})
        if (heal_line) {
            new_dict = this._healLine(line_id, false, new_dict);
        }
        else {
            new_dict = this._renumberNodes(line_id, new_dict)
        }
        return new_dict
    },

    _insertNodesAndReturn(new_node_ids, line_id, position, new_dict) {
        for (let nid of new_node_ids) {
             let new_dict = this._changeNodeAndReturn(nid, "parent", line_id, new_dict)
        }
        new_dict = update(node_dict, {[line_id]: {node_list: {$splice: [[position, 0, ...new_node_ids]]}}})

        new_dict = this._healLine(line_id, new_dict);

        return new_dict
    },

    _replaceNodeAndReturn(new_node_id, line_id, position, node_dict, heal_line=false) {
        let new_dict = this._changeNodeMultiAndReturn(new_node_id, "parent", line_id, new_dict)
        new_dict = update(node_dict, {[line_id]: {node_list: {$splice: [[position, 1, new_node_id]]}}})
        if (heal_line) {
            new_dict = this._healLine(line_id, false, new_dict);
        }
        else {
            new_dict = this._renumberNodes(line_id, new_dict)
        }
        return new_dict
    },

    _splitTextAtPosition(text_id, cursor_position, target_dict) {

        let mnode = target_dict[text_id];
        let new_node_id;
        if (cursor_position == 0) {
            let tdict = {};
            [new_node_id, target_dict] = this._newTextNode("", target_dict);
            target_dict = this._insertNodeAndReturn(new_node_id, mnode.parent, mnode.position, target_dict)
        }
        else if (cursor_position == mnode.the_text.length) {
            [new_node_id, target_dict] = this._newTextNode("");
            target_dict = this._insertNodeAndReturn(new_node_id, mnode.parent, mnode.position + 1, target_dict)
        }
        else {
            let text_split = [mnode.the_text.slice(0, cursor_position), mnode.the_text.slice(cursor_position,)];
            [new_node_id, target_dict] = this._newTextNode(text_split[1]);
            target_dict = this.changeNodeAndReturn(text_id, "the_text", text_split[0], target_dict)
            target_dict = this._insertNodeAndReturn(new_node_id, mnode.parent, mnode.position + 1, target_dict)
        }
        return target_dict
    },

    _insertLineAndReturn(new_line_id, box_id, position, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict;
        }
        let target_dict = this.insertLinesAndReturn([new_line_id], box_id, position, target_dict)
        return target_dict
    },

    insertLinesAndReturn(new_line_ids, boxId, position=0, target_dict=null) {
        if (target_dict == null) {
            target_dict = this.state.node_dict;
        }
        for (let lin_id of new_line_ids) {
            target_dict = this.changeNodeAndReturn(lin_id, "parent", boxId)
        }
        target_dict = update(target_dict, {[boxId]: {line_list: {$splice: [[position, 0, ...new_line_ids]]}}})
        target_dict = this.renumberLines(boxId, target_dict)

        return target_dict
    },

    _splitLineAtTextPosition(text_id, cursor_position, portal_root="root",
                             target_dict=null, update=true) {
        if (target_dict == null) {
            target_dict = this.state.node_dict;
        }
        target_dict = this._splitTextAtPosition(text_id, cursor_position, target_dict);
        let mnode = target_dict[text_id];
        let pos = mnode.position;
        let linid = mnode.parent;
        let parent_line = target_dict[linid];
        let parent_line_pos = parent_line.position;
        target_dict = this._splitLineAndReturn(linid, pos + 1, new_base, false);
        let dbox = _getMatchingNode(parent_line.parent, new_base);

        let nd_for_focus = target_dict[parent_line.parent].line_list[parent_line_pos + 1].node_list[0]
        target_dict = this.changeNodeAndReturn(nd_for_focus, "setFocus", [portal_root, 0]);

        if (update) {
            this.setState({node_dict: target_dict})
        }
        else {
            return target_dict
        }
    },

    _splitLineAndReturn(line_id, position, target_dict=null) {
        if (target_dict == null) {
            target_dict = this.state.node_dict
        }
        let the_line = target_dict[line_id]
        let new_node_list = the_line.node_list.slice(position,);
        target_dict = this.changeNodeAndReturn(line_id, "node_list",
            [...the_line.node_list.slice(0, position)], target_dict)


        this._renumberNodes(new_node_list);


        let new_line_id;
        [new_line_id, target_dict] = this._newLineNode(new_node_list);
        for (let nd_id of new_node_list) {
            target_dict = this.changeNodeAndReturn(nd_id, "parent", new_line_id)
        }
        target_dict = this._renumberNodes(new_line_id, target_dict)

        target_dict = this._insertLineAndReturn(new_line_id, the_line.parent, the_line.position + 1, target_dict);
        return target_dict
    },

    _insertBoxInText(kind, text_id, cursor_position, portal_root, target_dict=null, update=true, is_doit=false) {
        if (target_dict == null) {
            target_dict = this.state.node_dict;
        }
        target_dict = this._splitTextAtPosition(text_id, cursor_position, target_dict, false);
        let mnode = target_dict[text_id];
        let new_node_id;
        if (kind == "sprite") {
            let use_svg = false;
            let gbox = this._getContainingGraphicsBox(text_id, target_dict)
            if (gbox && gbox.kind == "svggraphics") {
                use_svg = true;
            }
            [new_node_id, target_dict] = this._newSpriteBox(use_svg, target_dict)
        }
        else {
            let temp_dict;
            [new_node_id, temp_dict] = this._nodeCreators()[kind]()
            target_dict = this._createEntryAndReturn(temp_dict[new_node_id], target_dict)
        }
        if (["databox", "doitbox"].includes(kind)) {
            target_dict = this.changeNodeAndReturn(target_dict[new_node_id].line_list[0].node_list[0],
                "setFocus", [portal_root, 0], target_dict)
        }
        else if (text_kinds.includes(kind)) {
            target_dict = this.changeNodeAndReturn(new_node_id, "setFocus", [portal_root, 0])
        }

        let self = this;
        let target_dict = this._insertNodeAndReturn(new_node_id, mnode.parent, mnode.position + 1, target_dict, true);
        this.setState({base_node: newBase}, ()=>{
             self._clearSelected()
             if (kind == "port") {
                this._enterPortTargetMode(new_node.unique_id)
            }
         });
    },
    _removeLineAndReturn(uid, target_dict=null) {
        if (target_dict == null) {
            target_dict = this.state.node_dict;
        }
        let mline = target_dict[uid];
        target_dict = update(target_dict, {[mline.parent]: {line_list: {$splice: [[mline.position, 1]] }}})
        target_dict = this._renumberLines(mline.parent, target_dict)
        return target_dict
    },

    _removeNodeAndReturn(uid, new_dict=null) {
        if (new_dict == null) {
            new_dict = this.state.node_dict;
        }

        let parent_id = new_dict[uid].parent;
        new_dict = update(new_dict, {[parent_id]: {node_list: {$splice: [[new_dict[uid].position, 1]] }}})
        new_dict = this._healLine(parent_id, false, new_dict);
        return new_dict
    },

    _removeNodeIh(uid, callback=null, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
        let new_dict = this._removeNodeAndReturn(uid, this.state.node_dict)
        this.setState({node_dict: new_dict}, callback)
    },


    _deleteToLineEnd(text_id, caret_pos) {
        let target_dict = this.state.node_dict;
        let mnode = target_dict[text_id];
        if (caret_pos == 0) {
            if (mnode.position == 0)  {
                this.clipboard = [_.cloneDeep(parent_line)];
                if (parent_line.amCloset) {
                    [newnode_id, target_dict] = this._newTextNode(target_dict);
                    target_dict = this.changeNodeAndReturn(newnode_id, "parent", mnode.parent, target_dict)
                    // parent_line.node_list = [new_node]
                    this._changeNode(parent_line.unique_id, "node_list", [target_dict[new_node_id]], ()=>{
                        this._clearSelected()
                    })
                }
                else {
                    target_dict = this._removeLineAndReturn(mnode.parent, target_dict);
                    this.setState({node_dict: target_dict}, ()=>{
                        this._clearSelected()
                    })
                }
                return
            }
        }
        if (caret_pos < mnode.the_text.length - 1) {
            target_dict = this._splitTextAtPosition(text_id, caret_pos, target_dict);
        }
        else {
            return
        }
        let deleted_nodes = target_dict[mnode.parent].node_list.slice(mnode.position + 1,);
        target_dict = this.changeNodeAndReturn(target_dict[mnode.parent], "node_list",
            [...target_dict[mnode.parent].node_list.slice(0, mnode.position)], target_dict);
        let nline_id;
        [nline_id, target_dict] = this._newLineNode(deleted_nodes)
        this.clipboard = [nline_id];
        this.setState({node_dict: target_dict},()=>{
            this._clearSelected()
        })
    },

    _mergeWithPrecedingLine(second_line_id, target_dict) {
        let target_dict = this.state.node_dict;
        let second_line = target_dict[second_line_id];
        let dbox_id = second_line.parent;
        let first_line_id = target_dict[dbox_id].line_list[second_line.position - 1];
        let first_line = target_dict[first_line_id];

        target_dict = this._insertNodesAndReturn(second_line.node_list, first_line_id,
            first_line.node_list.length, target_dict);

        return target_dict
    },
    _deletePrecedingBox(text_id, clearClipboard=true, portal_root) {
        let target_dict = this.state.node_dict;
        let mnode = target_dict[text_id];
        let parent_line = target_dict[mnode.parent];
        let focus_node;
        let focus_pos;
        let self = this;
        if (mnode.position == 0) {
            if (!parent_line.amCloset && parent_line.position != 0) {
                let dbox = target_dict[parent_line.parent];
                let first_line = target_dict[dbox.line_list[parent_line.position - 1]];
                let preceding_node = target_dict[_.last(first_line.node_list)];

                if (preceding_node.kind == "text") {
                    focus_node = preceding_node.unique_id;
                    focus_pos = preceding_node.the_text.length
                }
                else {
                    focus_node = text_id;
                    focus_pos = 0
                }
                target_dict = this._startNewClipboardLine(clearClipboard)
                target_dict = this._mergeWithPrecedingLine(parent_line.unique_id, target_dict);
                this.setState({node_dict: target_dict, positionCursor})
            }
        }
        else {
            let preceding_node_id = parent_line.node_list[mnode.position - 1];
            let preceding_node = target_dict[preceding_node_id];
            if ((mnode.position - 2) < 0) {
                focus_node = text_id;
                focus_pos = 0
            }
            else {
                let pre_preceding_node = target_dict[parent_line.node_list[mnode.position - 2]];
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
                target_dict = this._addToClipboardStart(preceding_node_id, clearClipboard, target_dict);
                this._removeNodeIh(preceding_node.unique_id, positionCursor, target_dict)
            }
        }

        function positionCursor(){
            self._changeNode(focus_node, "setFocus", [portal_root, focus_pos])
        }
    },

    _addGraphicsComponent(uid, the_comp, callback=null) {
        let new_drawn_components = [...mnode.drawn_components, the_comp];
        this._changeNode(uid, "drawn_components", new_drawn_components, callback)
    },

    _getVirtualNode(uid) {
        if (window.virtualNodeDict && window.VirtualNodeDict.hasOwnProperty(uid)) {
            return window.virtualNodeDict(uid)
        }
    },

    _setSpriteParams(uid, pdict, callback=null) {
        let target_dict = this.state.base_node;
        let mnode = target_dict[uid];
        let vnode = this._getVirtualNode(uid);
        for (let lin_id of mnode.line_list) {
            let lin = target_dict[line_id];
            for (let nd_id of lin.node_list) {
                let nd = target_dict[nd_id]
                if (nd.name && pdict.hasOwnProperty(nd.name)) {
                    target_dict = this.changeNodeAndReturn(nd.line_list[0].node_list[0].unique_id, "the_text", String(pdict[nd.name]), target_dict)
                }
            }
        }
        if (vnode) {
            for (let lin_id of vnode.line_list) {
                let lin = window.virtualNodeDict[lin_id];
                for (let nd_id of lin.node_list) {
                    let nd = window.virtualNodeDict[nd_id];
                    if (nd.name && pdict.hasOwnProperty(nd.name)) {
                        nd.line_list[0].node_list[0].the_text = String(pdict[nd.name])
                    }
                }
            }
        }
        for (let nd_id of mnode.closetLine.node_list) {
            let nd = target_dict[nd_id]
            if (nd.name && pdict.hasOwnProperty(nd.name)) {
                target_dict = this.changeNodeAndReturn(nd.line_list[0].node_list[0].unique_id, "the_text", String(pdict[nd.name]), target_dict)
            }
        }
        if (vnode) {
            for (let nd of vnode.closetLine.node_list) {
                let nd = window.virtualNodeDict[nd_id];
                if (nd.name && pdict.hasOwnProperty(nd.name)) {
                    nd.line_list[0].node_list[0].the_text = String(pdict[nd.name])
                }
            }
        }
        this.setState({node_dict: target_dict}, callback)
    },
     _zoomBox(uid) {
        let target_dict = this.changeNodeAndReturn(uid, "am_zoomed", true);
        this.setState({base_node: newBase, zoomed_node_id: uid})
    },
    _unzoomBox(uid) {
        let target_dict = this.state.node_dict;
        let mnode = target_dict(uid);
        if (mnode.parent == null) {
            return
        }

        let target_dict = this.changeNodeAndReturn(uid, "am_zoomed", false, target_dict);

        let found = false;
        while (!found) {
            let parent_id = mnode.parent;
            if (parent_id == null) {
                found = true
            }
            let parent_line = target_dict[parent_id];
            mnode = target_dict[parent_line.parent];
            if (mnode.am_zoomed) {
                found = true
            }
        }

        this.setState({node_dict: target_dict, zoomed_node_id: mnode.unique_id});
    },

    _focusName(uid=null, box_id=null, portal_root="root", target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
        if (box_id == null) {
            if (uid == null) {
                uid = document.activeElement.id
            }
            let mnode = target_dict[uid];
            if (mnode.kind == "jsbox") {
                box_id = mnode.unique_id
            }
            else {
                let line_id = mnode.parent;
                box_id = target_dict[line_id].parent;
            }
        }

        let currentName = target_dict[box_id].name;
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

    _healStructure(start_node_id, target_dict) {
        let new_dict = target_dict;
        let start_node = target_dict[start_node_id]
        if (target_dict[start_node_id].kind.includes("turtle")) {
            let new_turtle_box_id;
            [new_turtle_box_id, target_dict] = this._newTurtleBox();
            new_dict = this._replaceNodeAndReturn(new_turtle_box_id, target_dict[start_node_id].parent,
                target_dict[start_node_id].position, target_dict)
            return
        }
        this._addMissingParams(start_node);

        if (start_node.kind == "line") {
            new_dict = this._healLine(start_node, true, new_dict)
        }
        else if (container_kinds.includes(start_node.kind)) {
            for (let lin_id of new_dict[start_node_id].line_list) {
                // noinspection JSPrimitiveTypeWrapperUsage
                new_dict = this.changeNodeAndReturn(line_id, "parent", start_node_id)
                lin.parent = start_node.unique_id;
                new_dict = this._healStructure(lin_id, new_dict)
            }
            new_dict = this._renumberNodes(new_dict[start_node_id], new_dict);
            if (new_dict[start_node_id].closetLine) {
                new_dict = this._changeNodeMultiAndReturn(new_dict[start_node_id].closetLine,
                    {"parent": start_node_id, "amCloset": true}, new_dict)

                new_dict = this._healStructure(start_node.closetLine, new_dict)
            }
            return new_dict
        }
    },
    _healLine(line_id, recursive=false, target_dict) {
        let done = false;

        // Merge adjacent text nodes
        while (!done) {
            target_dict = this._renumberNodes(line_id,target_dict);
            done = true;
            for (let i = 0; i < target_dict[line_id].node_list.length - 1; ++i) {
                if ((target_dict[new_node_list[i]].kind == "text") && (target_dict[new_node_list[i + 1]].kind == "text")) {
                    target_dict = this._mergeTextNodes(i, i + 1, line_id, target_dict);
                    done = false;
                    break
                }
            }
        }
        // Insert text node at start if necessary
        if (target_dict[line_id].node_list[0].kind != "text") {
            let new_node_id;
            [new_node_id, target_dict] = this._newTextNode("", target_dict);
            target_dict = this._insertNodeAndReturn(new_node_id, line_id, 0, target_dict);
        }
        // Insert text node at end if necessary
        if (_.last(target_dict[line_id].node_list).kind != "text") {
            let new_node_id;
            [new_node_id, target_dict] = this._newTextNode("");
            let pos = target_dict[line_id].node_list.length;
            target_dict = this._insertNodeAndReturn(new_node_id, line_id, pos, target_dict);
        }
        done = false;

        // Insert text nodes between adjacent boxes
        while (!done) {
            target_dict = this._renumberNodes(line_id, target_dict);
            done = true;
            let the_len = target_dict[line_id].node_list.length;
            for (let i = 0; i < the_len - 1; ++i) {
                let n1_id = target_dict[line_id].node_list[i];
                let n2_id = target_dict[line_id].node_list[i + 1];
                if ((target_dict[n1_id].kind != "text") && (target_dict[n2_id].kind != "text")) {
                    let new_node_id;
                    [new_node_id, target_dict] = this._newTextNode("");
                    target_dict = this._insertNodeAndReturn(new_node_id, line_id, i + 1, target_dict)
                    done = false;
                    break
                }
            }
        }
        ent
        if (recursive) {
            for (let node_id of target_dict[line_id].node_list) {
                this._healStructure(node_id, target_dict)

            }
        }
    },

    _addMissingParams(start_node_id, new_dict) {
        let [model_node_id, temp_dict] = this._nodeCreators()[new_dict[start_node_id].kind]();
        let model_node = temp_dict[model_node_id];
        for (let param in model_node) {
            if (!new_dict[start_node_id].hasOwnProperty(param)) {
                new_dict = this.changeNodeAndReturn(start_node_id, param, model_node[param])
            }
        }
        if (new_dict[start_node_id].kind == "sprite") {
            let model_main_line_id = model_node.line_list[0];
            let current_main_line_id = new_dict[start_node_id].line_list[0];
            for (let mnd_id of temp_dict[model_main_line_id].node_list) {
                let found = false;
                let mnd = temp_dict[mnd_id]
                for (let nd_id of new_dict[current_main_line_id].node_list) {
                    if (new_dict[nd_id].name == mnd.name) {
                        found = true;
                        break
                    }
                }
                if (!found) {
                    new_dict = this._createEntryAndReturn(mnd, new_dict);
                    new_dict = this._insertNodeAndReturn(mnd_id, current_main_line_id,
                        new_dict[current_main_line_id].node_list.length, new_dict)
                }
            }
            let model_closet_line = temp_dict[model_node.closetLine];
            let current_closet_line_id = new_dict[start_node_id].closetLine;
            for (let mnd_id of model_closet_line.node_list) {
                let found = false;
                let mnd = temp_dict[mnd_id]
                for (let nd_id of new_dict[current_closet_line_id].node_list) {
                    if (new_dict[nd_id].name == mnd.name) {
                        found = true;
                        break
                    }
                }
                if (!found) {
                    new_dict = this._createEntryAndReturn(mnd, new_dict);
                    new_dict = this._insertNodeAndReturn(mnd_id, current_closet_line_id,
                        new_dict[current_closet_line_id].node_list.length, new_dict)
                }
            }
        }
        return new_dict
    }
}
