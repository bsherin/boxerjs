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
import { KeyTrap } from "./key_trap.js";
import { getCaretPosition } from "./utilities";
import { withStatus } from "./toaster.js";
import { withErrorDrawer } from "./error_drawer.js";
import { container_kinds, graphics_kinds } from "./shared_consts.js";
import { shape_classes } from "./pixi_shapes.js";
import { svg_shape_classes } from "./svg_shapes.js";
import { mutatorMixin, _getMatchingNode } from "./mutators.js";
import { nodeCreatorMixin } from "./node_creators.js";
import { copySelectMixin } from "./copy_select.js";

import { SpriteNode } from "./sprite_commands.js";
import { GraphicsNode } from "./graphics_box_commands.js";

const node_classes = {
    "sprite": SpriteNode,
    "graphics": GraphicsNode,
    "svggraphics": GraphicsNode
};

window.freeze = false;

let tsocket = null;

// Prevent capturing focus by a button.
$(document).on('mousedown', "button", function (event) {
    event.preventDefault();
});

const MAX_UNDO_SAVES = 20;

function _main_main() {
    console.log("entering start_post_load");
    window._running = 0;
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
        let new_node_list = [];
        for (let cnode of nd.node_list) {
            _rehydrateComponents(cnode);
            if (Object.keys(node_classes).includes(cnode.kind)) {
                cnode = new node_classes[cnode.kind](cnode);
            }
            new_node_list.push(cnode);
        }
        nd.node_list = new_node_list;
    }
}

