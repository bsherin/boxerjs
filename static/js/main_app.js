
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
import { healStructure, collectGarbage, changeNodeMulti } from "./redux/actions/composite_actions.js";

import { doBinding, guid } from "./utility/utilities.js";
import { loader, GenericNode } from "./nodes.js";
import { BoxerNavbar } from "./blueprint_navbar.js";
import { ProjectMenu, BoxMenu, MakeMenu, EditMenu, ViewMenu } from "./main_menus_react.js";
import { postAjax } from "./utility/communication_react.js";

import { BoxerSocket } from "./utility/boxer_socket.js";
import { container_kinds } from "./shared_consts.js";
import { _rehydrateComponents, convertLegacySave } from "./utility/save_utilities";

import { SpriteNode } from "./sprite_commands.js";
import { GraphicsNode } from "./graphics_box_commands.js";
import { makeSelectAllStateGlobals } from "./redux/selectors.js";
import { initializeMissingGlobals } from "./redux/actions/composite_actions";

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
            store.dispatch(initializeMissingGlobals());
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
            React.createElement(ProjectMenu, this.props.statusFuncs),
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
                port_chain: 'root'
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