var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

import React from "react";
import * as ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import _ from 'lodash';

import "../css/boxer.scss";

import { doBinding, guid } from "./utilities.js";
import { DataBox } from "./nodes.js";
import { BoxerNavbar } from "./blueprint_navbar.js";
import { ProjectMenu, BoxMenu, EditMenu, ViewMenu } from "./main_menus_react.js";
import { postAjax } from "./communication_react.js";

import { BoxerSocket } from "./boxer_socket.js";
import { KeyTrap } from "./key_trap";
import { getCaretPosition } from "./utilities";
import { withStatus } from "./toaster.js";
import { withErrorDrawer } from "./error_drawer.js";

let tsocket = null;

// Prevent capturing focus by the button.
$(document).on('mousedown', "button", function (event) {
    event.preventDefault();
});

const MAX_UNDO_SAVES = 20;

window.turtle_box_refs = {};

function _main_main() {
    console.log("entering start_post_load");
    tsocket = new BoxerSocket("boxer", 5000);

    let MainAppPlus = withErrorDrawer(withStatus(MainApp, tsocket), tsocket);

    let domContainer = document.querySelector('#main-root');
    if (window.world_name == "") {
        ReactDOM.render(React.createElement(MainAppPlus, { data: null }), domContainer);
    } else {
        postAjax("get_data", { world_name: window.world_name }, got_data);
    }
    function got_data(result) {
        if (result.success) {
            let world_state = result.project_dict.world_state;

            ReactDOM.render(React.createElement(MainAppPlus, { world_state: world_state }), domContainer);
        }
    }
}