class MainApp extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.state = {};
        if (props.world_state == null) {
            this.state.node_dict = {};
            let [world_node_id, temp_dict] = this._newDataBoxNode([], false, temp_dict);
            this.state.node_dict = {};
            for (let nid in temp_dict) {
                if (nid == world_node_id) {
                    let updated_node = temp_dict[nid];
                    updated_node["unique_id"] = "world";
                    this.state.node_dict["world"] = updated_node;
                } else {
                    this.state.node_dict[nid] = temp_dict[nmid];
                }
            }
        } else {
            let base_node = _.cloneDeep(props.world_state.base_node);
            this._healStructure(base_node);
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
        this.exportFuncs();
    }

    exportFuncs() {
        window.changeNode = this._changeNode;
        window.newDataBoxNode = this._newDataBoxNode;
        window.newClosetLine = this._newClosetLine;
        window.healLine = this._healLine;
        window.newLineNode = this._newLineNode;
        window.newTextNode = this._newTextNode;
        window.newDoitNode = this._newDoitBoxNode;
        window.newPort = this._newPort;
        window.newColorBox = this._newColorBox;
        window.newGraphicsBox = this._newGraphicsBox;
        window.newSvgGraphicsBox = this._newSvgGraphicsBox;
        window.newTurtleShape = this._newTurtleShape;
        window.newValueBox = this._newValueBox;
        window.addGraphicsComponent = this._addGraphicsComponent;
        window.addErrorDrawerEntry = this.props.addErrorDrawerEntry;
        window.openErrorDrawer = this.props.openErrorDrawer;
        window.updateIds = this._updateIds;
        window.getBaseNode = this._getBaseNode;
        window.getNode = this._getNode;
        window.setSpriteParams = this._setSpriteParams;
    }

    componentDidMount() {
        window.addEventListener("resize", this._update_window_dimensions);
        this.state.history = [_.cloneDeep(this.state.base_node)];
        let new_base = _.cloneDeep(this.state.base_node);
        new_base.line_list[0].node_list[0].setFocus = ["root", 0];
        this.setState({ base_node: new_base });
    }

    componentDidUpdate(preProps, preState, snapShot) {
        if (window._running > 0) {
            return;
        }
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

    _renumberNodes(line_id, target_dict) {
        let counter = 0;

        for (let nodeid of target_dict[line_id].node_list) {
            target_dict = this.changeNodeAndReturn(nodeid, "position", counter, target_dict);
            counter += 1;
        }
        return target_dict;
    }

    _renumberLines(node_id, target_dict) {
        let counter = 0;

        for (let lineid of target_dict[line_id].linelist) {
            target_dict = this.changeNodeAndReturn(lineid, "position", counter, target_dict);
            counter += 1;
        }
        return target_dict;
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
                let new_spec = { type: comp.type.type_name, props: comp.props };
                nd.component_specs.push(new_spec);
            }
            nd.drawn_components = [];
        }
        if (container_kinds.includes(nd.kind)) {
            for (let lin of nd.line_list) {
                this._dehydrateComponents(lin);
            }
        } else if (nd.kind == "line") {
            let new_node_list = [];
            for (let cnode of nd.node_list) {
                if (Object.keys(node_classes).includes(cnode.kind)) {
                    let new_node = {};
                    for (let param of cnode.saveParams) {
                        new_node[param] = cnode[param];
                    }
                    cnode = new_node;
                }
                this._dehydrateComponents(cnode);
                new_node_list.push(cnode);
            }
            nd.node_list = new_node_list;
        }
    }

    _getContainingGraphicsBox(start_id, target_dict) {
        let base_id = "world";
        let self = this;
        function getGBox(the_id) {
            if (the_id == base_id) {
                return null;
            }
            let cnode = target_dict[the_id];
            if (graphics_kinds.includes(cnode.kind)) {
                return cnode;
            } else {
                return getGBox(cnode.parent);
            }
        }
        return getGBox(start_id);
    }

    _setPortTarget(port_id, target_id) {
        this._changeNode(port_id, "target", target_id);
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
        let new_base = this.state.base_node;
        let mnode = _getMatchingNode(boxId, new_base);
        let mline = _getMatchingNode(mnode.parent, new_base);
        if (mline.parent == null) return;
        let mbox = _getMatchingNode(mline.parent, new_base);
        if (mbox.name == "world") return;
        this._changeNode(mbox.unique_id, "transparent", !mbox.transparent);
    }

    _toggleCloset(boxId) {
        let new_base = this.state.base_node;
        let mnode = _getMatchingNode(boxId, new_base);
        let mline = _getMatchingNode(mnode.parent, new_base);
        if (mline.parent == null) return;
        let mbox = _getMatchingNode(mline.parent, new_base);
        if (!mbox.closetLine) {
            let closetLine = this._newClosetLine();
            closetLine.parent = mbox.unique_id;
            this._changeNodeMulti(mbox.unique_id, { closetLine: closetLine, showCloset: !mbox.showCloset });
        } else {
            this._changeNode(mbox.unique_id, "showCloset", !mbox.showCloset);
        }
    }

    _containsPort(boxId) {
        let mnode = _getMatchingNode(boxId, this.state.base_node);
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
        this._changeNode(port_id, "target", null, () => {
            this._enterPortTargetMode(port_id);
        });
    }

    _mergeTextNodes(n1, n2, line_id, target_dict) {
        let id1 = target_dict[line_id].node_list[n1];
        let id2 = target_dict[line_id].node_list[id2];
        target_dict = this.changeNodeAndReturn(id1, "the_text", target_dict[id1].the_text + target_dict[id2].the_text);
        target_dict = this._removeNodeAndReturn(id2, target_dict);
        return target_dict;
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

    _positionAfterBox(databox_id, portal_root) {
        let mnode = _getMatchingNode(databox_id, this.state.base_node);
        let parent_node = _getMatchingNode(mnode.parent, this.state.base_node);
        let target_id = parent_node.node_list[mnode.position + 1].unique_id;
        this._changeNode(target_id, "setFocus", [portal_root, 0]);
    }

    _handleTextChange(uid, new_html) {
        this._changeNode(uid, "the_text", new_html);
    }

    _handleCodeChange(uid, new_code) {
        this._changeNode(uid, "the_code", new_code);
    }

    _setNodeSize(uid, new_width, new_height, callback = null) {

        let val_dict = {};
        if (!new_width) {
            val_dict["fixed_size"] = false;
            val_dict["fixed_width"] = null;
            val_dict["fixed_height"] = null;
        } else {
            val_dict["fixed_size"] = true;
            val_dict["fixed_width"] = new_width;
            val_dict["fixed_height"] = new_height;
        }
        this._changeNodeMulti(uid, val_dict, callback);
    }

    _setGraphicsSize(uid, new_width, new_height, callback = null) {
        let val_dict = {};
        val_dict.graphics_fixed_width = new_width;
        val_dict.graphics_fixed_height = new_height;
        his._changeNodeMulti(uid, val_dict, callback);
    }

    _getParentId(uid) {
        return _getMatchingNode(uid, this.state.base_node).parent;
    }

    _getNode(uid) {
        return _getMatchingNode(uid, this.state.base_node);
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

    _insertClipboardFromKey() {
        this._insertClipboard(document.activeElement.id, getCaretPosition(document.activeElement), this.last_focus_portal_root);
    }

    _insertClipboardLastFocus() {
        this._insertClipboard(this.last_focus_id, this.last_focus_pos, this.last_focus_portal_root);
    }

    _unfixSizeLastFocus() {
        let new_base = this.state.base_node;
        let mnode = _getMatchingNode(this.last_focus_id, new_base);
        let parentLine = _getMatchingNode(mnode.parent, new_base);
        this._changeNode(parentLine.parent, "fixed_size", false);
    }

    _getBaseNode() {
        return this.state.base_node;
    }

    _findParents(node_id, base_node = null) {
        if (!base_node) {
            base_node = this.state.base_node;
        }
        let mnode = _getMatchingNode(node_id, base_node);
        let parents = [mnode.unique_id];
        let par = mnode.parent;
        while (par) {
            parents.push(par);
            mnode = _getMatchingNode(par, base_node);
            par = mnode.parent;
        }
        return parents;
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
            insertNode: this._insertNodeIh,
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
            retargetPort: this._retargetPort,
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
        let zoomed_node = _getMatchingNode(this.state.zoomed_node_id, this.state.base_node);
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
                React.createElement(PortBox, { name: zoomed_node.name,
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
                React.createElement(JsBox, { name: zoomed_node.name,
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
            React.createElement(DataBox, { name: zoomed_node.name,
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

Object.assign(MainApp.prototype, mutatorMixin);
Object.assign(MainApp.prototype, nodeCreatorMixin);
Object.assign(MainApp.prototype, copySelectMixin);

_main_main();