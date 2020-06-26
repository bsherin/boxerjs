var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

// import "./third_party/wdyr.js";

import React from "react";
import * as ReactDOM from 'react-dom';

import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { batch, connect } from 'react-redux';

import _ from 'lodash';

import "../css/boxer.scss";

import { rootReducer } from './redux/reducers.js';
import { mapDispatchToProps } from "./redux/actions/dispatch_mapper.js";

import { newDataBoxNode } from "./redux/actions/node_creator_actions.js";
import { healStructure, collectGarbage } from "./redux/actions/composite_actions.js";
import { changeNodeMulti } from "./redux/actions/core_actions.js";

import { doBinding, guid } from "./utility/utilities.js";
import { loader, GenericNode } from "./nodes.js";
import { BoxerNavbar } from "./blueprint_navbar.js";
import { ProjectMenu, BoxMenu, MakeMenu, EditMenu, ViewMenu } from "./main_menus_react.js";
import { postAjax } from "./utility/communication_react.js";

import { BoxerSocket } from "./utility/boxer_socket.js";
import { container_kinds } from "./shared_consts.js";
import { shape_classes } from "./pixi_shapes.js";
import { svg_shape_classes } from "./svg_shapes.js";

import { SpriteNode } from "./sprite_commands.js";
import { GraphicsNode } from "./graphics_box_commands.js";
import { _getContainingGraphicsBox, makeSelectAllStateGlobals } from "./redux/selectors.js";

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

var store;

const MAX_UNDO_SAVES = 20;

window.tick_received = 0;

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
        batch(() => {
            store.dispatch(newDataBoxNode([], false, "world"));
            store.dispatch(healStructure("world"));
            store.dispatch(changeNodeMulti("world", { "am_zoomed": true, "name": "world" }));
        });
        loader.load(() => {
            ReactDOM.render(React.createElement(
                Provider,
                { store: store },
                React.createElement(MainAppPlus, null),
                '}/>'
            ), domContainer);
        });
    } else {
        postAjax("get_data", { world_name: window.world_name }, got_data);
    }
    function got_data(result) {
        if (result.success) {
            let world_state = result.project_dict.world_state;
            if (world_state.hasOwnProperty("base_node")) {
                world_state.node_dict = convertLegacySave(world_state.base_node);
                world_state.base_node = null;
            }
            _rehydrateComponents(world_state.node_dict);
            store = createStore(rootReducer, world_state, applyMiddleware(thunk));
            store.dispatch(healStructure("world"));
            store.dispatch(collectGarbage());
            window.store = store;
            loader.load(() => {
                ReactDOM.render(React.createElement(
                    Provider,
                    { store: store },
                    React.createElement(MainAppPlus, null)
                ), domContainer);
            });
        }
    }
}

function convertLegacySave(base_node) {
    base_node.unique_id = "world";

    return convertNode(base_node, {});

    function convertNode(the_node, ndict) {
        if (container_kinds.includes(the_node.kind)) {
            let llist = [];
            for (let line of the_node.line_list) {
                llist.push(line.unique_id);
                ndict = convertNode(line, ndict);
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
                ndict = convertNode(nd, ndict);
            }
            the_node.node_list = nlist;
        }
        ndict[the_node.unique_id] = the_node;
        return ndict;
    }
}

function _rehydrateComponents(ndict) {
    for (let nd_id in ndict) {
        let nd = ndict[nd_id];
        if (node_classes.hasOwnProperty(nd.kind)) {
            ndict[nd_id] = new node_classes[nd.kind](nd);
            nd = ndict[nd_id];
        }
        if (nd.kind == "graphics") {
            nd["drawn_components"] = [];
            if (nd.hasOwnProperty("component_specs")) {
                for (let comp of nd.component_specs) {
                    let Dcomp = shape_classes[comp.type];
                    let new_comp = React.createElement(Dcomp, comp.props);
                    nd.drawn_components.push(new_comp);
                }
                nd.component_specs = [];
            }
        } else if (nd.kind == "svggraphics") {
            nd["drawn_components"] = [];
            if (nd.hasOwnProperty("component_specs")) {
                for (let comp of nd.component_specs) {
                    let Dcomp = svg_shape_classes[comp.type];
                    let new_comp = React.createElement(Dcomp, comp.props);
                    nd.drawn_components.push(new_comp);
                }
                nd.component_specs = [];
            }
        } else if (nd.kind == "sprite") {
            if (!nd.hasOwnProperty("sparams")) {
                nd.sparams = {};
            } else {
                nd.sparams["shape_components"] = [];
                let cgb = _getContainingGraphicsBox(nd.unique_id, ndict);
                let use_svg = cgb && cgb.kind == "svggraphics";
                if (nd.hasOwnProperty("component_specs")) {
                    for (let comp of nd.component_specs) {
                        let Dcomp;
                        if (use_svg) {
                            Dcomp = svg_shape_classes[comp.type];
                        } else {
                            Dcomp = shape_classes[comp.type];
                        }

                        let new_comp = React.createElement(Dcomp, comp.props);
                        nd.sparams.shape_components.push(new_comp);
                    }
                    nd.component_specs = [];
                }
            }
        }
    }
}