class MainApp extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.state = {};
        if (props.world_state == null) {
            this.state.base_node = this._newDataBoxNode();
            this.state.base_node.name = "world";
        } else {
            let base_node = _.cloneDeep(props.world_state.base_node);
            for (let lin of base_node.line_list) {
                this._healLine(lin, true);
            }
            this.state.base_node = base_node;
        }
        this.state.zoomed_node_id = this.state.base_node.unique_id;
        this.last_focus_id = null;
        this.last_focus_pos = null;
        this.state.innerWidth = window.innerWidth;
        this.state.innerHeight = window.innerHeight;
        this.clipboard = [];
        this.history = [];
        this.present = this.state.base_node;
        this.undoing = false;
    }

    componentDidMount() {
        window.changeNode = this._changeNode;
        window.newLineNode = this._newLineNode;
        window.newTextNode = this._newTextNode;
        window.addErrorDrawerEntry = this.props.addErrorDrawerEntry;
        window.openErrorDrawer = this.props.openErrorDrawer;
        window.updateIds = this._updateIds;

        window.addEventListener("resize", this._update_window_dimensions);
        this.state.history = [_.cloneDeep(this.state.base_node)];
    }

    componentDidUpdate(preProps, preState, snapShot) {
        if (this.undoing) {
            this.undoing = false;
            this.present = _.cloneDeep(this.state.base_node);
        } else {
            if (!this._eqTest(this.state.base_node, this.present)) {
                this.history.unshift(this.present);
                if (this.history.length > MAX_UNDO_SAVES) {
                    this.history = this.history.slice(0, MAX_UNDO_SAVES);
                }
                this.present = this.state.base_node;
            }
        }
    }

    _undo() {

        if (this.history.length > 0) {
            this.undoing = true;
            this.setState({ "base_node": this.history.shift() });
        }
    }

    _update_window_dimensions() {
        this.setState({
            "innerWidth": window.innerWidth,
            "innerHeight": window.innerHeight
        });
    }

    _renumberNodes(node_list) {
        let counter = 0;
        for (let node of node_list) {
            node["position"] = counter;
            counter += 1;
        }
    }

    _getMainState() {
        return this.state;
    }

    _getMatchingNode(uid, node) {
        if (node.unique_id == uid) {
            return node;
        }
        if (node.kind == "text" || node.kind == "jsbox" || node.kind == "turtlebox" || node.line_list.length == 0) {
            return false;
        }
        for (let lin of node.line_list) {
            if (lin.unique_id == uid) {
                return lin;
            }
            for (let nd of lin.node_list) {
                let match = this._getMatchingNode(uid, nd);
                if (match) {
                    return match;
                }
            }
        }
        return false;
    }

    _splitTextAtPosition(text_id, cursor_position, new_base) {

        let mnode = this._getMatchingNode(text_id, new_base);
        let parent_line = this._getMatchingNode(mnode.parent, new_base);
        let new_node;
        if (cursor_position == 0) {
            new_node = this._newTextNode("");
            new_node.unique_id = text_id;
            mnode.unique_id = guid();
            parent_line.node_list.splice(mnode.position, 0, new_node);
        } else if (cursor_position == mnode.the_text.length) {
            new_node = this._newTextNode("");
            parent_line.node_list.splice(mnode.position + 1, 0, new_node);
        } else {
            let text_split = [mnode.the_text.slice(0, cursor_position), mnode.the_text.slice(cursor_position)];
            new_node = this._newTextNode(text_split[1]);
            mnode.the_text = text_split[0];
            parent_line.node_list.splice(mnode.position + 1, 0, new_node);
        }
        new_node.parent = parent_line.unique_id;
        this._renumberNodes(parent_line.node_list);
    }

    _insertLine(new_line, box_id, position, new_base = null, update = true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let parent_box = this._getMatchingNode(box_id, new_base);
        new_line.parent = box_id;
        parent_box.line_list.splice(position, 0, new_line);
        this._renumberNodes(parent_box.line_list);
        if (update) {
            this.setState({ base_node: new_base });
        }
    }

    _splitLine(line_id, position, new_base = null, update = true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let the_line = this._getMatchingNode(line_id, new_base);
        let new_node_list = the_line.node_list.slice(position);
        this._renumberNodes(new_node_list);

        let new_line = this._newLineNode(new_node_list);
        for (let nd of new_node_list) {
            nd.parent = new_line.unique_id;
        }
        the_line.node_list = the_line.node_list.slice(0, position);
        this._insertLine(new_line, the_line.parent, the_line.position + 1, new_base, false);
        if (update) {
            this.setState({ base_node: new_base });
        }
    }

    _insertNode(new_node, line_id, position, new_base = null, update = true, heal_line = true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let parent_line = this._getMatchingNode(line_id, new_base);
        new_node.parent = line_id;
        parent_line.node_list.splice(position, 0, new_node);
        if (heal_line) {
            this._healLine(parent_line);
        }

        if (update) {
            this.setState({ base_node: new_base });
        }
    }

    _insertNodes(new_nodes, line_id, position, new_base = null, update = true, heal_line = true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let parent_line = this._getMatchingNode(line_id, new_base);
        for (let node of new_nodes) {
            node.parent = line_id;
        }
        parent_line.node_list.splice(position, 0, ...new_nodes);
        if (heal_line) {
            this._healLine(parent_line);
        }

        if (update) {
            this.setState({ base_node: new_base });
        }
    }

    _splitLineAtTextPosition(text_id, cursor_position, new_base = null, update = true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        this._splitTextAtPosition(text_id, cursor_position, new_base);
        let mnode = this._getMatchingNode(text_id, new_base);
        let pos = mnode.position;
        let linid = mnode.parent;
        let parent_line = this._getMatchingNode(linid, new_base);
        let parent_line_pos = parent_line.position;
        let dbox = this._getMatchingNode(parent_line.parent, new_base);
        this._splitLine(linid, pos + 1, new_base, false);
        dbox.line_list[parent_line_pos + 1].node_list[0].setFocus = 0;

        if (update) {
            this.setState({ base_node: new_base });
        }
    }

    _insertJsBoxinText(text_id, cursor_position, new_base = null, update = true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        this._splitTextAtPosition(text_id, cursor_position, new_base, false);
        let mnode = this._getMatchingNode(text_id, new_base);
        let new_node = this._newJsBoxNode();
        this._insertNode(new_node, mnode.parent, mnode.position + 1, new_base, false);
        if (update) {
            this.setState({ base_node: new_base });
        }
    }

    _insertDataBoxinText(text_id, cursor_position, new_base = null, update = true, callback) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        this._splitTextAtPosition(text_id, cursor_position, new_base, false);
        let mnode = this._getMatchingNode(text_id, new_base);
        let new_node = this._newDataBoxNode([]);
        new_node.line_list[0].node_list[0].setFocus = 0;
        this._insertNode(new_node, mnode.parent, mnode.position + 1, new_base, false);
        if (update) {
            this.setState({ base_node: new_base });
        }
    }

    _insertTurtleBoxinText(text_id, cursor_position, new_base = null, update = true, callback) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        this._splitTextAtPosition(text_id, cursor_position, new_base, false);
        let mnode = this._getMatchingNode(text_id, new_base);
        let new_node = this._newTurtleBox();
        this._insertNode(new_node, mnode.parent, mnode.position + 1, new_base, false);
        if (update) {
            this.setState({ base_node: new_base });
        }
    }

    _insertTurtleBoxLastFocus() {
        this._insertTurtleBoxinText(this.last_focus_id, this.last_focus_pos);
    }

    _insertDataBoxLastFocus() {
        this._insertDataBoxinText(this.last_focus_id, this.last_focus_pos);
    }

    _insertJsBoxLastFocus() {
        this._insertJsBoxinText(this.last_focus_id, this.last_focus_pos);
    }

    _mergeTextNodes(n1, n2, node_list) {
        node_list[n1].the_text = node_list[n1].the_text + node_list[n2].the_text;
        node_list.splice(n2, 1);
    }

    _healLine(line_pointer, recursive = false) {
        let done = false;

        // Merge adjacent text nodes
        while (!done) {
            this._renumberNodes(line_pointer.node_list);
            done = true;
            for (let i = 0; i < line_pointer.node_list.length - 1; ++i) {
                if (line_pointer.node_list[i].kind == "text" && line_pointer.node_list[i + 1].kind == "text") {
                    this._mergeTextNodes(i, i + 1, line_pointer.node_list);
                    done = false;
                    break;
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
                if (line_pointer.node_list[i].kind != "text" && line_pointer.node_list[i + 1].kind != "text") {
                    let new_node = this._newTextNode("");
                    line_pointer.node_list.splice(i + 1, 0, new_node);
                    new_node.parent = line_pointer.unique_id;
                    done = false;
                    break;
                }
            }
        }

        // Make sure all child notes point to the parent
        for (let node of line_pointer.node_list) {
            node.parent = line_pointer.unique_id;
        }
        if (recursive) {
            for (let node of line_pointer.node_list) {
                if (node.kind == "databox") {
                    for (let lin of node.line_list) {
                        lin.parent = node.unique_id;
                        this._healLine(lin);
                    }
                }
            }
        }
    }

    _removeNode(uid, new_base = null, update = true, callback) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let mnode = this._getMatchingNode(uid, new_base);
        let parent_line = this._getMatchingNode(mnode.parent, new_base);
        parent_line.node_list.splice(mnode.position, 1);
        this._healLine(parent_line);
        if (update) {
            this.setState({ base_node: new_base }, callback);
        }
    }

    _mergeWithPrecedingLine(second_line, new_base = null, update = true, callback = null) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let dbox = this._getMatchingNode(second_line.parent, new_base);
        let first_line = dbox.line_list[second_line.position - 1];

        first_line.node_list = first_line.node_list.concat(second_line.node_list);
        this._healLine(first_line);
        dbox.line_list.splice(second_line.position, 1);
        this._renumberNodes(dbox.line_list);
        if (update) {
            this.setState({ base_node: new_base }, callback);
        }
    }

    _compareDataboxes(db1, db2) {
        let fields = ["name", "am_zoomed", "closed"];
        for (let field of fields) {
            if (db1[field] != db2[field]) {
                return false;
            }
        }
        if (db1.line_list.length != db2.line_list.length) {
            return false;
        }
        for (let i = 0; i < db1.line_list.length; ++i) {
            if (!this._compareLines(db1.line_list[i], db2.line_list[i])) {
                return false;
            }
        }
        return true;
    }

    _compareLines(l1, l2) {
        if (l1.node_list.length != l2.node_list.length) {
            return false;
        }
        for (let i = 0; i < l1.node_list.length; ++i) {
            if (!this._eqTest(l1.node_list[i], l2.node_list[i])) {
                return false;
            }
        }
        return true;
    }

    _compareTexts(t1, t2) {
        return t1.the_text == t2.the_text;
    }

    _compareJsBoxes(js1, js2) {
        return js1.the_code == js2.the_code;
    }

    _compareTurtleBoxes(tb1, tb2) {
        return tb1.width == tb2.width && tb1.height == tb2.height;
    }

    _eqTest(obj1, obj2) {
        if (obj1.kind != obj2.kind) {
            return false;
        }
        if (obj1.kind == "databox") {
            return this._compareDataboxes(obj1, obj2);
        }
        if (obj2.kind == "text") {
            return this._compareTexts(obj1, obj2);
        }
        if (obj2.kind == "jsbox") {
            return this._compareJsBoxes(obj1, obj2);
        }
        if (obj2.kind == "turtlebox") {
            return this._compareTurtleBoxes(obj1, obj2);
        } else {
            return this._compareLines(obj1, obj2);
        }
    }

    _deletePrecedingBox(text_id, clearClipboard = true) {
        let mnode = this._getMatchingNode(text_id, this.state.base_node);
        let parent_line = this._getMatchingNode(mnode.parent, this.state.base_node);
        let focus_node;
        let focus_pos;
        let self = this;
        if (mnode.position == 0) {
            if (parent_line.position != 0) {
                let dbox = this._getMatchingNode(parent_line.parent, this.state.base_node);
                let first_line = dbox.line_list[parent_line.position - 1];
                let preceding_node = _.last(first_line.node_list);

                if (preceding_node.kind == "text") {
                    focus_node = preceding_node.unique_id;
                    focus_pos = preceding_node.the_text.length;
                } else {
                    focus_node = text_id;
                    focus_pos = 0;
                }
                this._mergeWithPrecedingLine(parent_line, null, true, positionCursor);
                this._startNewClipboardLine(clearClipboard);
            }
        } else {
            let preceding_node = parent_line.node_list[mnode.position - 1];
            if (mnode.position - 2 < 0) {
                focus_node = text_id;
                focus_pos = 0;
            } else {
                let pre_preceding_node = parent_line.node_list[mnode.position - 2];
                if (pre_preceding_node.kind == "text") {
                    focus_node = pre_preceding_node.unique_id;
                    focus_pos = pre_preceding_node.the_text.length;
                } else {
                    focus_node = text_id;
                    focus_pos = 0;
                }
            }

            if (preceding_node.kind != "text") {
                this._addToClipboardStart(preceding_node, clearClipboard);
                this._removeNode(preceding_node.unique_id, null, true, positionCursor);
            }
        }

        function positionCursor() {
            self._changeNode(focus_node, "setFocus", focus_pos);
        }
    }

    _positionAfterBox(databox_id) {
        let mnode = this._getMatchingNode(databox_id, this.state.base_node);
        let parent_node = this._getMatchingNode(mnode.parent, this.state.base_node);
        let target_id = parent_node.node_list[mnode.position + 1].unique_id;
        this._changeNode(target_id, "setFocus", 0);
    }

    _newTextNode(the_text = null) {
        let uid = guid();
        let new_node = {
            kind: "text",
            key: uid,
            selected: false,
            unique_id: uid,
            position: 0,
            the_text: the_text,
            parent: null,
            setFocus: null
        };
        return new_node;
    }

    _newLineNode(node_list = []) {
        let uid = guid();
        if (node_list.length == 0) {
            node_list.push(this._newTextNode(""));
        }
        let new_line = { kind: "line",
            key: uid,
            parent: null,
            position: 0,
            node_list: node_list,
            unique_id: uid };
        for (let node of node_list) {
            node.parent = uid;
        }
        return new_line;
    }

    _newDataBoxNode(line_list = []) {
        let uid = guid();
        if (line_list.length == 0) {
            let node_list = [this._newTextNode(" ")];
            let new_line = this._newLineNode(node_list);
            line_list = [new_line];
        }
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        let new_box = { kind: "databox",
            key: uid,
            name: null,
            parent: null,
            focusName: false,
            am_zoomed: false,
            position: 0,
            selected: false,
            line_list: line_list,
            closed: false,
            unique_id: uid };
        return new_box;
    }

    _newTurtleBox() {
        let uid = guid();
        let new_node = {
            kind: "turtlebox",
            key: uid,
            selected: false,
            unique_id: uid,
            position: 0,
            parent: null,
            width: 50,
            height: 50
        };
        return new_node;
    }

    _newJsBoxNode(the_code = null) {
        let uid = guid();
        if (the_code == null) {
            the_code = "";
        }
        let new_node = {
            kind: "jsbox",
            name: null,
            key: uid,
            selected: false,
            unique_id: uid,
            position: 0,
            the_code: the_code,
            parent: null,
            focusName: false,
            closed: false,
            setFocus: null
        };
        return new_node;
    }

    _handleTextChange(uid, new_html) {
        let re = /(.*)?<br>(.*)/;
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(uid, new_base);
        if (mnode) {
            mnode.the_text = new_html;
            this.setState({ base_node: new_base });
        }
    }

    _handleCodeChange(uid, new_code) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(uid, new_base);
        if (mnode) {
            mnode.the_code = new_code;
            this.setState({ base_node: new_base });
        }
    }

    _changeNode(uid, param_name, new_val, callback = null) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(uid, new_base);
        if (mnode) {
            mnode[param_name] = new_val;
            this.setState({ base_node: new_base }, callback);
        }
    }

    _getParentId(uid) {
        return this._getMatchingNode(uid, this.state.base_node).parent;
    }

    _getNode(uid) {
        return this._getMatchingNode(uid, this.state.base_node);
    }

    _zoomBox(uid) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(uid, new_base);
        mnode.am_zoomed = true;
        this.setState({ base_node: new_base, zoomed_node_id: mnode.unique_id });
    }
    _unzoomBox(uid) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(uid, new_base, new_base);
        if (mnode.parent == null) {
            return;
        }
        mnode.am_zoomed = false;

        let found = false;
        while (!found) {
            let parent_id = mnode.parent;
            if (parent_id == null) {
                found = true;
            }
            let parent_line = this._getMatchingNode(parent_id, new_base);
            mnode = this._getMatchingNode(parent_line.parent, new_base);
            if (mnode.am_zoomed) {
                found = true;
            }
        }
        this.setState({ base_node: new_base, zoomed_node_id: mnode.unique_id });
    }

    _storeFocus(uid, position) {
        this.last_focus_id = uid;
        this.last_focus_pos = position;
    }

    _insertDataBoxFromKey() {
        this._insertDataBoxinText(document.activeElement.id, getCaretPosition(document.activeElement));
    }
    _insertJsBoxFromKey() {
        this._insertJsBoxinText(document.activeElement.id, getCaretPosition(document.activeElement));
    }

    _focusNameLastFocus() {
        this._focusName(this.last_focus_id);
    }

    _focusName(uid = null) {
        if (uid == null) {
            uid = document.activeElement.id;
        }
        let mnode = this._getMatchingNode(uid, this.state.base_node);
        let box_id;
        if (mnode.kind == "jsbox") {
            box_id = mnode.unique_id;
        } else {
            let line_id = mnode.parent;
            box_id = this._getParentId(line_id);
        }

        let currentName = this._getNode(box_id).name;
        let self = this;
        if (currentName == null) {
            this._changeNode(box_id, "name", "", doFocus);
        } else {
            doFocus();
        }

        function doFocus() {
            self._changeNode(box_id, "focusName", true);
        }
    }

    _clearSelected(node = null, new_base = null, callback = null) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        if (node == null) {
            node = new_base;
        }

        if (node.line_list.length == 0) {
            return;
        }
        for (let lin of node.line_list) {
            lin.selected = false;
            for (let nd of lin.node_list) {
                nd.selected = false;
                if (nd.kind == "databox") {
                    this._clearSelected(nd, new_base);
                }
            }
        }
        if (new_base) {
            this.setState({ base_node: new_base }, callback);
        }
        return false;
    }

    _setSelected(id_list) {
        this._clearSelected(null, null, () => {
            let new_base = _.cloneDeep(this.state.base_node);
            for (let uid of id_list) {
                let mnode = this._getMatchingNode(uid, new_base);
                mnode.selected = true;
            }
            this.setState({ base_node: new_base });
        });
    }

    _clearClipboard() {
        this.clipboard = [];
    }

    _addToClipboardStart(raw_new_node, clear = false) {
        let new_node = _.cloneDeep(raw_new_node);
        if (clear) {
            let new_line = this._newLineNode([new_node]);
            this.clipboard = [new_line];
        } else {
            let first_line = this.clipboard[0];
            first_line.node_list.unshift(new_node);
            new_node.parent = first_line.unique_id;
            if (first_line.node_list.length > 1) {
                if (first_line.node_list[0].kind == "text" && first_line.node_list[1].kind == "text") {
                    this._mergeTextNodes(0, 1, first_line.node_list);
                }
            }
        }
    }

    _startNewClipboardLine(clear = false) {
        let new_line1 = this._newLineNode();
        if (clear) {
            let new_line2 = this._newLineNode();
            this.clipboard = [new_line1, new_line2];
        } else {
            this.clipboard.unshift(new_line1);
        }
    }

    _updateIds(line_list) {
        for (let lin of line_list) {
            lin.unique_id = guid();
            for (let node of lin.node_list) {
                node.unique_id = guid();
                node.parent = lin.unique_id;
                if (node.kind == "databox") {
                    for (let lin2 of node.line_list) {
                        lin2.parent = node.unique_id;
                    }
                    this._updateIds(node.line_list);
                }
            }
        }
    }

    _insertLines(new_lines, boxId, position = 0, new_base = null, update = true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let dbox = this._getMatchingNode(boxId, new_base);
        for (let lin of new_lines) {
            lin.parent = boxId;
        }
        dbox.line_list.splice(position, 0, new_lines);

        if (update) {
            this.setState({ base_node: new_base });
        }
    }

    _insertClipboard(text_id, cursor_position, new_base = null, update = true) {
        if (!this.clipboard || this.clipboard.length == 0) {
            return;
        }
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }

        this._splitTextAtPosition(text_id, cursor_position, new_base, false);
        let nodeA = this._getMatchingNode(text_id, new_base);
        let targetLine = this._getMatchingNode(nodeA.parent, new_base);
        let nodeB = targetLine.node_list[nodeA.position + 1];
        let targetBox = this._getMatchingNode(targetLine.parent, new_base);

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
                        focus_text_pos = nodeA.the_text.length + inserted_node.the_text.length;
                    } else {
                        focus_node_id = inserted_node.unique_id;
                        focus_text_pos = inserted_node.the_text.length;
                    }
                } else {
                    focus_type = "box";
                    focus_node_id = inserted_node.unique_id;
                }
            } else {
                let last_inserted_node = _.last(updated_lines[0].node_list);
                if (last_inserted_node.kind == "text") {
                    focus_type = "text";
                    focus_node_id = last_inserted_node.unique_id;
                    focus_text_pos = last_inserted_node.the_text.length;
                } else {
                    focus_type = "box";
                    focus_node_id = last_inserted_node.unique_id;
                }
            }
            this._insertNodes(updated_lines[0].node_list, targetLine.unique_id, nodeA.position + 1, new_base, false, true);
        } else {
            this._splitLine(targetLine.unique_id, nodeB.position, new_base, false);
            let targetLine2 = targetBox.line_list[targetLine.position + 1];
            this._insertNodes(updated_lines[0].node_list, targetLine.unique_id, targetLine.node_list.length, new_base, false, true);
            let last_inserted_node = _.last(_.last(updated_lines).node_list);
            if (last_inserted_node.kind == "text") {
                focus_type = "text";
                focus_node_id = last_inserted_node.unique_id;
                focus_text_pos = last_inserted_node.the_text.length;
            } else {
                focus_type = "box";
                focus_node_id = last_inserted_node.unique_id;
            }
            this._insertNodes(_.last(updated_lines).node_list, targetLine2.unique_id, 0, new_base, false, true);
            if (updated_lines.length > 2) {
                this._insertLines(updated_lines.slice(1, updated_lines.length - 1), targetBox.unique_id, targetLine.position + 1, new_base, false);
            }
        }
        let self = this;
        if (update) {
            this.setState({ base_node: new_base }, positionCursor);
        } else {
            positionCursor();
        }

        function positionCursor() {
            if (focus_type == "text") {
                self._changeNode(focus_node_id, "setFocus", focus_text_pos);
            } else {
                self._positionAfterBox(focus_node_id);
            }
        }
    }

    _insertClipboardFromKey() {
        this._insertClipboard(document.activeElement.id, getCaretPosition(document.activeElement));
    }

    _insertClipboardLastFocus() {
        this._insertClipboard(this.last_focus_id, this.last_focus_pos);
    }

    _copyTextToClipboard() {
        let the_text = window.getSelection().toString();
        if (!the_text) {
            return;
        }
        this._clearClipboard();
        let newTextNode = this._newTextNode(the_text);
        this.clipboard = [this._newLineNode([newTextNode])];
    }

    _getBaseNode() {
        return this.state.base_node;
    }

    _setTurtleRef(uid, ref) {
        window.turtle_box_refs[uid] = ref;
    }

    get funcs() {
        let funcs = {
            handleTextChange: this._handleTextChange,
            changeNode: this._changeNode,
            insertDataBox: this._insertDataBoxinText,
            deletePrecedingBox: this._deletePrecedingBox,
            splitLineAtTextPosition: this._splitLineAtTextPosition,
            getParentId: this._getParentId,
            getNode: this._getNode,
            zoomBox: this._zoomBox,
            focusName: this._focusName,
            focusNameLastFocus: this._focusNameLastFocus,
            unzoomBox: this._unzoomBox,
            storeFocus: this._storeFocus,
            insertDataBoxLastFocus: this._insertDataBoxLastFocus,
            getMainState: this._getMainState,
            positionAfterBox: this._positionAfterBox,
            clearSelected: this._clearSelected,
            setSelected: this._setSelected,
            newTextNode: this._newTextNode,
            newDataBox: this._newDataBoxNode,
            newLineNode: this._newLineNode,
            addToClipboardStart: this._addToClipboardStart,
            insertClipboardLastFocus: this._insertClipboardLastFocus,
            handleCodeChange: this._handleCodeChange,
            insertJsBoxLastFocus: this._insertJsBoxLastFocus,
            insertTurtleBoxLastFocus: this._insertTurtleBoxLastFocus,
            getBaseNode: this._getBaseNode,
            insertNode: this._insertNode,
            registerTurtleBox: this._registerTurtleBox,
            setTurtleRef: this._setTurtleRef,
            openErrorDrawer: this.props.openErrorDrawer,
            updateIds: this._updateIds
        };
        return funcs;
    }

    render() {

        let menus = React.createElement(
            React.Fragment,
            null,
            React.createElement(ProjectMenu, _extends({}, this.funcs, this.props.statusFuncs, {
                world_state: this.props.world_state
            })),
            React.createElement(BoxMenu, this.funcs),
            React.createElement(EditMenu, EditMenu),
            React.createElement(ViewMenu, this.funcs)
        );

        this.state.base_node.am_zoomed = true;
        let zoomed_node = this._getMatchingNode(this.state.zoomed_node_id, this.state.base_node);
        let key_bindings = [[["{"], e => {
            e.preventDefault();
            this._insertDataBoxFromKey();
        }], [["["], e => {
            e.preventDefault();
            this._insertJsBoxFromKey();
        }], [["|"], e => {
            e.preventDefault();
            this._focusName();
        }], [["esc"], e => {
            this._clearSelected();
        }], [["ctrl+v", "command+v"], e => {
            e.preventDefault();
            this._insertClipboardFromKey();
        }], [["ctrl+c", "command+c"], e => {
            e.preventDefault();
            this._copyTextToClipboard();
        }], [["ctrl+z", "command+z"], e => {
            e.preventDefault();
            this._undo();
        }]];
        return React.createElement(
            React.Fragment,
            null,
            React.createElement(BoxerNavbar, { is_authenticated: window.is_authenticated,
                user_name: window.username,
                menus: menus
            }),
            React.createElement(DataBox, { name: zoomed_node.name,
                funcs: this.funcs,
                focusName: false,
                am_zoomed: true,
                closed: false,
                innerHeight: this.state.innerHeight,
                innerWidth: this.state.innerWidth,
                unique_id: this.state.zoomed_node_id,
                line_list: zoomed_node.line_list }),
            React.createElement(KeyTrap, { global: true, bindings: key_bindings })
        );
    }
}

MainApp.propTypes = {
    world_state: PropTypes.object
};

_main_main();