

import React from "react";
import * as ReactDOM from 'react-dom'
import PropTypes from 'prop-types';

import _ from 'lodash';

import "../css/boxer.scss";

import {doBinding, guid} from "./utilities.js";
import {DataBox, PortBox, JsBox, loader} from "./nodes.js";
import {BoxerNavbar} from "./blueprint_navbar.js";
import {ProjectMenu, BoxMenu, MakeMenu, EditMenu, ViewMenu} from "./main_menus_react.js";
import {postAjax} from "./communication_react.js"

import {BoxerSocket} from "./boxer_socket.js"
import {KeyTrap} from "./key_trap.js";
import {getCaretPosition} from "./utilities";
import {withStatus} from "./toaster.js";
import {withErrorDrawer} from "./error_drawer.js";
import {container_kinds, graphics_kinds} from "./shared_consts.js";
import {shape_classes} from "./pixi_shapes.js";
import {svg_shape_classes} from "./svg_shapes.js"
import {mutatorMixin} from "./mutators.js";
import {nodeCreatorMixin} from "./node_creators.js";
import {copySelectMixin} from "./copy_select.js";

import {SpriteNode} from "./sprite_commands.js"
import {GraphicsNode} from "./graphics_box_commands.js"

const node_classes = {
    "sprite": SpriteNode,
    "graphics": GraphicsNode,
    "svggraphics": GraphicsNode
}

window.freeze = false;

let tsocket = null;

// Prevent capturing focus by a button.
$(document).on('mousedown', "button",
    function(event) {
        event.preventDefault();
    }
);


const MAX_UNDO_SAVES = 20;

function _main_main() {
    console.log("entering start_post_load");
    window._running = 0;
    window.update_on_ticks = false;
    window.tick_received = false;
    tsocket = new BoxerSocket("boxer", 5000);

    let MainAppPlus = withErrorDrawer(withStatus(MainApp, tsocket), tsocket);

    let domContainer = document.querySelector('#main-root');
    if (window.world_name == "") {
        loader.load(()=>{
            ReactDOM.render(<MainAppPlus data={null}/>, domContainer)
        })
    }
    else {
        postAjax("get_data", {world_name: window.world_name}, got_data);
    }
    function got_data(result) {
        if (result.success) {
            let world_state = result.project_dict.world_state;
            if (world_state.hasOwnProperty("base_node")) {
                world_state.node_dict = convertLegacySave(world_state.base_node);
                world_state.base_node = null
            }
            _rehydrateComponents(world_state.node_dict);
            loader.load(()=>{
                 ReactDOM.render(<MainAppPlus world_state={world_state}/>, domContainer)
            })
        }
    }
}

function convertLegacySave(base_node) {
    base_node.unique_id = "world"

    return convertNode(base_node, {})

    function convertNode(the_node, ndict) {
        if (container_kinds.includes(the_node.kind)) {
            let llist = [];
            for (let line of the_node.line_list) {
                llist.push(line.unique_id)
                ndict = convertNode(line, ndict)
            }
            the_node.line_list = llist;
            if (the_node.closetLine) {
                let saved_id = the_node.closetLine.unique_id;
                ndict = convertNode(the_node.closetLine, ndict);
                the_node.closetLine = saved_id;
            }

        } else if (the_node.kind == "line") {
            let nlist = [];
            for (let nd of the_node.node_list) {
                nlist.push(nd.unique_id);
                ndict = convertNode(nd, ndict)
            }
            the_node.node_list = nlist
        }
        ndict[the_node.unique_id] = the_node
        return ndict
    }
}

function _rehydrateComponents(ndict) {
    for (let nd_id in ndict) {
        let nd = ndict[nd_id];
        if (node_classes.hasOwnProperty(nd.kind)) {
            ndict[nd_id] = new node_classes[nd.kind](nd)
            nd = ndict[nd_id]
        }
        if (nd.kind == "graphics") {
            nd["drawn_components"] = [];
            if (nd.hasOwnProperty("component_specs")) {
                for (let comp of nd.component_specs) {
                    let Dcomp = shape_classes[comp.type];
                    let new_comp = <Dcomp {...comp.props}/>;
                    nd.drawn_components.push(new_comp)
                }
                nd.component_specs = [];
            }
        }
        else if (nd.kind == "svggraphics") {
            nd["drawn_components"] = [];
            if (nd.hasOwnProperty("component_specs")) {
                for (let comp of nd.component_specs) {
                    let Dcomp = svg_shape_classes[comp.type];
                    let new_comp = <Dcomp {...comp.props}/>;
                    nd.drawn_components.push(new_comp)
                }
                nd.component_specs = [];
            }
        }
    }
}

