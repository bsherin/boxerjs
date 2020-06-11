import update from "immutability-helper";
import _ from "lodash";
import {container_kinds, text_kinds} from "./shared_consts.js";
import {guid} from "./utilities";

export {mutatorMixin}

let mutatorMixin = {

    _cloneNode(nd_id, source_dict=null, target_dict=null, update_ids=false) {
        if (!source_dict) {
            source_dict = this.state.node_dict
        }
        if (!target_dict) {
            target_dict = {}
        }
        let new_base_id;
        if (update_ids) {
            new_base_id = guid();
        }
        else {
            new_base_id = nd_id;
        }
        let copied_node = _.cloneDeep(source_dict[nd_id]);
        copied_node.unique_id = new_base_id;
        target_dict = this._createEntryAndReturn(copied_node, target_dict)
        if (container_kinds.includes(target_dict[new_base_id].kind)) {
            let new_line_list = [];
            for (let lin_id of source_dict[nd_id].line_list) {
                let new_line_id;
                [new_line_id, target_dict] = this._cloneLine(lin_id, source_dict, target_dict, update_ids)

                new_line_list.push(new_line_id)
            }
            target_dict = this.changeNodeAndReturn(new_base_id, "line_list", new_line_list, target_dict);
        }

        return [new_base_id, target_dict]
    },

    _cloneLine(line_id, source_dict=null, target_dict=null, update_ids=false) {
        if (!source_dict) {
            source_dict = this.state.node_dict
        }
        if (!target_dict) {
            target_dict = {}
        }
        let new_base_id;
        if (update_ids) {
            new_base_id = guid();
        }
        else {
            new_base_id = line_id;
        }
        let copied_line = _.cloneDeep(source_dict[line_id]);
        copied_line.unique_id = new_base_id;
        target_dict = this._createEntryAndReturn(copied_line, target_dict)
        let new_node_list = [];
        for (let nd_id of source_dict[line_id].node_list) {
            let new_node_id;
            [new_node_id, target_dict] = this._cloneNode(nd_id, source_dict, target_dict, update_ids)
            new_node_list.push(new_node_id)
        }
        target_dict = this.changeNodeAndReturn(new_base_id, "node_list", new_node_list, target_dict);
        return [new_base_id, target_dict]
    },

    _cloneLineToTrueND(line_id, source_dict=null, update_ids=false, callback=null) {
        if (!source_dict) {
            source_dict = this.state.node_dict
        }
        let target_dict = this.state.node_dict;
        let new_base_id;
        [new_base_id, target_dict] = this._cloneLine(line_id, source_dict, target_dict, update_ids)
        this.setState({node_dict: target_dict}, callback)
    },

    _createEntryAndReturn(new_node, new_dict=null){
        if (!new_dict) {
            new_dict = this.state.node_dict
         }
        let query = {[new_node.unique_id]: {$set: new_node}};
        return update(new_dict, query)
    },

    _changeNode(uid, param_name, new_val, callback=null, new_dict=null) {
        let node_dict = this.changeNodeAndReturn(uid, param_name, new_val, new_dict);
        this.setState({node_dict: node_dict}, callback)
    },

    changeNodeAndReturn(uid, param_name, input_val, new_dict=null){
         let new_val = _.cloneDeep(input_val)
         // repairCopiedDrawnComponents(new_val, true);
         if (!new_dict) {
            new_dict = this.state.node_dict
         }
         let query = {[uid]: {[param_name]: {$set: new_val}}}
         new_dict = update(new_dict, query)
         return new_dict
    },

    _setLineList(uid, new_line_list, callback=null, target_dict=null) {
        let node_dict = this._setLineListAndReturn(uid, new_line_list, target_dict);
        this.setState({node_dict: node_dict}, callback)
    },

    _setLineListAndReturn(uid, new_line_list, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
        target_dict = this.changeNodeAndReturn(uid, "line_list", new_line_list, target_dict)
        for (let lin_id of new_line_list) {
            target_dict = this.changeNodeAndReturn(lin_id, "parent", uid, target_dict);
        }
        target_dict = this._renumberLines(uid, target_dict)
        return target_dict
    },

    _setFocus(focus_node_id, portal_root, pos, target_dict=null) {
        let dict_to_use
        if (!target_dict) {
            dict_to_use = this.state.node_dict
        }
        else {
            dict_to_use = target_dict
        }
        dict_to_use = this.changeNodeAndReturn(focus_node_id, "setFocus", [portal_root, pos], dict_to_use);
        if (!target_dict) {
            this.setState({node_dict: dict_to_use})

        }
        else {
            return dict_to_use
        }

    },

    _changeNodeMulti(uid, valdict, callback=null, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
         let new_dict = this._changeNodeMultiAndReturn(uid, valdict, target_dict)
         this.setState({node_dict: new_dict}, callback)
    },

    _changeNodeMultiAndReturn(uid, valdict, new_dict=null) {
        if (!new_dict) {
            new_dict = this.state.node_dict
        }
        for (let param in valdict) {
            let new_val = valdict[param]
            // repairCopiedDrawnComponents(new_val, true, new_dict);
            let query = {[uid]: {[param]: {$set: new_val}}}
            new_dict = update(new_dict, query)
        }
        return new_dict
    },

    _insertNode(new_node_id, line_id, position, callback=null, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
        let new_dict = this._insertNodeAndReturn(new_node_id, line_id, position, target_dict, true)
        this.setState({node_dict: new_dict}, callback)
    },

    _insertNodeAndReturn(new_node_id, line_id, position, new_dict, heal_line=false) {
        new_dict = this.changeNodeAndReturn(new_node_id, "parent", line_id, new_dict)
        new_dict = update(new_dict, {[line_id]: {node_list: {$splice: [[position, 0, new_node_id]]}}})
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
             new_dict = this.changeNodeAndReturn(nid, "parent", line_id, new_dict)
        }
        new_dict = update(new_dict, {[line_id]: {node_list: {$splice: [[position, 0, ...new_node_ids]]}}})

        new_dict = this._healLine(line_id, false, new_dict);

        return new_dict
    },

    _replaceNodeAndReturn(new_node_id, parent_line_id, position, node_dict, heal_line=false) {
        let new_dict = this._changeNodeMultiAndReturn(new_node_id, "parent", parent_line_id, new_dict)
        new_dict = update(node_dict, {[parent_line_id]: {node_list: {$splice: [[position, 1, new_node_id]]}}})
        if (heal_line) {
            new_dict = this._healLine(parent_line_id, false, new_dict);
        }
        else {
            new_dict = this._renumberNodes(line_id, new_dict)
        }
        return new_dict
    },

    _replaceLineAndReturn(new_line_id, parent_node_id, position, new_dict) {
        new_dict = this._changeNodeMultiAndReturn(new_line_id, "parent", parent_node_id, new_dict)
        new_dict = update(node_dict, {[parent_node_id]: {line_list: {$splice: [[position, 1, new_node_id]]}}})
        new_dict = this._renumberLines(parent_node_id, new_dict)
        return new_dict
    },

    // If cursor is at the start of the text node, inserts a new blank text node preceding
    // If cursor is at the end of text node, it inserts a new blank text node following
    // If cursor is in the middle of a text node, it intersts a new node after with the latter part of the text
    // And keeps the earlier part in the original node.
    _splitTextAtPosition(text_id, cursor_position, target_dict) {

        let new_node_id;
        if (cursor_position == 0) {
            let tdict = {};
            [new_node_id, target_dict] = this._newTextNode("", target_dict);
            let mnode = target_dict[text_id];
            target_dict = this._insertNodeAndReturn(new_node_id, mnode.parent, mnode.position, target_dict)
        }
        else if (cursor_position == target_dict[text_id].the_text.length) {
            [new_node_id, target_dict] = this._newTextNode("", target_dict);
            let mnode = target_dict[text_id];
            target_dict = this._insertNodeAndReturn(new_node_id, mnode.parent, mnode.position + 1, target_dict)
        }
        else {
            let mnode = target_dict[text_id];
            let text_split = [mnode.the_text.slice(0, cursor_position), mnode.the_text.slice(cursor_position,)];
            [new_node_id, target_dict] = this._newTextNode(text_split[1], target_dict);
            target_dict = this.changeNodeAndReturn(text_id, "the_text", text_split[0], target_dict)
            mnode = target_dict[text_id];
            target_dict = this._insertNodeAndReturn(new_node_id, mnode.parent, mnode.position + 1, target_dict)
        }
        return target_dict
    },

    // Given a line id returns nth node
    // Returns the last if nn = -1
    _getNthNode(line_id, nn, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
        if (nn == -1) {
            return target_dict[_.last(target_dict[line_id].node_list)]
        }
        else {
            return target_dict[target_dict[line_id].node_list[nn]]
        }
    },

    // Given a node id returns nth line
    // Returns the last if ln = -1
    _getNthLine(node_id, ln, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
        if (ln == -1) {
            return target_dict[_.last(target_dict[node_id].line_list)]
        }
        else {
            return target_dict[target_dict[node_id].line_list[ln]]
        }
    },

    // This takes the id of a node and returns the id of the ln child's nn child
    _getln(nid, ln, nn, target_dict=null){
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
        let target_node = target_dict[nid];
        if (target_node.kind == "line") {
            if (nn == -1) {
                return _.last(this._getNthNode(nid, ln, target_dict).line_list)
            } else {
                return this._getNthNode(nid, ln, target_dict).line_list[nn]
            }
        }
        else {
            if (nn == -1) {
                return _.last(this._getNthLine(nid, ln, target_dict).node_list)
            } else {
                return this._getNthLine(nid, ln, target_dict).node_list[nn]
            }

        }
    },

    // This takes the id of a node and sets the param_name of the child's child
    _setln(nid, ln, nn, param_name, new_val, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
        let target_node = target_dict[nid];
        let the_id = this._getln(nid, ln, nn, target_dict);
        return this.changeNodeAndReturn(the_id, param_name, new_val, target_dict)
    },

    _insertLineAndReturn(new_line_id, box_id, position, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict;
        }
        target_dict = this.insertLinesAndReturn([new_line_id], box_id, position, target_dict)
        return target_dict
    },

    insertLinesAndReturn(new_line_ids, boxId, position=0, target_dict=null) {
        if (target_dict == null) {
            target_dict = this.state.node_dict;
        }
        for (let lin_id of new_line_ids) {
            target_dict = this.changeNodeAndReturn(lin_id, "parent", boxId, target_dict)
        }
        target_dict = update(target_dict, {[boxId]: {line_list: {$splice: [[position, 0, ...new_line_ids]]}}})
        target_dict = this._renumberLines(boxId, target_dict)

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
        target_dict = this._splitLineAndReturn(linid, pos + 1, target_dict);

        let nd_for_focus = this._getln(parent_line.parent, parent_line_pos + 1, 0, target_dict);
        target_dict = this._setFocus(nd_for_focus, portal_root, 0, target_dict);

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

        target_dict = this._renumberNodes(line_id, target_dict);

        let new_line_id;
        [new_line_id, target_dict] = this._newLineNode(new_node_list, target_dict);
        for (let nd_id of new_node_list) {
            target_dict = this.changeNodeAndReturn(nd_id, "parent", new_line_id, target_dict)
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
            for (let uid in temp_dict) {
                target_dict = this._createEntryAndReturn(temp_dict[uid], target_dict)
            }
        }
        if (["databox", "doitbox"].includes(kind)) {
            target_dict = this._setFocus(this._getln(new_node_id, 0, 0, target_dict), portal_root, 0, target_dict)
        }
        else if (text_kinds.includes(kind)) {
            target_dict = this._setFocus(new_node_id, portal_root, 0)
        }

        let self = this;
        target_dict = this._insertNodeAndReturn(new_node_id, target_dict[text_id].parent, target_dict[text_id].position + 1, target_dict, true);
        this.setState({node_dict: target_dict}, ()=>{
             self._clearSelected();
             if (kind == "port") {
                this._enterPortTargetMode(target_dict[new_node_id].unique_id)
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

    _removeNodeAndReturn(uid, new_dict=null, heal=true) {
        if (new_dict == null) {
            new_dict = this.state.node_dict;
        }

        let parent_id = new_dict[uid].parent;
        new_dict = update(new_dict, {[parent_id]: {node_list: {$splice: [[new_dict[uid].position, 1]] }}})
        if (heal) {
            new_dict = this._healLine(parent_id, false, new_dict);
        }
        return new_dict
    },

    _removeNode(uid, callback=null, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
        let new_dict = this._removeNodeAndReturn(uid, this.state.node_dict)
        this.setState({node_dict: new_dict}, callback)
    },

    _mergeTextNodes(n1, n2, line_id, target_dict, heal=true) {
        target_dict = this.changeNodeAndReturn(this._getNthNode(line_id, n1, target_dict).unique_id, "the_text",
            this._getNthNode(line_id, n1, target_dict).the_text + this._getNthNode(line_id, n2, target_dict).the_text, target_dict);
        target_dict = this._removeNodeAndReturn(this._getNthNode(line_id, n2, target_dict).unique_id, target_dict, heal)
        return target_dict
    },

    _createCloset(boxId, target_dict=null, show=false, callback=null) {
        target_dict = this._createClosetAndReturn(boxId, target_dict, show);
        this.setState({node_dict: target_dict}, callback)
    },

    _createClosetAndReturn(boxId, target_dict=null, show=false) {
        if (!target_dict) {
            target_dict = this.state.node_dict;
        }
        let new_closet_line_id;
        [new_closet_line_id, target_dict] = this._newClosetLine(target_dict);
        target_dict[new_closet_line_id].parent = boxId;
        target_dict[boxId].closetLine = new_closet_line_id;
        target_dict[boxId].showCloset = show
        return target_dict
    },

    _deleteToLineEnd(text_id, caret_pos) {
        let target_dict = this.state.node_dict;
        let mnode = target_dict[text_id];
        if (caret_pos == 0) {
            if (mnode.position == 0)  {
                this._addToClipboardStart(mnode.parent);
                let parentLine = target_dict[mnode.parent];
                if (parentLine.amCloset) {
                    target_dict = this._createCloset(parentLine.parent, target_dict,
                        target_dict[parentLine.parent].showCloset, ()=>{
                        this._clearSelected()
                    })
                }
                else {
                    target_dict = this._removeLineAndReturn(target_dict[text_id].parent, target_dict);
                    this.setState({node_dict: target_dict}, ()=>{
                        this._clearSelected()
                    })
                }
                return
            }
        }
        if (caret_pos < target_dict[text_id].the_text.length - 1) {
            target_dict = this._splitTextAtPosition(text_id, caret_pos, target_dict);
        }
        else {
            return
        }
        let deleted_nodes = target_dict[target_dict[text_id].parent].node_list.slice(target_dict[text_id].position + 1,);
        target_dict = this.changeNodeAndReturn(target_dict[target_dict[text_id].parent], "node_list",
            [...target_dict[target_dict[text_id].parent].node_list.slice(0, target_dict[text_id].position)], target_dict);
        this._setClipboardToNodeList(deleted_nodes, target_dict);
        this.setState({node_dict: target_dict},()=>{
            this._clearSelected()
        })
    },

    _mergeWithPrecedingLine(second_line_id, target_dict) {
        let second_line = target_dict[second_line_id];
        let dbox_id = second_line.parent;
        let first_line = this._getNthLine(dbox_id, second_line.position - 1, target_dict);

        target_dict = this._insertNodesAndReturn(second_line.node_list, first_line.unique_id,
            first_line.node_list.length, target_dict);
        target_dict = this._removeLineAndReturn(second_line_id, target_dict);

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
                let preceding_node = target_dict[this._getln(parent_line.parent, parent_line.position - 1, -1, target_dict)]

                if (preceding_node.kind == "text") {
                    focus_node = preceding_node.unique_id;
                    focus_pos = preceding_node.the_text.length
                }
                else {
                    focus_node = text_id;
                    focus_pos = 0
                }
                this._startNewClipboardLine(clearClipboard)
                target_dict = this._mergeWithPrecedingLine(parent_line.unique_id, target_dict);
                this.setState({node_dict: target_dict}, positionCursor)
            }
        }
        else {
            let preceding_node = this._getNthNode(parent_line.unique_id, mnode.position - 1, target_dict);
            if ((mnode.position - 2) < 0) {
                focus_node = text_id;
                focus_pos = 0
            }
            else {
                let pre_preceding_node = this._getNthNode(parent_line.unique_id, mnode.position - 2, target_dict);
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
                target_dict = this._addToClipboardStart(preceding_node.unique_id, clearClipboard, target_dict);
                this._removeNode(preceding_node.unique_id, positionCursor, target_dict)
            }
        }

        function positionCursor(){
            self._setFocus(focus_node, portal_root, focus_pos)
        }
    },

    _addGraphicsComponent(uid, the_comp, callback=null) {
        let mnode = this.state.node_dict[uid];
        let new_drawn_components = [...mnode.drawn_components, the_comp];
        this._changeNode(uid, "drawn_components", new_drawn_components, callback)
    },

    _getVirtualNode(uid) {
        if (window.virtualNodeDict && window.virtualNodeDict.hasOwnProperty(uid)) {
            return window.virtualNodeDict[uid]
        }
    },

    _setSpriteParams(uid, pdict, callback=null) {
        let target_dict = this.state.node_dict;
        let mnode = target_dict[uid];
        let vnode = this._getVirtualNode(uid);
        for (let lin_id of mnode.line_list) {
            let lin = target_dict[lin_id];
            for (let nd_id of lin.node_list) {
                let nd = target_dict[nd_id];
                if (nd.name && pdict.hasOwnProperty(nd.name)) {
                    target_dict = this._setln(nd_id, 0, 0, "the_text", String(pdict[nd.name]), target_dict)
                }
            }
        }
        if (vnode) {
            for (let lin_id of vnode.line_list) {
                let lin = window.virtualNodeDict[lin_id];
                for (let nd_id of lin.node_list) {
                    let nd = window.virtualNodeDict[nd_id];
                    if (nd.name && pdict.hasOwnProperty(nd.name)) {
                        window.virtualNodeDict = this._setln(nd_id, 0, 0, "the_text", String(pdict[nd.name]), window.virtualNodeDict)
                    }
                }
            }
        }
        for (let nd_id of target_dict[mnode.closetLine].node_list) {
            let nd = target_dict[nd_id]
            if (nd.name && pdict.hasOwnProperty(nd.name)) {
                target_dict = this._setln(nd_id, 0, 0, "the_text", String(pdict[nd.name]), target_dict)
            }
        }
        if (vnode) {
            for (let nd_id of window.virtualNodeDict[vnode.closetLine].node_list) {
                let nd = window.virtualNodeDict[nd_id];
                if (nd.name && pdict.hasOwnProperty(nd.name)) {
                    window.virtualNodeDict = this._setln(nd_id, 0, 0, "the_text", String(pdict[nd.name]), window.virtualNodeDict)
                }
            }
        }
        this.setState({node_dict: target_dict}, callback)
    },

     _zoomBox(uid) {
        let target_dict = this.changeNodeAndReturn(uid, "am_zoomed", true);
        this.setState({node_dict: target_dict, zoomed_node_id: uid})
    },

    _unzoomBox(uid) {
        let target_dict = this.state.node_dict;
        let mnode = target_dict[uid];
        if (mnode.parent == null) {
            return
        }

        target_dict = this.changeNodeAndReturn(uid, "am_zoomed", false, target_dict);

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


    _renumberNodes(line_id, target_dict) {
        let counter = 0;

        for (let nodeid of target_dict[line_id].node_list) {
            target_dict = this.changeNodeAndReturn(nodeid, "position", counter, target_dict)
            counter += 1
        }
        return target_dict
    },

    _renumberLines(node_id, target_dict) {
        let counter = 0;

        for (let lineid of target_dict[node_id].line_list) {
            target_dict = this.changeNodeAndReturn(lineid, "position", counter, target_dict)
            counter += 1
        }
        return target_dict
    },

    _healStructure(start_node_id, target_dict) {
        let new_dict = target_dict;
        let start_node = target_dict[start_node_id]
        if (target_dict[start_node_id].kind.includes("turtle")) {
            let new_turtle_box_id;
            [new_turtle_box_id, target_dict] = this._newTurtleBox();
            new_dict = this._replaceNodeAndReturn(new_turtle_box_id, new_dict[start_node_id].parent,
                target_dict[start_node_id].position, new_dict)
        }
        // this._addMissingParams(start_node);

        if (start_node.kind == "line") {
            new_dict = this._healLine(start_node_id, true, new_dict)
        }
        else if (container_kinds.includes(start_node.kind)) {
            for (let lin_id of new_dict[start_node_id].line_list) {
                // noinspection JSPrimitiveTypeWrapperUsage
                new_dict = this.changeNodeAndReturn(lin_id, "parent", start_node_id, new_dict)
                new_dict = this._healStructure(lin_id, new_dict)
            }
            new_dict = this._renumberLines(start_node_id, new_dict);
            if (new_dict[start_node_id].closetLine) {
                new_dict = this._changeNodeMultiAndReturn(new_dict[start_node_id].closetLine,
                    {"parent": start_node_id, "amCloset": true}, new_dict)

                new_dict = this._healStructure(start_node.closetLine, new_dict)
            }
        }
        return new_dict
    },

    _healLine(line_id, recursive=false, target_dict) {
        let done = false;

        // Merge adjacent text nodes

        while (!done) {
            target_dict = this._renumberNodes(line_id,target_dict);
            done = true;
            for (let i = 0; i < target_dict[line_id].node_list.length - 1; ++i) {
                if ((this._getNthNode(line_id, i, target_dict).kind == "text") && (this._getNthNode(line_id, i + 1, target_dict).kind == "text")) {
                    target_dict = this._mergeTextNodes(i, i + 1, line_id, target_dict, false);
                    done = false;
                    break
                }
            }
        }
        // Insert text node at start if necessary
        if (this._getNthNode(line_id, 0, target_dict).kind != "text") {
            let new_node_id;
            [new_node_id, target_dict] = this._newTextNode("", target_dict);
            target_dict = this._insertNodeAndReturn(new_node_id, line_id, 0, target_dict);
        }
        // Insert text node at end if necessary
        if (this._getNthNode(line_id, -1, target_dict).kind != "text") {
            let new_node_id;
            [new_node_id, target_dict] = this._newTextNode("", target_dict);
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
                if ((this._getNthNode(line_id, i, target_dict).kind != "text") &&
                    (this._getNthNode(line_id, i + 1, target_dict).kind != "text")) {
                    let new_node_id;
                    [new_node_id, target_dict] = this._newTextNode("", target_dict);
                    target_dict = this._insertNodeAndReturn(new_node_id, line_id, i + 1, target_dict)
                    done = false;
                    break
                }
            }
        }
        if (recursive) {
            for (let node_id of target_dict[line_id].node_list) {
                target_dict = this._healStructure(node_id, target_dict)

            }
        }
        return target_dict
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
    },
    _updateIds(boxId, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
        let the_box = target_dict[boxId]
        for (let lin_id of line_list) {
            let new_id = guid();
            target_dict = this.changeNodeAndReturn(lin_id, "unique_id", new_id, target_dict);
            target_dict = this._replaceLineAndReturn(new_id, boxId, target_dict[new_id].position, target_dict);
            delete target_dict[lin_id];
            for (let nid of target_dict[new_id].node_list) {
                let new_node_id = guid();
                target_dict = this.changeNodeAndReturn(nid, "unique_id", new_node_id, target_dict);
                target_dict = this._replaceNodeAndReturn(new_node_id, new_id, target_dict[new_node_id].position, target_dict);
                if (container_kinds.includes(target_dict[new_node_id].kind)) {
                    for (let lin2id of target_dict[new_node_id].line_list) {
                        target_dict = this.changeNodeAndReturn(lin2id, "parent", new_node_id);
                    }
                    target_dict = this._updateIds(new_node_id, target_dict);
                    if (target_dict[new_node_id].closetLine) {
                        target_dict = this.changeNodeAndReturn(target_dict[new_node_id].closetLine, "parent", new_node_id);
                        for (let cnid of target_dict[target_dict[new_node_id.closetLine]].node_list) {
                            target_dict = this._updateIds(cnid, target_dict)
                        }
                    }
                }
            }
        }
        return target_dict
    }
}