class MainApp extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.last_tick_processed = 0;
    }

    _setExecuting(abool) {
        this.setState({ executing: abool });
    }

    componentDidMount() {
        this._update_window_dimensions();
        window.addEventListener("resize", this._update_window_dimensions);

        this.props.setFocusInBox("world", "root", 0);
    }

    componentDidUpdate(preProps, preState, snapShot) {
        if (window._running > 0) {
            return;
        }
    }

    _update_window_dimensions() {
        batch(() => {
            this.props.setGlobal("innerWidth", window.innerWidth);
            this.props.setGlobal("innerHeight", window.innerHeight);
        });
    }

    _getStateForSave() {
        window.store.dispatch(collectGarbage());
        let new_state = _.cloneDeep(window.store.getState());
        this._dehydrateComponents(new_state.node_dict);
        return new_state;
    }

    _dehydrateComponents(ndict) {
        for (let nd_id in ndict) {
            let nd = ndict[nd_id];
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
            } else if (nd.kind == "sprite") {
                let cgb = _getContainingGraphicsBox(nd.unique_id, ndict);
                let use_svg = cgb && cgb.kind == "svggraphics";
                nd.component_specs = [];
                for (let comp of nd.sparams.shape_components) {
                    let new_spec;
                    if (use_svg) {
                        new_spec = { type: comp.type.type_name, props: comp.props };
                    } else {
                        new_spec = { type: comp.type, props: comp.props };
                    }

                    nd.component_specs.push(new_spec);
                }
                nd.sparams.shape_components = [];
            }
        }
    }

    _compareNode(n1, n2, fields) {
        for (let field of fields) {
            if (n1[field] != n2[field]) {
                return false;
            }
        }
        return true;
    }

    _comparePortboxes(db1, db2) {
        let fields = ["name", "am_zoomed", "closed", "target"];
        return this._compareNode(db1, db2, fields);
    }
    _compareDataboxes(db1, db2_id) {
        let fields = ["name", "am_zoomed", "closed", "line_list"];
        return this._compareNode(db1, db2, fields);
    }

    _compareLines(l1_id, l2_id) {
        let fields = ["line_list"];
        return this._compareNode(l1_id, db2, fields);
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

    _eqTest(ndict1, ndict2) {
        for (let nid in ndict1) {
            let obj1 = ndict1[nid];
            if (!Object.hasOwnProperty(ndict2, nid)) {
                return false;
            }
            let obj2 = ndict2[nid];
            if (obj1.kind != obj2.kind) {
                return false;
            }
            if (container_kinds.includes(obj1.kind)) {
                if (!this._compareDataboxes(obj1, obj2)) {
                    return false;
                }
            }
            if (obj2.kind == "text") {
                if (!this._compareTexts(obj1, obj2)) {
                    return false;
                }
            }
            if (obj2.kind == "jsbox" || obj2.kind == "htmlbox") {
                if (!this._compareJsBoxes(obj1, obj2)) return false;
            }
            if (obj2.kind == "port") {
                if (!this._comparePortboxes(obj1, obj2)) return false;
            }
        }
    }

    render() {
        let menus = React.createElement(
            React.Fragment,
            null,
            React.createElement(ProjectMenu, _extends({}, this.props.statusFuncs, {
                getStateForSave: this._getStateForSave
            })),
            React.createElement(EditMenu, this.funcs),
            React.createElement(MakeMenu, this.funcs),
            React.createElement(BoxMenu, this.funcs),
            React.createElement(ViewMenu, this.funcs)
        );

        return React.createElement(
            Provider,
            { store: store },
            React.createElement(BoxerNavbar, { is_authenticated: window.is_authenticated,
                user_name: window.username,
                menus: menus
            }),
            React.createElement(GenericNode, { unique_id: this.props.state_globals.zoomed_node_id,
                am_in_port: false,
                from_port: false,
                port_chain: ["root"]
            })
        );
    }
}

MainApp.propTypes = {};

function makeMapStateToStateGlobals() {
    const selectMyProps = makeSelectAllStateGlobals();
    return (state, ownProps) => {
        return Object.assign(selectMyProps(state, ownProps), ownProps);
    };
}

let MainAppPlus = connect(makeMapStateToStateGlobals(), mapDispatchToProps)(MainApp);

_main_main();