class MainApp extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        if (props.world_state == null) {
            this.state.node_dict = {};
            this.clipboard_dict = {};
            let [world_node_id, temp_dict] = this._newDataBoxNode([], false, {});
            this.state.node_dict = {}
            for (let nid in temp_dict) {
                if (nid == world_node_id) {
                    let updated_node = temp_dict[nid]
                    updated_node["unique_id"] = "world";
                    updated_node["name"] = "world";

                    this.state.node_dict["world"] = updated_node
                    for (let lin_id of this.state.node_dict["world"].line_list) {
                        this.state.node_dict[lin_id].parent = "world"
                    }
                }
                else {
                    this.state.node_dict[nid] = temp_dict[nid]
                }
            }
        }
        else {
            let node_dict = _.cloneDeep(props.world_state.node_dict);
            node_dict = this._healStructure("world", node_dict);
            this.state.node_dict= node_dict;
        }
        this.state.executing = false;
        this.state.zoomed_node_id = "world";
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
        this.present = this.state.node_dict;
        this.undoing = false;
        this.exportFuncs();
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (window._running > 0 && window.update_on_ticks) {
            if (window.tick_received) {
                window.tick_received = false;
                return true
            }
            else {
                return false
            }
        }
        return true
    }

    _setExecuting(abool) {
        this.setState({executing: abool})
    }

    exportFuncs() {
        window.setExecuting = this._setExecuting;
        window.changeNode = this._changeNode;
        window.setLineList = this._setLineList;
        window.newDataBoxNode = this._newDataBoxNode;
        window.newErrorNode = this._newErrorNode;
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
        window.getNode = this._getNode;
        window.getNodeDict = this._getNodeDict;
        window.getNthLine = this._getNthLine;
        window.getNthNode = this._getNthNode;
        window.getln = this._getln;
        window.cloneNode = this._cloneNode;
        window.cloneLine = this._cloneLine;
        window.cloneNodetoTrueND = this._cloneNodeToTrueND;
        window.cloneLinetoTrueND = this._cloneLineToTrueND;
        window.createClosetAndReturn = this._createClosetAndReturn;
        window.setSpriteParams = this._setSpriteParams
    }

    componentDidMount() {
        window.addEventListener("resize", this._update_window_dimensions);
        this.state.history = [_.cloneDeep(this.state.node_dict)];

        this._setFocus(this._getln("world", 0, 0, this.state.node_dict), "root", 0)
    }

    componentDidUpdate(preProps, preState, snapShot) {
        if (window._running > 0) {
            return
        }
        if (this.undoing) {
            this.undoing = false;
            this.present = _.cloneDeep(this.state.node_dict);
        }
        else {
            if (!this._eqTest(this.state.node_dict, this.present)) {
                this.history.unshift(this.present);
                if (this.history.length > MAX_UNDO_SAVES) {
                    this.history = this.history.slice(0, MAX_UNDO_SAVES)
                }
                this.present = this.state.node_dict
            }
        }
    }


    _undo() {
        if (this.history.length > 0) {
            this.undoing = true;
            this.setState({"node_dict": this.history.shift()})
        }
    }

    _update_window_dimensions() {
        this.setState({
            "innerWidth": window.innerWidth,
            "innerHeight": window.innerHeight
        })
    }

    _getStateForSave() {
        let new_state = _.cloneDeep(this.state);
        this._dehydrateComponents(new_state.node_dict);
        return new_state
    }

    _dehydrateComponents(ndict) {
        for (let nd_id in ndict) {
            let nd = ndict[nd_id];
             if (nd.kind == "graphics") {
                nd.component_specs = [];
                for (let comp of nd.drawn_components) {
                    let new_spec = {type: comp.type, props: comp.props};
                    nd.component_specs.push(new_spec)
                }
                nd.drawn_components = [];
            }
            else if (nd.kind == "svggraphics"){
                nd.component_specs = [];
                for (let comp of nd.drawn_components) {
                    let new_spec = {type: comp.type.type_name, props: comp.props};
                    nd.component_specs.push(new_spec)
                }
                nd.drawn_components = [];
            }
        }
    }


    _getContainingGraphicsBox(start_id, target_dict) {
        let base_id = "world";
        let self = this;
        function getGBox(the_id) {
            if (the_id == base_id) {
                return null
            }
            let cnode = target_dict[the_id]
            if (graphics_kinds.includes(cnode.kind)) {
                return cnode
            }
            else {
                return getGBox(cnode.parent)
            }
        }
        return getGBox(start_id);
    }

    _setPortTarget(port_id, target_id) {
        this._changeNode(port_id, "target", target_id)
    }

    _enterPortTargetMode(port_id) {
        let self = this;
        document.addEventListener("click", gotClick);

        function gotClick(event){
            let target = event.target.closest(".targetable");
            if (!target) return;
                self._setPortTarget(port_id, target.id);
                document.removeEventListener("click", gotClick)
        }
    }

    _toggleBoxTransparency(boxId) {
        let mnode = this.state.node_dict[boxId];
        let mline = this.state.node_dict[mnode.parent];
        if (mline.parent == null) return;
        let mbox = this.state.node_dict[mline.parent];
        if (mbox.name == "world") return;
        this._changeNode(mbox.unique_id, "transparent", !mbox.transparent)

    }

    _toggleCloset(boxId) {
        let mnode = this.state.node_dict[boxId];
        let mline = this.state.node_dict[mnode.parent];
        if (mline.parent == null) return;
        let mbox = this.state.node_dict[mline.parent];
        if (!mbox.closetLine) {
            this._createCloset(mbox.unique_id, null, !mbox.showCloset);
        }
        else {
            this._changeNode(mbox.unique_id, "showCloset", !mbox.showCloset, null, null)
        }

    }

    _containsPort(boxId) {
        let mnode = this.state.node_dict[boxId];
        let self = this;
        return checkNode(mnode);

        function checkNode(the_node) {
            if (container_kinds.includes(the_node.kind)) {
                for (let lin_id of the_node.line_list) {
                    let lin = self.state.node_dict[lin_id];
                    for (let nd_id of lin.node_list) {
                        let nd = self.state.node_dict[nd_id];
                        if (nd.kind == "port") {
                            return true
                        }
                        if (checkNode(nd)) {
                            return true
                        }
                    }
                }
            }
            return false
        }

    }

    _toggleBoxTransparencyLastFocus() {
        this._toggleBoxTransparency(this.last_focus_id)
    }

    _toggleClosetLastFocus() {
        this._toggleCloset(this.last_focus_id)
    }

    _insertBoxLastFocus(kind) {
        this._insertBoxInText(kind, this.last_focus_id, this.last_focus_pos, this.last_focus_portal_root)
    }

    _retargetPortLastFocus() {
        this._retargetPort(this.last_focus_portal_root)
    }

    _retargetPort(port_id) {
        this._changeNode(port_id, "target", null, ()=> {
            this._enterPortTargetMode(port_id)
        })
    }

    _compareNode(n1, n2, fields) {
        for (let field of fields) {
            if (n1[field] != n2[field]) {
                return false
            }
        }
        return true
    }

    _comparePortboxes(db1, db2) {
        let fields = ["name", "am_zoomed", "closed", "target"];
        return this._compareNode(db1, db2, fields)
    }
    _compareDataboxes(db1, db2_id) {
        let fields = ["name", "am_zoomed", "closed", "line_list"];
        return this._compareNode(db1, db2, fields)
    }

    _compareLines(l1_id, l2_id) {
        let fields = ["line_list"];
        return this._compareNode(l1_id, db2, fields)
    }

    _compareTexts(t1, t2) {
        return t1.the_text == t2.the_text
    }

    _compareJsBoxes(js1, js2) {
        return js1.the_code == js2.the_code
    }

    _compareTurtleBoxes(tb1, tb2) {
        return tb1.width == tb2.width && tb1.height == tb2.height
    }


    _eqTest(ndict1, ndict2) {
        for (let nid in ndict1) {
            let obj1 = ndict1[nid];
            if (!Object.hasOwnProperty(ndict2, nid)) {
                return false
            }
            let obj2 = ndict2[nid]
            if (obj1.kind != obj2.kind) {
                return false
            }
            if (container_kinds.includes(obj1.kind)){
                if (!this._compareDataboxes(obj1, obj2)) {
                    return false
                }
            }
            if (obj2.kind == "text") {
                if (!this._compareTexts(obj1, obj2)) {
                    return false
                }
            }
            if (obj2.kind == "jsbox" || obj2.kind == "htmlbox") {
                if (!this._compareJsBoxes(obj1, obj2)) return false
            }
            if (obj2.kind == "port") {
                 if (!this._comparePortboxes(obj1, obj2)) return false
            }
        }

    }

    _positionAfterBox(databox_id, portal_root) {
        let mnode = this.state.node_dict[databox_id];

        let target_id = this._getNthNode(mnode.parent, mnode.position + 1, this.state.node_dict).unique_id
        this._setFocus(target_id, portal_root, 0)
    }


    _handleTextChange(uid, new_html) {
        this._changeNode(uid, "the_text", new_html)
    }

    _handleCodeChange(uid, new_code) {
        this._changeNode(uid, "the_code", new_code)
    }

    _setNodeSize(uid, new_width, new_height, callback=null) {
        
        let val_dict = {};
        if (!new_width) {
            val_dict["fixed_size"] = false;
            val_dict["fixed_width"] = null;
            val_dict["fixed_height"] = null
        }
        else {
            val_dict["fixed_size"] = true;
            val_dict["fixed_width"] = new_width;
            val_dict["fixed_height"] = new_height;
        }
        this._changeNodeMulti(uid, val_dict, callback)
    }

    _setGraphicsSize(uid, new_width, new_height, callback=null) {
        let val_dict = {};
        val_dict.graphics_fixed_width = new_width;
        val_dict.graphics_fixed_height = new_height;
        this._changeNodeMulti(uid, val_dict, callback)
    }
    
    _getParentId(uid) {
        return this.state.target_dict[uid].parent
    }

    _getNode(uid) {
        return this.state.node_dict[uid]
    }


    _storeFocus(uid, position, portal_root) {
        this.last_focus_id = uid;
        this.last_focus_pos = position;
        this.last_focus_portal_root = portal_root;

    }

    _insertBoxFromKey(kind) {
        this._insertBoxInText(kind, document.activeElement.id, getCaretPosition(document.activeElement), this.last_focus_portal_root)
    }

    _focusNameLastFocus() {
        this._focusName(this.last_focus_id)
    }



     _insertClipboardFromKey() {
        this._insertClipboard(document.activeElement.id, getCaretPosition(document.activeElement), this.last_focus_portal_root)
    }

    _insertClipboardLastFocus() {
        this._insertClipboard(this.last_focus_id, this.last_focus_pos, this.last_focus_portal_root)
    }

    _unfixSizeLastFocus() {
        let mnode = this.state.node_dict[this.last_focus_id];
        let parentLine = this.state.node_dict[mnode.parent];
        this._changeNode(parentLine.parent, "fixed_size", false)
    }

    _getNodeDict() {
        return this.state.node_dict
    }

    _findParents(node_id, target_dict=null) {
        if (!target_dict) {
            target_dict = this.state.node_dict
        }
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

    get funcs () {
        let funcs = {
            handleTextChange: this._handleTextChange,
            changeNode: this._changeNode,
            cloneNode: this._cloneNode,
            setFocus: this._setFocus,
            insertBoxInText: this._insertBoxInText,
            deletePrecedingBox: this._deletePrecedingBox,
            deleteToLineEnd: this._deleteToLineEnd,
            splitLineAtTextPosition: this._splitLineAtTextPosition,
            getParentId: this._getParentId,
            getNode: this._getNode,
            getln: this._getln,
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
            addTextToClipboardStart: this._addTextToClipBoardStart,
            insertClipboardLastFocus: this._insertClipboardLastFocus,
            handleCodeChange: this._handleCodeChange,
            getNodeDict: this._getNodeDict,
            insertNode: this._insertNode,
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
        return funcs
    }

    render() {

        let menus = (
            <React.Fragment>
                <ProjectMenu {...this.funcs}
                             {...this.props.statusFuncs}
                             world_state={this.props.world_state}
                />
                <EditMenu {...this.funcs}
                />
                <MakeMenu {...this.funcs}
                />
                <BoxMenu {...this.funcs}
                />
                <ViewMenu {...this.funcs}
                />
            </React.Fragment>
        );

        this.state.node_dict["world"].am_zoomed = true;
        let zoomed_node = this.state.node_dict[this.state.zoomed_node_id];
        let key_bindings = [
            [["{"], (e)=> {
                e.preventDefault();
                this._insertBoxFromKey("databox");
            }],
            [["["], (e)=> {
                e.preventDefault();
                this._insertBoxFromKey("doitbox");
            }],
            [["esc"], (e)=> {
                this._clearSelected()
            }],
            [["ctrl+v", "command+v"], (e)=>{
                e.preventDefault();
                this._insertClipboardFromKey()
            }],
            [["ctrl+c", "command+c"], (e)=>{
                e.preventDefault();
                this._copySelected()
            }],
            [["ctrl+x", "command+x"], (e)=>{
                e.preventDefault();
                this._cutSelected()
            }],
            [["ctrl+z", "command+z"], (e)=>{
                e.preventDefault();
                this._undo()
            }]
        ];
        if (zoomed_node.kind == "port") {
            return (
                <React.Fragment>
                    <BoxerNavbar is_authenticated={window.is_authenticated}
                                  user_name={window.username}
                                  menus={menus}
                    />
                    <PortBox name={zoomed_node.name}
                             target={zoomed_node.target}
                             focusName={false}
                             am_zoomed={true}
                             closed={false}
                             selected={false}
                             portal_root="root"
                             portal_parent={null}
                             innerHeight={this.state.innerHeight}
                             innerWidth={this.state.innerWidth}
                             unique_id={this.state.zoomed_node_id}
                             funcs={this.funcs}/>
                     <KeyTrap global={true}  bindings={key_bindings} />
             </React.Fragment>
            )
        }
        else if (zoomed_node.kind == "jsbox") {
            return (
                <React.Fragment>
                    <BoxerNavbar is_authenticated={window.is_authenticated}
                                  user_name={window.username}
                                  menus={menus}
                    />
                    <JsBox name={zoomed_node.name}
                           focusName={false}
                           am_zoomed={true}
                           closed={false}
                           selected={false}
                           kind={zoomed_node.kind}
                           the_code={zoomed_node.the_code}
                           className="data-box-outer"
                           portal_root="root"
                           portal_parent={null}
                           innerHeight={this.state.innerHeight}
                           innerWidth={this.state.innerWidth}
                           unique_id={this.state.zoomed_node_id}
                           clickable_label={false}
                           funcs={this.funcs}/>
                     <KeyTrap global={true}  bindings={key_bindings} />
             </React.Fragment>
            )
        }
        return (
            <React.Fragment>
                <BoxerNavbar is_authenticated={window.is_authenticated}
                              user_name={window.username}
                              menus={menus}
                />
                <DataBox name={zoomed_node.name}
                         funcs={this.funcs}
                         showCloset={zoomed_node.showCloset}
                         closetLine={zoomed_node.closetLine}
                         kind={zoomed_node.kind}
                         transparent={zoomed_node.transparent}
                         className="data-box-outer"
                         focusName={false}
                         am_zoomed={true}
                         closed={false}
                         portal_root="root"
                         portal_parent={null}
                         innerHeight={this.state.innerHeight}
                         innerWidth={this.state.innerWidth}
                         unique_id={this.state.zoomed_node_id}
                         clickable_label={false}
                         line_list={zoomed_node.line_list}/>
                 <KeyTrap global={true}  bindings={key_bindings} />
             </React.Fragment>
        )
    }
}

MainApp.propTypes = {
    world_state: PropTypes.object
};

Object.assign(MainApp.prototype, mutatorMixin)
Object.assign(MainApp.prototype, nodeCreatorMixin)
Object.assign(MainApp.prototype, copySelectMixin)


_main_main();

