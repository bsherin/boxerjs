

import "../../css/tactic.scss";
import "../../css/boxer_table.scss";
import "../../css/library_home.scss";

import React from "react";
import * as ReactDOM from 'react-dom'
import PropTypes from 'prop-types';

import { Tabs, Tab, Tooltip, Icon, Position } from "@blueprintjs/core";


import {Toolbar} from "./blueprint_toolbar.js"
import {BoxerSocket} from "../utility/boxer_socket.js"
import {render_navbar} from "../blueprint_navbar.js";
import {handleCallback} from "../utility/communication_react.js"
import {doFlash} from "../utility/toaster.js"
import {LibraryPane} from "./library_pane.js"
import {getUsableDimensions, SIDE_MARGIN, USUAL_TOOLBAR_HEIGHT} from "../utility/sizing_tools.js";
import {ViewerContext} from "./resource_viewer_context.js";
import {withStatus} from "../utility/toaster.js";
import {withErrorDrawer} from "./error_drawer.js";
import {doBinding, guid} from "../utility/utilities.js";

window.library_id = guid();
window.page_id = window.library_id;
const MARGIN_SIZE = 17;

let tsocket;

function _repository_home_main () {
    render_navbar("repository");
    tsocket = new LibraryBoxerSocket("library", 5000);
     let RepositoryHomeAppPlus = withErrorDrawer(withStatus(RepositoryHomeApp, tsocket), tsocket);
    let domContainer = document.querySelector('#library-home-root');
    ReactDOM.render(<RepositoryHomeAppPlus/>, domContainer)
}

class LibraryBoxerSocket extends BoxerSocket {

    initialize_socket_stuff() {

        this.socket.emit('join', {"user_id":  window.user_id, "library_id":  window.library_id});

        this.socket.on("window-open", (data) => window.open(`${$SCRIPT_ROOT}/load_temp_page/${data["the_id"]}`));

        this.socket.on('handle-callback', handleCallback);
        this.socket.on('close-user-windows', (data) => {
            if (!(data["originator"] == window.library_id)) {
                window.close()
            }
        });
        this.socket.on('doflash', doFlash);
    }
}

var res_types = ["collection", "project", "tile", "list", "code"];
class RepositoryHomeApp extends React.Component {

    constructor(props) {
        super(props);
        let aheight = getUsableDimensions().usable_height_no_bottom;
        let awidth = getUsableDimensions().usable_width - 170;
        this.state = {
            selected_tab_id: "projects-pane",
            usable_width: awidth,
            usable_height: aheight,
            pane_states: {}
        };
         for (let res_type of res_types) {
            this.state.pane_states[res_type] = {
                left_width_fraction: .65,
                selected_resource: {"name": "", "tags": "", "notes": "", "updated": "", "created": ""},
                tag_button_state:{
                    expanded_tags: [],
                    active_tag: "all",
                    tree: []
                },
                search_from_field: false,
                search_from_tag: false,
                sorting_column: "updated",
                sorting_field: "updated_for_sort",
                sorting_direction: "descending",
                multi_select: false,
                list_of_selected: [],
                search_field_value: "",
                search_inside_checked: false,
                search_metadata_checked: false,
            }
        }
        this.top_ref = React.createRef();
        doBinding(this);
    }

    componentDidMount() {
        window.addEventListener("resize", this._update_window_dimensions);
        this.setState({"mounted": true});
        this._update_window_dimensions();
        this.props.stopSpinner()
    }

    _updatePaneState (res_type, state_update, callback=null) {
        let old_state = Object.assign({}, this.state.pane_states[res_type]);
        let new_pane_states = Object.assign({}, this.state.pane_states);
        new_pane_states[res_type] = Object.assign(old_state, state_update);
        this.setState({pane_states: new_pane_states}, callback)
    }

    _update_window_dimensions() {
        let uwidth = window.innerWidth - 2 * SIDE_MARGIN;
        let uheight = window.innerHeight;
        if (this.top_ref && this.top_ref.current) {
            uheight = uheight - this.top_ref.current.offsetTop;
        }
        else {
            uheight = uheight  -USUAL_TOOLBAR_HEIGHT
        }
        this.setState({usable_height: uheight, usable_width: uwidth})
    }

    _handleTabChange(newTabId, prevTabId, event) {
        this.setState({selected_tab_id: newTabId}, this._update_window_dimensions)
    }

    getIconColor(paneId) {
        return paneId == this.state.selected_tab_id ? "white" : "#CED9E0"
    }

