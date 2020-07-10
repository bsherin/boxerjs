
// import "./third_party/wdyr.js";

import React from "react";
import * as ReactDOM from 'react-dom'


import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import {batch, connect} from 'react-redux';

import "../css/boxer.scss";

import {rootReducer} from './redux/reducers.js'
import {mapDispatchToProps} from "./redux/actions/dispatch_mapper.js";

import {newDataBoxNode} from "./redux/actions/node_creator_actions.js";
import {healStructure, collectGarbage, changeNodeMulti} from "./redux/actions/composite_actions.js";


import {doBinding, guid} from "./utility/utilities.js";
import {loader, GenericNode} from "./nodes.js";
import {BoxerNavbar} from "./blueprint_navbar.js";
import {ProjectMenu, BoxMenu, MakeMenu, EditMenu, ViewMenu} from "./main_menus_react.js";
import {postAjax} from "./utility/communication_react.js"

import {BoxerSocket} from "./utility/boxer_socket.js"
import {_rehydrateComponents, convertLegacySave} from "./utility/save_utilities"

import {makeSelectAllStateGlobals} from "./redux/selectors.js";
import {initializeMissingGlobals} from "./redux/actions/composite_actions";


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
        batch(()=>{
            store.dispatch(newDataBoxNode([], false, "world"));
            store.dispatch(healStructure("world"));
            store.dispatch(changeNodeMulti("world", {"am_zoomed": true, "name": "world"}));
        })
        loader.load(()=>{
            ReactDOM.render(
                <Provider store={store}>
                    <MainAppPlus/>}/>
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
            store.dispatch(healStructure("world"));
            store.dispatch(collectGarbage());
            store.dispatch(initializeMissingGlobals());
            window.store = store;
            loader.load(()=>{
                 ReactDOM.render(
                     <Provider store={store}>
                        <MainAppPlus/>
                     </Provider>,
                     domContainer)
            })
        }
    }
}

class MainApp extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.last_tick_processed = 0
    }

    _setExecuting(abool) {
        this.setState({executing: abool})
    }

    componentDidMount() {
        this._update_window_dimensions();
        window.addEventListener("resize", this._update_window_dimensions);

        this.props.setFocusInBox("world", "root", 0);
    }

    componentDidUpdate(preProps, preState, snapShot) {
        if (window._running > 0) {
            return
        }
    }

    _update_window_dimensions() {
        batch(()=>{
            this.props.setGlobal("innerWidth", window.innerWidth);
            this.props.setGlobal("innerHeight", window.innerHeight);
        })
    }

    render() {
        let menus = (
            <React.Fragment>
                <ProjectMenu {...this.props.statusFuncs}/>
                <EditMenu />
                <MakeMenu/>
                <BoxMenu/>
                <ViewMenu/>
            </React.Fragment>
        );

        return (
            <Provider store={store}>
                <BoxerNavbar is_authenticated={window.is_authenticated}
                                  user_name={window.username}
                                  menus={menus}
                    />
                <GenericNode unique_id={this.props.state_globals.zoomed_node_id}
                             am_in_port={false}
                             from_port={false}
                             port_chain="root"
                             />

            </Provider>
        )
    }
}

MainApp.propTypes = {
};



function makeMapStateToStateGlobals() {
    const selectMyProps = makeSelectAllStateGlobals()
    return (state, ownProps) => {
        return Object.assign(selectMyProps(state, ownProps), ownProps)
    }
}


let MainAppPlus = connect(
    makeMapStateToStateGlobals(),
    mapDispatchToProps)(MainApp);

_main_main();

