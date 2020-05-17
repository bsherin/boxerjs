var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

import React from "react";
import * as ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import _ from 'lodash';

import "../css/boxer.scss";

import { doBinding, guid } from "./utilities.js";
import { DataBox, PortBox, JsBox, loader } from "./nodes.js";
import { BoxerNavbar } from "./blueprint_navbar.js";
import { ProjectMenu, BoxMenu, MakeMenu, EditMenu, ViewMenu } from "./main_menus_react.js";
import { postAjax } from "./communication_react.js";

import { BoxerSocket } from "./boxer_socket.js";
import { KeyTrap } from "./key_trap";
import { getCaretPosition } from "./utilities";
import { withStatus } from "./toaster.js";
import { withErrorDrawer } from "./error_drawer.js";
import { container_kinds, text_kinds, defaultBgColor } from "./shared_consts.js";
import { shape_classes, Triangle } from "./pixi_shapes.js";
import { svg_shape_classes, SvgTriangle } from "./svg_shapes.js";
import { NamedBox } from "./named_box.js";

let tsocket = null;

// Prevent capturing focus by a button.
$(document).on('mousedown', "button", function (event) {
    event.preventDefault();
});

import { defaultPenWidth, defaultPenColor, defaultFontFamily } from "./shared_consts.js";
import { defaultFontSize, defaultFontStyle } from "./shared_consts.js";
import { repairCopiedDrawnComponents } from "./eval_space";

const MAX_UNDO_SAVES = 20;

window.turtle_box_refs = {};

function _main_main() {
    console.log("entering start_post_load");
    tsocket = new BoxerSocket("boxer", 5000);

    let MainAppPlus = withErrorDrawer(withStatus(MainApp, tsocket), tsocket);

    let domContainer = document.querySelector('#main-root');
    if (window.world_name == "") {
        loader.load(() => {
            ReactDOM.render(React.createElement(MainAppPlus, { data: null }), domContainer);
        });
    } else {
        postAjax("get_data", { world_name: window.world_name }, got_data);
    }
    function got_data(result) {
        if (result.success) {
            let world_state = result.project_dict.world_state;
            _rehydrateComponents(world_state.base_node);
            loader.load(() => {
                ReactDOM.render(React.createElement(MainAppPlus, { world_state: world_state }), domContainer);
            });
        }
    }
}