    render () {

        let projects_pane = (<LibraryPane
                                     res_type="project"
                                     allow_search_inside={false}
                                     allow_search_metadata={true}
                                     search_metadata_view = "search_project_metadata"
                                     ToolbarClass={RepositoryProjectToolbar}
                                     updatePaneState={this._updatePaneState}
                                     {...this.state.pane_states["project"]}
                                     {...this.props.errorDrawerFuncs}
                                     is_repository={true}
                                     tsocket={tsocket}/>
        );

        let outer_style = {width: this.state.usable_width,
            height: this.state.usable_height,
            position: "absolute",
            top: USUAL_TOOLBAR_HEIGHT,
            left: 0,
            paddingLeft: 0
        };
        return (
            <ViewerContext.Provider value={{readOnly: true}}>
                <div id="repository_container" className="pane-holder" ref={this.top_ref} style={outer_style}>
                    <Tabs id="the_container" style={{marginTop: 100}}
                             selectedTabId={this.state.selected_tab_id}
                             renderActiveTabPanelOnly={true}
                             vertical={true} large={true} onChange={this._handleTabChange}>
                        <Tab id="projects-pane" panel={projects_pane}>
                            <Tooltip content="Projects" position={Position.RIGHT}>
                                <Icon icon="projects" iconSize={20} tabIndex={-1} color={this.getIconColor("projects-pane")}/>
                            </Tooltip>
                        </Tab>
                    </Tabs>
                </div>
            </ViewerContext.Provider>
        )
    }
}

class LibraryToolbar extends React.Component {

    prepare_button_groups() {
        let new_bgs = [];
        let new_group;
        let new_button;
        for (let group of this.props.button_groups) {
            new_group = [];
            for (let button of group) {
                if (!this.props.multi_select || button[3]) {
                    new_button = {name_text: button[0],
                        click_handler: button[1],
                        icon_name: button[2],
                        multi_select: button[3]};
                    if (button.length > 4) {
                        new_button.intent = button[4]
                    }
                    if (button.length > 5) {
                        new_button.key_bindings = button[5]
                    }
                    if (button.length > 6) {
                        new_button.tooltip = button[6]
                    }
                    new_group.push(new_button)
                }
            }
            if (new_group.length != 0) {
                new_bgs.push(new_group)
            }
        }
        return new_bgs
    }

    prepare_file_adders() {
        if ((this.props.file_adders == null) || (this.props.file_adders.length == 0)) return [];
        let file_adders = [];
        for (let button of this.props.file_adders) {
            let new_button = {name_text: button[0],
                click_handler: button[1],
                icon_name: button[2],
                multiple: button[3]};
            file_adders.push(new_button)
        }
        return file_adders
    }

    prepare_popup_buttons() {
         if ((this.props.popup_buttons == null) || (this.props.popup_buttons.length == 0)) return [];
         let popup_buttons = [];
         for (let button of this.props.popup_buttons) {
             let new_button = {name: button[0],
                icon_name: button[1]
             };
             let opt_list = [];
             for (let opt of button[2]) {
                 opt_list.push({opt_name: opt[0], opt_func: opt[1], opt_icon: opt[2]})
             }
             new_button["option_list"] = opt_list;
             popup_buttons.push(new_button);
         }
         return popup_buttons
    }

    render() {
        let outer_style = {
                display: "flex",
                flexDirection: "row",
                position: "relative",
                left: this.props.left_position,
                marginBottom: 10
        };
        let popup_buttons = this.prepare_popup_buttons();
       return <Toolbar button_groups={this.prepare_button_groups()}
                       file_adders={this.prepare_file_adders()}
                       alternate_outer_style={outer_style}
                       sendRef={this.props.sendRef}
                       popup_buttons={popup_buttons}
       />
    }
}

LibraryToolbar.propTypes = {
    button_groups: PropTypes.array,
    file_adders: PropTypes.array,
    popup_buttons: PropTypes.array,
    multi_select: PropTypes.bool,
    left_position: PropTypes.number,
    sendRef: PropTypes.func
};

LibraryToolbar.defaultProps = {
    file_adders: null,
    popup_buttons: null
};

let specializedToolbarPropTypes = {
    view_func: PropTypes.func,
    repository_copy_func: PropTypes.func,
    selected_resource: PropTypes.object,
    list_of_selected: PropTypes.array,
    muti_select: PropTypes.bool,
};


class RepositoryProjectToolbar extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
    }


    get button_groups() {
        return [
            [["copy", this.props.repository_copy_func, "import", false, "regular", [], "Copy to library"]]
        ];
     }

     render () {
        return <LibraryToolbar button_groups={this.button_groups}
                               left_position={this.props.left_position}
                               sendRef={this.props.sendRef}
                               multi_select={this.props.multi_select} />
     }

}

RepositoryProjectToolbar.propTypes = specializedToolbarPropTypes;


_repository_home_main();