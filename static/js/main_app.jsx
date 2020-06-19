

import React from "react";
import * as ReactDOM from 'react-dom'
import PropTypes from 'prop-types';

import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import {batch, connect} from 'react-redux';

import _ from 'lodash';

import "../css/boxer.scss";

import {rootReducer} from './reducers.js'
import {mapDispatchToProps} from "./actions/dispatch_mapper.js";
import {_getln} from "./selectors.js"

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
import {container_kinds} from "./shared_consts.js";
import {shape_classes} from "./pixi_shapes.js";
import {svg_shape_classes} from "./svg_shapes.js"

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

var store;

const MAX_UNDO_SAVES = 20;

function _main_main() {
    console.log("entering start_post_load");
    window._running = 0;
    window.update_on_ticks = false;
    window.tick_received = false;
    tsocket = new BoxerSocket("boxer", 5000);

    let domContainer = document.querySelector('#main-root');
    if (window.world_name == "") {
        store = createStore(rootReducer, applyMiddleware(thunk));
        window.store = store;
        loader.load(()=>{
            ReactDOM.render(
                <Provider store={store}>
                    <MainAppPlus world_state={null}/>
                </Provider>,
                domContainer)
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
            store = createStore(rootReducer, world_state, applyMiddleware(thunk));
            window.store = store;
            loader.load(()=>{
                 ReactDOM.render(
                     <MainAppPlus world_state={world_state}/>, domContainer)
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
        if (props.world_state == null) {
            this.clipboard_dict = {};

            batch(()=>{
                props.newDataBoxNode([], false, "world")
                props.healStructure("world")
                props.changeNodeMulti("world", {"am_zoomed": true, "name": "world"})
            })
        }
        else {
             props.healStructure("world");
        }

        this.history = [];
        this.present = store.getState().node_dict;
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
        window.addErrorDrawerEntry = this.props.addErrorDrawerEntry;
        window.openErrorDrawer = this.props.openErrorDrawer;
    }

    componentDidMount() {
        window.addEventListener("resize", this._update_window_dimensions);
        this.history = [_.cloneDeep(store.getState().node_dict)];

        this.props.setFocus(_getln("world", 0, 0, store.getState().node_dict), "root", 0)
    }

    componentDidUpdate(preProps, preState, snapShot) {
        if (window._running > 0) {
            return
        }
        if (this.undoing) {
            this.undoing = false;
            this.present = _.cloneDeep(store.getState().node_dict);
        }
        else {
            if (!this._eqTest(store.getState().node_dict, this.present)) {
                this.history.unshift(this.present);
                if (this.history.length > MAX_UNDO_SAVES) {
                    this.history = this.history.slice(0, MAX_UNDO_SAVES)
                }
                this.present = store.getState().node_dict
            }
        }
    }


    _undo() {
        if (this.history.length > 0) {
            this.undoing = true;
            this.props.setNodeDict(this.history.shift())
        }
    }

    _update_window_dimensions() {
        batch(()=>{
            this.props.setGlobal("innerWidth", window.innerWidth);
            this.props.setGlobal("innerHeight", window.innerHeight);
        })
    }

    _getStateForSave() {
        let new_state = _.cloneDeep(store.getState());
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


    get storedFocus() {
        return store.getState().stored_focus
    }

    get nodeDict() {
        return store.getState().node_dict
    }
    // _toggleBoxTransparencyLastFocus() {
    //     this._toggleBoxTransparency(this.storedFocus.last_focus_id)
    // }

    // _toggleClosetLastFocus() {
    //     this._toggleCloset(this.storedFocus.last_focus_id)
    // }

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

    _getParentId(uid) {
        return store.getState().node_dict[uid].parent
    }

    _getNode(uid) {
        return store.getState().node_dict[uid]
    }

    _insertBoxFromKey(kind) {
        this.props.insertBoxInText(kind, document.activeElement.id, getCaretPosition(document.activeElement),
            this.storedFocus.last_focus_portal_root)
    }

     _insertClipboardFromKey() {
        this.props.insertClipboard(document.activeElement.id, getCaretPosition(document.activeElement),
            this.storedFocus.last_focus_portal_root)
    }

    _insertClipboardLastFocus() {
        this.props.insertClipboard(this.storedFocus.last_focus_id, this.storedFocus.last_focus_pos, this.storedFocus.last_focus_portal_root)
    }

    _getNodeDict() {
        return store.getState().node_dict
    }


    get funcs () {
        let funcs = {
            getParentId: this._getParentId,
            getNode: this._getNode,
            openErrorDrawer: this.props.openErrorDrawer,
            undo: this._undo,
            getStateForSave: this._getStateForSave,
        };
        return funcs
    }

    render() {
        let node_dict = store.getState()["node_dict"]
        let menus = (
            <React.Fragment>
                <ProjectMenu {...this.props.statusFuncs}
                    getStateforSave={this._getStateForSave}
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

        let zoomed_node = node_dict[store.getState().state_globals.zoomed_node_id];
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
                this.props.clearSelected()
            }],
            [["ctrl+v", "command+v"], (e)=>{
                e.preventDefault();
                this._insertClipboardFromKey()
            }],
            [["ctrl+c", "command+c"], (e)=>{
                e.preventDefault();
                this.props.copySelected()
            }],
            [["ctrl+x", "command+x"], (e)=>{
                e.preventDefault();
                this.props.cutSelected()
            }],
            [["ctrl+z", "command+z"], (e)=>{
                e.preventDefault();
                this._undo()
            }]
        ];
        if (zoomed_node.kind == "port") {
            return (

                <Provider store={store}>
                    <BoxerNavbar is_authenticated={window.is_authenticated}
                                  user_name={window.username}
                                  menus={menus}
                    />
                    <PortBox name={zoomed_node.name}
                             target={zoomed_node.target}
                             focusNameTag={false}
                             am_zoomed={true}
                             closed={false}
                             selected={false}
                             portal_root="root"
                             portal_parent={null}
                             innerHeight={store.getState().state_globals.innerHeight}
                             innerWidth={store.getState().state_globals.innerWidth}
                             unique_id={this.state.zoomed_node_id}
                             funcs={this.funcs}/>
                     <KeyTrap global={true}  bindings={key_bindings} />
             </Provider>
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
                           focusNameTag={false}
                           am_zoomed={true}
                           closed={false}
                           selected={false}
                           kind={zoomed_node.kind}
                           the_code={zoomed_node.the_code}
                           className="data-box-outer"
                           portal_root="root"
                           portal_parent={null}
                           innerHeight={store.getState().state_globals.innerHeight}
                           innerWidth={store.getState().state_globals.innerWidth}
                           unique_id={store.getState().state_globals.zoomed_node_id}
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
                <DataBox className="data-box-outer"
                         focusNameTag={false}
                         am_zoomed={true}
                         closed={false}
                         portal_root="root"
                         portal_parent={null}
                         innerHeight={store.getState().state_globals.innerHeight}
                         innerWidth={store.getState().state_globals.innerWidth}
                         unique_id={store.getState().state_globals.zoomed_node_id}
                         clickable_label={false}/>
                 <KeyTrap global={true}  bindings={key_bindings} />
             </React.Fragment>
        )
    }
}

MainApp.propTypes = {
    world_state: PropTypes.object
};

// Object.assign(MainApp.prototype, mutatorMixin)
// Object.assign(MainApp.prototype, nodeCreatorMixin)
// Object.assign(MainApp.prototype, copySelectMixin)

function mapStateToProps(state, ownProps) {
    return {}
}

let MainAppPlus = connect(mapStateToProps, mapDispatchToProps)(withErrorDrawer(withStatus(MainApp, tsocket), tsocket));

_main_main();