function _rehydrateComponents(nd) {
    if (nd.kind == "graphics") {
        nd.drawn_components = [];
        if (nd.hasOwnProperty("component_specs")) {
            for (let comp of nd.component_specs) {
                let Dcomp = shape_classes[comp.type];
                let new_comp = React.createElement(Dcomp, comp.props);
                nd.drawn_components.push(new_comp);
            }
            nd.component_specs = [];
        }
    } else if (nd.kind == "svggraphics") {
        nd.drawn_components = [];
        if (nd.hasOwnProperty("component_specs")) {
            for (let comp of nd.component_specs) {
                let Dcomp = svg_shape_classes[comp.type];
                let new_comp = React.createElement(Dcomp, comp.props);
                nd.drawn_components.push(new_comp);
            }
            nd.component_specs = [];
        }
    }
    if (container_kinds.includes(nd.kind)) {
        for (let lin of nd.line_list) {
            _rehydrateComponents(lin);
        }
    } else if (nd.kind == "line") {
        for (let cnode of nd.node_list) {
            _rehydrateComponents(cnode);
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
            this._healStructure(base_node);
            // for (let lin of base_node.line_list) {
            //     this._healLine(lin, true)
            // }
            this.state.base_node = base_node;
        }
        this.state.zoomed_node_id = this.state.base_node.unique_id;
        this.state.boxer_selected = false;
        this.state.select_parent = null;
        this.state.select_range = null;
        this.last_focus_id = null;
        this.last_focus_pos = null;
        this.last_focus_portal_root = null;
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
        window.newDoitNode = this._newDoitBoxNode;
        window.newColorBox = this._newColorBox;
        window.newGraphicsBox = this._newGraphicsBox;
        window.newSvgGraphicsBox = this._newSvgGraphicsBox;
        window.newTurtleShape = this._newTurtleShape;
        window.newValueBox = this._newValueBox;
        window.addErrorDrawerEntry = this.props.addErrorDrawerEntry;
        window.openErrorDrawer = this.props.openErrorDrawer;
        window.updateIds = this._updateIds;
        window.getBaseNode = this._getBaseNode;

        window.addEventListener("resize", this._update_window_dimensions);
        this.state.history = [_.cloneDeep(this.state.base_node)];
        let new_base = _.cloneDeep(this.state.base_node);
        new_base.line_list[0].node_list[0].setFocus = ["root", 0];
        this.setState({ base_node: new_base });
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

    _getStateForSave() {
        let new_state = _.cloneDeep(this.state);
        this._dehydrateComponents(new_state.base_node);
        return new_state;
    }

    _dehydrateComponents(nd) {
        if (nd.kind == "graphics") {
            nd.component_specs = [];
            for (let comp of nd.drawn_components) {
                let new_spec = { type: comp.type, props: comp.props };
                nd.component_specs.push(new_spec);
            }
            nd.drawn_components = [];
        } else if (nd.kind == "svggraphics") {
            nd.component_specs = [];
            for (let comp of nd.drawn_components) {
                let new_spec = { type: comp.type.name, props: comp.props };
                nd.component_specs.push(new_spec);
            }
            nd.drawn_components = [];
        }
        if (container_kinds.includes(nd.kind)) {
            for (let lin of nd.line_list) {
                this._dehydrateComponents(lin);
            }
        } else if (nd.kind == "line") {
            for (let cnode of nd.node_list) {
                this._dehydrateComponents(cnode);
            }
        }
    }

    _getMatchingNode(uid, node) {
        if (node.unique_id == uid) {
            return node;
        }
        if (!container_kinds.includes(node.kind) || node.line_list.length == 0) {
            return false;
        }
        if (node.closetLine) {
            if (node.closetLine.unique_id == uid) {
                return node.closetLine;
            }
            for (let nd of node.closetLine.node_list) {
                let match = this._getMatchingNode(uid, nd);
                if (match) {
                    return match;
                }
            }
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

    _splitLineAtTextPosition(text_id, cursor_position, portal_root = "root", new_base = null, update = true) {
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
        dbox.line_list[parent_line_pos + 1].node_list[0].setFocus = [portal_root, 0];

        if (update) {
            this.setState({ base_node: new_base });
        }
    }

    _insertBoxInText(kind, text_id, cursor_position, portal_root, new_base = null, update = true, is_doit = false) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        this._splitTextAtPosition(text_id, cursor_position, new_base, false);
        let mnode = this._getMatchingNode(text_id, new_base);
        let new_node = this._nodeCreators()[kind]();
        if (["databox", "doitbox"].includes(kind)) {
            new_node.line_list[0].node_list[0].setFocus = [portal_root, 0];
        } else if (text_kinds.includes(kind)) {
            new_node.setFocus = [portal_root, 0];
        } else if (kind == "port") {
            this._enterPortTargetMode(new_node.unique_id);
        }
        this._insertNode(new_node, mnode.parent, mnode.position + 1, new_base, false);
        let self = this;
        if (update) {
            this.setState({ base_node: new_base }, () => {
                self._clearSelected();
            });
        }
    }

    _setPortTarget(port_id, target_id) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(port_id, new_base);
        mnode.target = target_id;
        this.setState({ base_node: new_base });
    }

    _enterPortTargetMode(port_id) {
        let self = this;
        document.addEventListener("click", gotClick);

        function gotClick(event) {
            let target = event.target.closest(".targetable");
            if (!target) return;
            self._setPortTarget(port_id, target.id);
            document.removeEventListener("click", gotClick);
        }
    }

    _toggleBoxTransparency(boxId) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(boxId, new_base);
        let mline = this._getMatchingNode(mnode.parent, new_base);
        if (mline.parent == null) return;
        let mbox = this._getMatchingNode(mline.parent, new_base);
        if (mbox.name == "world") return;
        mbox.transparent = !mbox.transparent;
        this.setState({ base_node: new_base });
    }

    _toggleCloset(boxId) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(boxId, new_base);
        let mline = this._getMatchingNode(mnode.parent, new_base);
        if (mline.parent == null) return;
        let mbox = this._getMatchingNode(mline.parent, new_base);
        mbox.showCloset = !mbox.showCloset;
        if (mbox.showCloset && !mbox.closetLine) {
            mbox.closetLine = this._newClosetLine();
            mbox.closetLine.parent = mbox.unique_id;
        }
        this.setState({ base_node: new_base });
    }

    _containsPort(boxId) {
        let mnode = this._getMatchingNode(boxId, this.state.base_node);
        return checkNode(mnode);

        function checkNode(the_node) {
            if (container_kinds.includes(the_node.kind)) {
                for (let lin of the_node.line_list) {
                    for (let nd of lin.node_list) {
                        if (nd.kind == "port") {
                            return true;
                        }
                        if (checkNode(nd)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
    }

    _toggleBoxTransparencyLastFocus() {
        this._toggleBoxTransparency(this.last_focus_id);
    }

    _toggleClosetLastFocus() {
        this._toggleCloset(this.last_focus_id);
    }

    _insertBoxLastFocus(kind) {
        this._insertBoxInText(kind, this.last_focus_id, this.last_focus_pos, this.last_focus_portal_root);
    }

    _retargetPortLastFocus() {
        this._retargetPort(this.last_focus_portal_root);
    }

    _retargetPort(port_id) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(port_id, new_base);
        mnode.target = null;
        this.setState({ base_node: new_base }, () => {
            this._enterPortTargetMode(port_id);
        });
    }

    _mergeTextNodes(n1, n2, node_list) {
        node_list[n1].the_text = node_list[n1].the_text + node_list[n2].the_text;
        node_list.splice(n2, 1);
    }

    _removeLine(uid, new_base = null, update = true, callback) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let mline = this._getMatchingNode(uid, new_base);
        let parent_box = this._getMatchingNode(mline.parent, new_base);
        parent_box.line_list.splice(mline.position, 1);
        if (update) {
            this.setState({ base_node: new_base }, callback);
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

    _comparePortboxes(db1, db2) {
        let fields = ["name", "am_zoomed", "closed", "target"];
        for (let field of fields) {
            if (db1[field] != db2[field]) {
                return false;
            }
        }
        return true;
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
        if (container_kinds.includes(obj1.kind)) {
            return this._compareDataboxes(obj1, obj2);
        }
        if (obj2.kind == "text") {
            return this._compareTexts(obj1, obj2);
        }
        if (obj2.kind == "jsbox" || obj2.kind == "htmlbox") {
            return this._compareJsBoxes(obj1, obj2);
        }
        if (obj2.kind == "port") {
            return this._comparePortboxes(obj1, obj2);
        } else {
            return this._compareLines(obj1, obj2);
        }
    }

    _deleteToLineEnd(text_id, caret_pos) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(text_id, this.state.base_node);
        let parent_line = this._getMatchingNode(mnode.parent, new_base);
        if (caret_pos == 0) {
            if (mnode.position == 0) {
                this.clipboard = [_.cloneDeep(parent_line)];
                if (parent_line.amCloset) {
                    let newnode = this._newTextNode();
                    newnode.parent = parent_line.unique_id;
                    parent_line.node_list = [new_node];
                } else {
                    this._removeLine(parent_line.unique_id, new_base);
                }
                this.setState({ base_node: new_base });
            }
        }
        if (caret_pos < mnode.the_text.length - 1) {
            this._splitTextAtPosition(text_id, caret_pos, new_base);
        }
        if (mnode.position == parent_line.node_list.length - 1) {
            return;
        }
        let deleted_nodes = parent_line.node_list.splice(mnode.position + 1);
        this.clipboard = [this._newLineNode(deleted_nodes)];
        this.setState({ base_node: new_base }, () => {
            this._clearSelected();
        });
    }

    _deletePrecedingBox(text_id, clearClipboard = true, portal_root) {
        let mnode = this._getMatchingNode(text_id, this.state.base_node);
        let parent_line = this._getMatchingNode(mnode.parent, this.state.base_node);
        let focus_node;
        let focus_pos;
        let self = this;
        if (mnode.position == 0) {
            if (!parent_line.amCloset && parent_line.position != 0) {
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
            self._changeNode(focus_node, "setFocus", [portal_root, focus_pos]);
        }
    }

    _positionAfterBox(databox_id, portal_root) {
        let mnode = this._getMatchingNode(databox_id, this.state.base_node);
        let parent_node = this._getMatchingNode(mnode.parent, this.state.base_node);
        let target_id = parent_node.node_list[mnode.position + 1].unique_id;
        this._changeNode(target_id, "setFocus", [portal_root, 0]);
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

    _newClosetLine() {
        let closet_box = this._newDataBoxNode([], true);
        closet_box.transparent = true;
        closet_box.name = "closet";
        let node_list = [this._newTextNode(""), closet_box, this._newTextNode("")];
        let ncloset = this._newLineNode(node_list);
        ncloset.amCloset = true;
        return ncloset;
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
            amCloset: false,
            unique_id: uid };
        for (let node of node_list) {
            node.parent = uid;
        }
        return new_line;
    }

    _newDoitBoxNode(line_list = []) {
        let uid = guid();
        if (line_list.length == 0) {
            let node_list = [this._newTextNode(" ")];
            let new_line = this._newLineNode(node_list);
            line_list = [new_line];
        }
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        this._renumberNodes(line_list);
        let new_box = { kind: "doitbox",
            key: uid,
            name: null,
            parent: null,
            fixed_size: false,
            fixed_width: null,
            fixed_height: null,
            focusName: false,
            am_zoomed: false,
            position: 0,
            selected: false,
            line_list: line_list,
            closed: false,
            showCloset: false,
            closetLine: null,
            unique_id: uid };
        return new_box;
    }

    _newDataBoxNode(line_list = [], amClosetBox = false) {
        let uid = guid();
        if (line_list.length == 0) {
            let node_list = [this._newTextNode(" ")];
            let new_line = this._newLineNode(node_list);
            line_list = [new_line];
        }
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        this._renumberNodes(line_list);
        let new_box = {
            kind: "databox",
            key: uid,
            name: null,
            parent: null,
            fixed_size: false,
            fixed_width: null,
            fixed_height: null,
            focusName: false,
            am_zoomed: false,
            transparent: false,
            position: 0,
            selected: false,
            line_list: line_list,
            closed: false,
            showCloset: false,
            closetLine: null,
            unique_id: uid };
        return new_box;
    }

    _newPort(target = null) {
        let uid = guid();
        let new_box = {
            kind: "port",
            key: uid,
            target: target,
            name: null,
            parent: null,
            fixed_size: false,
            fixed_width: null,
            fixed_height: null,
            focusName: false,
            am_zoomed: false,
            position: 0,
            selected: false,
            closed: false,
            unique_id: uid };
        return new_box;
    }

    _newSvgGraphicsBox(line_list = []) {
        let uid = guid();
        if (line_list.length == 0) {
            let node_list = [this._newTextNode(" ")];
            let new_line = this._newLineNode(node_list);
            line_list = [new_line];
        }
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        this._renumberNodes(line_list);
        let new_node = {
            kind: "svggraphics",
            key: uid,
            name: null,
            parent: null,
            fixed_size: false,
            fixed_width: null,
            fixed_height: null,
            focusName: false,
            am_zoomed: false,
            transparent: false,
            selected: false,
            line_list: line_list,
            closed: false,
            drawn_components: [],
            showCloset: false,
            closetLine: null,
            unique_id: uid,
            bgColor: defaultBgColor,
            graphics_fixed_width: 303,
            graphics_fixed_height: 303,
            showGraphics: true
        };
        return new_node;
    }

    _newGraphicsBox(line_list = []) {
        let uid = guid();
        if (line_list.length == 0) {
            let node_list = [this._newTextNode(" ")];
            let new_line = this._newLineNode(node_list);
            line_list = [new_line];
        }
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        this._renumberNodes(line_list);
        let new_node = {
            kind: "graphics",
            key: uid,
            name: null,
            parent: null,
            fixed_size: false,
            fixed_width: null,
            fixed_height: null,
            focusName: false,
            am_zoomed: false,
            transparent: false,
            selected: false,
            line_list: line_list,
            closed: false,
            drawn_components: [],
            showCloset: false,
            closetLine: null,
            unique_id: uid,
            bgColor: defaultBgColor,
            graphics_fixed_width: 303,
            graphics_fixed_height: 303,
            showGraphics: true
        };
        return new_node;
    }

    _newColorBox(color_string = null) {
        let uid = guid();
        if (!color_string) {
            color_string = "0 0 0";
        }
        let node_list = [this._newTextNode(color_string)];
        let new_line = this._newLineNode(node_list);
        let line_list = [new_line];
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        this._renumberNodes(line_list);
        let new_node = {
            kind: "color",
            key: uid,
            name: null,
            parent: null,
            fixed_size: false,
            fixed_width: null,
            fixed_height: null,
            focusName: false,
            am_zoomed: false,
            transparent: false,
            selected: false,
            line_list: line_list,
            closed: false,
            drawn_components: [],
            showCloset: false,
            closetLine: null,
            unique_id: uid,
            graphics_fixed_width: 25,
            graphics_fixed_height: 25,
            showGraphics: true
        };
        return new_node;
    }

    _addGraphicsComponent(uid, the_comp, callback = null) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(uid, new_base);
        mnode.drawn_components = [...mnode.drawn_components, the_comp];
        this.setState({ base_node: new_base }, callback);
    }

    _newValueBox(name, value) {
        let node_list = [this._newTextNode(String(value))];
        let new_line = this._newLineNode(node_list);
        let line_list = [new_line];
        let vbox = this._newDataBoxNode(line_list);
        vbox.name = String(name);
        return vbox;
    }

    _newTurtleShape() {
        const tw = 11;
        const th = 15;
        const turtleColor = 0x008000;
        let shape_box = this._newGraphicsBox();
        shape_box.name = "shape";
        shape_box.graphics_fixed_width = 50;
        shape_box.graphics_fixed_height = 50;
        let tshape = React.createElement(Triangle, { tw: tw, th: th, tcolor: turtleColor });
        shape_box.drawn_components = [tshape];
        return shape_box;
    }

    _newSvgTurtleShape() {
        const tw = 11;
        const th = 15;
        const turtleColor = "#008000";
        let shape_box = this._newSvgGraphicsBox();
        shape_box.name = "shape";
        shape_box.graphics_fixed_width = 50;
        shape_box.graphics_fixed_height = 50;
        let tshape = React.createElement(SvgTriangle, { width: tw, height: th, fill: turtleColor });
        shape_box.drawn_components = [tshape];
        return shape_box;
    }

    _newSpriteBox(use_svg = false) {
        let uid = guid();
        let param_dict = {
            "xPosition": 0,
            "yPosition": 0,
            pen: true,
            shown: true,
            heading: 0,
            "spriteSize": 1,
            "penColor": defaultPenColor,
            "penWidth": defaultPenWidth,
            "fontFamily": defaultFontFamily,
            "fontSize": defaultFontSize,
            "fontStyle": defaultFontStyle
        };

        let main_params = ["xPosition", "yPosition", "pen", "shown", "heading"];
        let closet_params = ["spriteSize", "penWidth", "fontFamily", "fontSize", "fontStyle"];

        let main_node_list = [this._newTextNode(" ")];
        for (let param of main_params) {
            main_node_list.push(this._newValueBox(param, param_dict[param]));
            main_node_list.push(this._newTextNode(" "));
        }
        if (use_svg) {
            main_node_list.push(this._newSvgTurtleShape());
        } else {
            main_node_list.push(this._newTurtleShape());
        }

        let main_line = this._newLineNode(main_node_list);

        let closet_node_list = [this._newTextNode(" ")];
        for (let param of closet_params) {
            closet_node_list.push(this._newValueBox(param, param_dict[param]));
            closet_node_list.push(this._newTextNode(" "));
        }
        let penColorBox = this._newColorBox("0 0 0");
        penColorBox.name = "penColor";
        closet_node_list.push(penColorBox);

        let closet_line = this._newLineNode(closet_node_list);

        let line_list = [main_line];
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        this._renumberNodes(line_list);
        let new_node = {
            kind: "sprite",
            key: uid,
            name: null,
            parent: null,
            fixed_size: false,
            fixed_width: null,
            fixed_height: null,
            focusName: false,
            am_zoomed: false,
            transparent: false,
            position: 0,
            selected: false,
            line_list: line_list,
            closed: false,
            showCloset: false,
            closetLine: closet_line,
            unique_id: uid

        };
        return new_node;
    }

    _setSpriteParams(uid, pdict, callback = null) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(uid, new_base);
        for (let lin of mnode.line_list) {
            for (let nd of lin.node_list) {
                if (nd.name && pdict.hasOwnProperty(nd.name)) {
                    nd.line_list[0].node_list[0].the_text = String(pdict[nd.name]);
                }
            }
        }
        for (let nd of mnode.closetLine.node_list) {
            if (nd.name && pdict.hasOwnProperty(nd.name)) {
                nd.line_list[0].node_list[0].the_text = String(pdict[nd.name]);
            }
        }

        this.setState({ base_node: new_base }, callback);
    }

    _newTurtleBox() {
        let uid = guid();
        let sprite = this._newSpriteBox();
        sprite.transparent = true;
        let node_list = [sprite];
        let new_line = this._newLineNode(node_list);
        let line_list = [new_line];
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        let new_node = this._newGraphicsBox(line_list);
        new_node.transparent = true;
        return new_node;
    }

    _newSvgTurtleBox() {
        let uid = guid();
        let sprite = this._newSpriteBox(true);
        sprite.transparent = true;
        let node_list = [sprite];
        let new_line = this._newLineNode(node_list);
        let line_list = [new_line];
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        let new_node = this._newSvgGraphicsBox(line_list);
        new_node.transparent = true;
        return new_node;
    }

    _newHtmlBoxNode(the_code = null) {
        let uid = guid();
        if (the_code == null) {
            the_code = "";
        }
        let new_node = {
            kind: "htmlbox",
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

    _nodeCreators() {
        return {
            jsbox: this._newJsBoxNode,
            htmlbox: this._newHtmlBoxNode,
            text: this._newTextNode,
            doitbox: this._newDoitBoxNode,
            databox: this._newDataBoxNode,
            sprite: this._newSpriteBox,
            graphics: this._newGraphicsBox,
            svggraphics: this._newSvgGraphicsBox,
            line: this._newLineNode,
            color: this._newColorBox,
            port: this._newPort,
            turtlebox: this._newTurtleBox,
            svgturtlebox: this._newSvgTurtleBox
        };
    }

    _healers() {
        return {
            jsbox: null,
            text: null,
            htmlbox: null,
            doitbox: this._newDoitBoxNode,
            databox: this._newDataBoxNode,
            sprite: this._newSpriteBox,
            graphics: this._newGraphicsBox,
            svggraphics: this._newSvgGraphicsBox,
            color: this._newColorBox,
            port: this._newPort,
            line: this._healLine
        };
    }

    _healStructure(start_node, parent_node, parent_id = null) {
        if (start_node.kind.includes("turtle")) {
            let new_turtlebox = this._newTurtleBox();
            new_turtlebox.parent = start_node.unique_id;
            parent_node.node_list.splice(start_node.position, 1, new_turtlebox);
            return;
        }
        this._addMissingParams(start_node);
        if (parent_id) {
            start_node.parent = parent_id;
        }
        if (start_node.kind == "line") {
            this._healLine(start_node, true);
        } else if (container_kinds.includes(start_node.kind)) {
            for (let lin of start_node.line_list) {
                // noinspection JSPrimitiveTypeWrapperUsage
                lin.parent = start_node.unique_id;
                this._healStructure(lin, start_node);
            }
            this._renumberNodes(start_node.line_list);
            if (start_node.closetLine) {
                start_node.closetLine.parent = start_node.unique_id;
                start_node.amCloset = true;
                this._healStructure(start_node.closetLine);
            }
        }
    }

    _addMissingParams(start_node) {
        let model_node = this._nodeCreators()[start_node.kind]();
        for (let param in model_node) {
            if (!start_node.hasOwnProperty(param)) {
                start_node[param] = model_node[param];
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
                        break;
                    }
                }
                if (!found) {
                    let new_node = _.cloneDeep(mnd);
                    new_main_nodes.push(new_node);
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
                        break;
                    }
                }
                if (!found) {
                    let new_node = _.cloneDeep(mnd);
                    new_closet_nodes.push(new_node);
                }
            }
            current_closet_line.node_list = current_closet_line.node_list.concat(new_closet_nodes);
        }
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
                this._healStructure(node, line_pointer);
            }
        }
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
            repairCopiedDrawnComponents(new_val, true);
            mnode[param_name] = new_val;
            this.setState({ base_node: new_base }, callback);
        }
    }

    _setNodeSize(uid, new_width, new_height, callback = null) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(uid, new_base);
        if (mnode) {
            if (!new_width) {
                mnode.fixed_size = false;
                mnode.fixed_width = null;
                mnode.fixed_height = null;
            } else {
                mnode.fixed_size = true;
                mnode.fixed_width = new_width;
                mnode.fixed_height = new_height;
            }
            this.setState({ base_node: new_base }, callback);
        }
    }

    _setGraphicsSize(uid, new_width, new_height, callback = null) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(uid, new_base);
        if (mnode) {
            mnode.graphics_fixed_width = new_width;
            mnode.graphics_fixed_height = new_height;
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

    _storeFocus(uid, position, portal_root) {
        this.last_focus_id = uid;
        this.last_focus_pos = position;
        this.last_focus_portal_root = portal_root;
    }

    _insertBoxFromKey(kind) {
        this._insertBoxInText(kind, document.activeElement.id, getCaretPosition(document.activeElement), this.last_focus_portal_root);
    }

    _focusNameLastFocus() {
        this._focusName(this.last_focus_id);
    }

    _focusName(uid = null, box_id = null, portal_root = "root") {
        if (box_id == null) {
            if (uid == null) {
                uid = document.activeElement.id;
            }
            let mnode = this._getMatchingNode(uid, this.state.base_node);
            if (mnode.kind == "jsbox") {
                box_id = mnode.unique_id;
            } else {
                let line_id = mnode.parent;
                box_id = this._getParentId(line_id);
            }
        }

        let currentName = this._getNode(box_id).name;
        let self = this;
        if (currentName == null) {
            this._changeNode(box_id, "name", "", doFocus);
        } else {
            doFocus();
        }

        function doFocus() {
            self._changeNode(box_id, "focusName", portal_root);
        }
    }

    _clearSelected(node = null, new_base = null, callback = null, force = true) {
        if (!this.state.boxer_selected && !force) {
            return;
        }
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        if (node == null) {
            node = new_base;
        }
        if (node.closetLine) {
            node.closetLine.selected = false;
            for (let nd of node.closetLine.node_list) {
                nd.selected = false;
                if (container_kinds.includes(nd.kind) || nd.kind == "line") {
                    this._clearSelected(nd, new_base);
                }
            }
        }

        if (node.line_list.length == 0) {
            return;
        }
        for (let lin of node.line_list) {
            lin.selected = false;
            for (let nd of lin.node_list) {
                nd.selected = false;
                if (container_kinds.includes(nd.kind) || nd.kind == "line") {
                    this._clearSelected(nd, new_base);
                }
            }
        }
        if (new_base) {
            this.setState({ base_node: new_base, boxer_selected: false }, callback);
        }
    }

    _selectChildren(node) {
        node.selected = true;
        if (node.kind == "line") {
            for (let child of node.node_list) {
                this._selectChildren(child);
            }
        } else if (container_kinds.includes(node.kind)) {
            for (let child of node.line_list) {
                this._selectChildren(child);
            }
            if (node.closetLine) {
                this._selectChildren(node.closetLine);
            }
        }
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
                if (container_kinds.includes(node.kind)) {
                    for (let lin2 of node.line_list) {
                        lin2.parent = node.unique_id;
                    }
                    this._updateIds(node.line_list);
                    if (node.closetLine) {
                        node.closetLine.parent = node.unique_id;
                        this._updateIds([node.closetLine]);
                    }
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
        dbox.line_list.splice(position, 0, ...new_lines);

        if (update) {
            this.setState({ base_node: new_base });
        }
    }

    _insertClipboard(text_id, cursor_position, portal_root, new_base = null, update = true) {
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
            this._renumberNodes(targetBox.line_list);
        }
        let self = this;
        if (update) {
            this._clearSelected(null, new_base, null, true);
            this.setState({ base_node: new_base }, positionCursor);
        } else {
            positionCursor();
        }

        function positionCursor() {
            if (focus_type == "text") {
                self._changeNode(focus_node_id, "setFocus", [portal_root, focus_text_pos]);
            } else {
                self._positionAfterBox(focus_node_id);
            }
        }
    }

    _insertClipboardFromKey() {
        this._insertClipboard(document.activeElement.id, getCaretPosition(document.activeElement), this.last_focus_portal_root);
    }

    _insertClipboardLastFocus() {
        this._insertClipboard(this.last_focus_id, this.last_focus_pos, this.last_focus_portal_root);
    }

    _unfixSizeLastFocus() {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(this.last_focus_id, new_base);
        let parentLine = this._getMatchingNode(mnode.parent, new_base);
        let parentBox = this._getMatchingNode(parentLine.parent, new_base);
        parentBox.fixed_size = false;
        this.setState({ base_node: new_base });
    }

    _copySelected() {
        if (this.state.boxer_selected) {
            this._copyBoxerSelection();
            return;
        }
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

    _findParents(node_id, base_node = null) {
        if (!base_node) {
            base_node = this.state.base_node;
        }
        let mnode = this._getMatchingNode(node_id, base_node);
        let parents = [mnode.unique_id];
        let par = mnode.parent;
        while (par) {
            parents.push(par);
            mnode = this._getMatchingNode(par, base_node);
            par = mnode.parent;
        }
        return parents;
    }

    _cutSelected() {
        if (this.state.boxer_selected) {
            this._deleteBoxerSelection();
            return;
        }
        let sel = window.getSelection();
        let the_text = sel.toString();
        if (!the_text) {
            return;
        }

        let newTextNode = this._newTextNode(the_text);
        this.clipboard = [this._newLineNode([newTextNode])];
        let base_node = _.cloneDeep(this.state.base_node);
        let tnode = this._getMatchingNode(sel.anchorNode.parentNode.id, base_node);
        let start;
        let num;
        if (sel.anchorOffset < sel.focusOffset) {
            start = sel.anchorOffset;
            num = sel.focusOffset - start;
        }
        if (sel.anchorOffset > sel.focusOffset) {
            start = sel.focusOffset;
            num = sel.anchorOffset - start;
        }
        tnode.the_text = tnode.the_text.slice(0, start) + tnode.the_text.slice(start + num);
        tnode.setFocus = [this.last_focus_portal_root, start];
        this.setState({ base_node: base_node });
    }

    _copyBoxerSelection() {
        if (!this.state.boxer_selected) {
            return;
        }
        let select_parent_node = this._getMatchingNode(this.state.select_parent, this.state.base_node);
        if (select_parent_node.kind == "line") {
            let copied_nodes = select_parent_node.node_list.slice(this.state.select_range[0], this.state.select_range[1] + 1);
            this.clipboard = [this._newLineNode(_.cloneDeep(copied_nodes))];
        } else {
            let copied_lines = select_parent_node.line_list.slice(this.state.select_range[0], this.state.select_range[1] + 1);
            this.clipboard = [copied_lines];
        }
        this._clearSelected();
    }

    _deleteBoxerSelection() {
        if (!this.state.boxer_selected) {
            return;
        }
        let base_node = _.cloneDeep(this.state.base_node);
        let select_parent_node = this._getMatchingNode(this.state.select_parent, base_node);
        let num_to_delete = this.state.select_range[1] - this.state.select_range[0] + 1;
        if (select_parent_node.kind == "line") {
            let start_spot = this.state.select_range[0];
            let deleted_nodes = select_parent_node.node_list.splice(start_spot, num_to_delete);
            this.clipboard = [this._newLineNode(_.cloneDeep(deleted_nodes))];
            this._healLine(select_parent_node);
            let focus_node;
            if (start_spot >= select_parent_node.node_list.length) {
                focus_node = select_parent_node.node_list[select_parent_node.node_list.length - 1];
                focus_node.setFocus = [this.last_focus_portal_root, focus_node.the_text.length];
            } else if (select_parent_node.node_list[start_spot].kind != "text") {
                focus_node = select_parent_node.node_list[start_spot + 1];
                focus_node.setFocus = [this.last_focus_portal_root, 0];
            } else {
                focus_node = select_parent_node.node_list[start_spot];
                focus_node.setFocus = [this.last_focus_portal_root, focus_node.the_text.length];
            }
        } else {
            this.clipboard = select_parent_node.line_list.splice(this.state.select_range[0], num_to_delete);
            let focus_node;
            let focus_line;
            this._renumberNodes(select_parent_node.line_list);
            if (select_parent_node.line_list.length == 0) {
                let new_line = this._newLineNode();
                new_line.parent = select_parent_node.unique_id;
                new_line.position = 0;
                select_parent_node.line_list = [new_line];
                let focus_node = new_line.node_list[0];
                focus_node.setFocus = [this.last_focus_portal_root, 0];
            }
            if (this.state.select_range[0] >= select_parent_node.line_list.length) {
                focus_line = select_parent_node.line_list[this.state.select_range[0] - 1];
                focus_node = focus_line.node_list[focus_line.node_list.length - 1];
                focus_node.setFocus = [this.last_focus_portal_root, focus_node.the_text.length];
            } else {
                focus_line = select_parent_node.line_list[this.state.select_range[0]];
                focus_node = focus_line.node_list[0];
                focus_node.setFocus = [this.last_focus_portal_root, 0];
            }
        }
        for (let lin of base_node.line_list) {
            this._healLine(lin, true);
        }

        this.setState({ base_node: base_node, boxer_selected: false });
    }

    _selectSpan(start_id, end_id) {
        let base_node = _.cloneDeep(this.state.base_node);
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
            return null;
        }
        let start_parent_id = start_parents[start_parents.indexOf(common_parent) - 1];
        let end_parent_id = end_parents[end_parents.indexOf(common_parent) - 1];
        let range;
        let start_parent = this._getMatchingNode(start_parent_id, base_node);
        let end_parent = this._getMatchingNode(end_parent_id, base_node);
        if (start_parent.position > end_parent.position) {
            range = [end_parent.position, start_parent.position];
        } else {
            range = [start_parent.position, end_parent.position];
        }
        let cp = this._getMatchingNode(common_parent, base_node);
        let nd_list;
        if (container_kinds.includes(cp.kind)) {
            nd_list = cp.line_list;
        } else {
            nd_list = cp.node_list;
        }
        for (let i = range[0]; i <= range[1]; ++i) {
            this._selectChildren(nd_list[i]);
        }
        this.setState({
            base_node: base_node,
            boxer_selected: true,
            select_parent: common_parent,
            select_range: range
        });
    }

    get funcs() {
        let funcs = {
            handleTextChange: this._handleTextChange,
            changeNode: this._changeNode,
            insertBoxInText: this._insertBoxInText,
            deletePrecedingBox: this._deletePrecedingBox,
            deleteToLineEnd: this._deleteToLineEnd,
            splitLineAtTextPosition: this._splitLineAtTextPosition,
            getParentId: this._getParentId,
            getNode: this._getNode,
            zoomBox: this._zoomBox,
            focusName: this._focusName,
            focusNameLastFocus: this._focusNameLastFocus,
            unzoomBox: this._unzoomBox,
            storeFocus: this._storeFocus,
            insertBoxLastFocus: this._insertBoxLastFocus,
            positionAfterBox: this._positionAfterBox,
            clearSelected: this._clearSelected,
            setSelected: this._setSelected,
            selectSpan: this._selectSpan,
            copySelected: this._copySelected,
            newTextNode: this._newTextNode,
            newDataBox: this._newDataBoxNode,
            newLineNode: this._newLineNode,
            addToClipboardStart: this._addToClipboardStart,
            insertClipboardLastFocus: this._insertClipboardLastFocus,
            handleCodeChange: this._handleCodeChange,
            getBaseNode: this._getBaseNode,
            insertNode: this._insertNode,
            setTurtleRef: this._setTurtleRef,
            openErrorDrawer: this.props.openErrorDrawer,
            updateIds: this._updateIds,
            setNodeSize: this._setNodeSize,
            setGraphicsSize: this._setGraphicsSize,
            unfixSizeLastFocus: this._unfixSizeLastFocus,
            boxer_selected: this.state.boxer_selected,
            deleteBoxerSelection: this._deleteBoxerSelection,
            cutSelected: this._cutSelected,
            undo: this._undo,
            setSpriteParams: this._setSpriteParams,
            addGraphicsComponent: this._addGraphicsComponent,
            toggleBoxTransparencyLastFocus: this._toggleBoxTransparencyLastFocus,
            toggleClosetLastFocus: this._toggleClosetLastFocus,
            toggleCloset: this._toggleCloset,
            getStateForSave: this._getStateForSave,
            containsPort: this._containsPort,
            retargetPortLastFocus: this._retargetPortLastFocus
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
            React.createElement(EditMenu, this.funcs),
            React.createElement(MakeMenu, this.funcs),
            React.createElement(BoxMenu, this.funcs),
            React.createElement(ViewMenu, this.funcs)
        );

        this.state.base_node.am_zoomed = true;
        let zoomed_node = this._getMatchingNode(this.state.zoomed_node_id, this.state.base_node);
        let key_bindings = [[["{"], e => {
            e.preventDefault();
            this._insertBoxFromKey("databox");
        }], [["["], e => {
            e.preventDefault();
            this._insertBoxFromKey("doitbox");
        }], [["esc"], e => {
            this._clearSelected();
        }], [["ctrl+v", "command+v"], e => {
            e.preventDefault();
            this._insertClipboardFromKey();
        }], [["ctrl+c", "command+c"], e => {
            e.preventDefault();
            this._copySelected();
        }], [["ctrl+x", "command+x"], e => {
            e.preventDefault();
            this._cutSelected();
        }], [["ctrl+z", "command+z"], e => {
            e.preventDefault();
            this._undo();
        }]];
        if (zoomed_node.kind == "port") {
            return React.createElement(
                React.Fragment,
                null,
                React.createElement(BoxerNavbar, { is_authenticated: window.is_authenticated,
                    user_name: window.username,
                    menus: menus
                }),
                React.createElement(NamedBox, { WrappedComponent: PortBox,
                    name: zoomed_node.name,
                    target: zoomed_node.target,
                    focusName: false,
                    am_zoomed: true,
                    closed: false,
                    selected: false,
                    portal_root: 'root',
                    portal_parent: null,
                    innerHeight: this.state.innerHeight,
                    innerWidth: this.state.innerWidth,
                    unique_id: this.state.zoomed_node_id,
                    funcs: this.funcs }),
                React.createElement(KeyTrap, { global: true, bindings: key_bindings })
            );
        } else if (zoomed_node.kind == "jsbox") {
            return React.createElement(
                React.Fragment,
                null,
                React.createElement(BoxerNavbar, { is_authenticated: window.is_authenticated,
                    user_name: window.username,
                    menus: menus
                }),
                React.createElement(NamedBox, { WrappedComponent: JsBox,
                    name: zoomed_node.name,
                    focusName: false,
                    am_zoomed: true,
                    closed: false,
                    selected: false,
                    kind: zoomed_node.kind,
                    the_code: zoomed_node.the_code,
                    className: 'data-box-outer',
                    portal_root: 'root',
                    portal_parent: null,
                    innerHeight: this.state.innerHeight,
                    innerWidth: this.state.innerWidth,
                    unique_id: this.state.zoomed_node_id,
                    clickable_label: false,
                    funcs: this.funcs }),
                React.createElement(KeyTrap, { global: true, bindings: key_bindings })
            );
        }
        return React.createElement(
            React.Fragment,
            null,
            React.createElement(BoxerNavbar, { is_authenticated: window.is_authenticated,
                user_name: window.username,
                menus: menus
            }),
            React.createElement(NamedBox, { WrappedComponent: DataBox,
                name: zoomed_node.name,
                funcs: this.funcs,
                showCloset: zoomed_node.showCloset,
                closetLine: zoomed_node.closetLine,
                kind: zoomed_node.kind,
                transparent: zoomed_node.transparent,
                className: 'data-box-outer',
                focusName: false,
                am_zoomed: true,
                closed: false,
                portal_root: 'root',
                portal_parent: null,
                innerHeight: this.state.innerHeight,
                innerWidth: this.state.innerWidth,
                unique_id: this.state.zoomed_node_id,
                clickable_label: false,
                line_list: zoomed_node.line_list }),
            React.createElement(KeyTrap, { global: true, bindings: key_bindings })
        );
    }
}

MainApp.propTypes = {
    world_state: PropTypes.object
};

_main_main();