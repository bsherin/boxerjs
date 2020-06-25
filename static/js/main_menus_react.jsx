

import React from "react";
import PropTypes from 'prop-types';

import {connect} from "react-redux";

import { MenuItem, Menu, Popover, MenuDivider, PopoverPosition, Button } from "@blueprintjs/core";

import {showModalReact} from "./utility/modal_react.js";
import {doFlash} from "./utility/toaster.js"
import {doBinding} from "./utility/utilities.js";
import {postAjax} from "./utility/communication_react";

import {mapDispatchToProps} from "./redux/actions/dispatch_mapper.js";

function mapStateToProps(state, ownProps){
    return Object.assign({last_focus_id: state.stored_focus.last_focus_id}, ownProps)
}

function mapStateToPropsNull(state, ownProps){
    return Object.assign({}, ownProps)
}


export {ProjectMenu, MakeMenu, BoxMenu, EditMenu, MenuComponent, ViewMenu}

class MenuComponent extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this)
    }

     _filter_on_match_list(opt_name) {
        return !this.props.hidden_items.includes(opt_name)
    }

    render () {
        let pruned_list = Object.keys(this.props.option_dict).filter(this._filter_on_match_list);
        let choices = pruned_list.map((opt_name, index) => {
                let icon = this.props.icon_dict.hasOwnProperty(opt_name) ? this.props.icon_dict[opt_name] : null;
                let label = this.props.label_dict.hasOwnProperty(opt_name) ? this.props.label_dict[opt_name] : null;
                if (this.props.option_dict[opt_name] == "divider") {
                    return <MenuDivider key={index}/>
                }
                return (
                    <MenuItem disabled={this.props.disable_all || this.props.disabled_items.includes(opt_name)}
                              onClick={this.props.option_dict[opt_name]}
                              icon={icon}
                              label={label}
                              key={opt_name}
                              text={opt_name}
                    >
                    </MenuItem>
                )
            }
        );
        let the_menu = (
            <Menu>
                {choices}
            </Menu>
        );
        if (this.props.alt_button) {
            let AltButton = this.props.alt_button;
            return (<Popover minimal={true} autoFocus={false} content={the_menu} position={PopoverPosition.BOTTOM_LEFT}>
                <AltButton/>
            </Popover>)
        } else {
            return (
                <Popover minimal={true} autoFocus={false} content={the_menu} position={PopoverPosition.BOTTOM_LEFT}>
                    <Button text={this.props.menu_name} small={true} minimal={true}/>
                </Popover>
            )
        }
    }
}

MenuComponent.propTypes = {
    menu_name: PropTypes.string,
    option_dict: PropTypes.object,
    icon_dict: PropTypes.object,
    disabled_items: PropTypes.array,
    disable_all: PropTypes.bool,
    hidden_items: PropTypes.array,
    label_dict: PropTypes.object,
    alt_button: PropTypes.func
};

MenuComponent.defaultProps = {
    disabled_items: [],
    disable_all: false,
    hidden_items: [],
    icon_dict: {},
    label_dict: {},
    alt_button: null
};

class ProjectMenuRaw extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this)
    }

    _saveProjectAs() {
        let self = this;
        postAjax("get_project_names", {}, function (data) {
            let checkboxes;
            showModalReact("Save Project As", "New Project Name", CreateNewProject,
                      "NewProject", data["project_names"], null, doCancel)
        });

        function doCancel() {
        }
        function CreateNewProject (new_name) {
            //let console_node = cleanse_bokeh(document.getElementById("console"));
            const result_dict = {
                "project_name": new_name,
                "world_state": self.props.getStateForSave()
            };

            postAjax("save_new_project", result_dict, save_as_success);

            function save_as_success(data_object) {
                if (data_object["success"]) {
                    window.world_name = new_name;
                    document.title = new_name;
                    data_object.alert_type = "alert-success";
                    data_object.timeout = 2000;
                    // postWithCallback("host", "refresh_project_selector_list", {'user_id': window.user_id});
                    doFlash(data_object)
                }
                else {
                    data_object["message"] = "Saving didn't work";
                    data_object["alert-type"] = "alert-warning";
                    doFlash(data_object)
                }
            }
        }
    }

    _saveProject () {
        // let console_node = cleanse_bokeh(document.getElementById("console"));
        let self = this;
        const result_dict = {
            project_name: window.world_name,
            world_state: self.props.getStateForSave()
        };
        postAjax("update_project", result_dict, updateSuccess);

        function updateSuccess(data) {
            if (data.success) {
                data["alert_type"] = "alert-success";
                data.timeout = 2000;
            }
            else {
                data["alert_type"] = "alert-warning";
            }
            doFlash(data)
        }
    }


    get option_dict () {
        return {
            "Save As...": this._saveProjectAs,
            "Save": this._saveProject
        }
    }

    get icon_dict() {
        return {
            "Save As...": "floppy-disk",
            "Save": "saved",
        }
    }

    render () {
        return (
            <MenuComponent menu_name="Project"
                           option_dict={this.option_dict}
                           icon_dict={this.icon_dict}
                           disabled_items={this.props.disabled_items}
                           disable_all={false}
                           hidden_items={this.props.hidden_items}
            />
        )
    }
}

ProjectMenuRaw.propTypes = {
    hidden_items: PropTypes.array
};


let ProjectMenu = connect(mapStateToPropsNull, mapDispatchToProps)(ProjectMenuRaw)

class MakeMenuRaw extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this)
    }

    _new_box(kind) {
        this.props.insertBoxLastFocus(kind);
    }


    get option_dict () {
        return {
            "Data Box": ()=>{this._new_box("databox")},
            "Doit Box": ()=>{this._new_box("doitbox")},
            "JS Box": ()=>{this._new_box("jsbox")},
            "HTML Box": ()=>{this._new_box("htmlbox")},
            "divider1": "divider",
            "Turtle Box": ()=>{this._new_box("turtlebox")},
            "SVGTurtle Box": ()=>{this._new_box("svgturtlebox")},
            "Graphics Box": ()=>{this._new_box("graphics")},
            "SVGGraphics Box": ()=>{this._new_box("svggraphics")},
            "Sprite Box": ()=>{this._new_box("sprite")},
            "divider2": "divider",
            "Port": ()=>{this._new_box("port")},
        }
    }

    get icon_dict () {
        return {
            "Data Box": "cube",
            "Doit Box": "code",
            "JS Box": "code",
            "HTML Box": "code",
            "Turtle Box": "media",
            "SVGTurtle Box": "media",
            "Graphics Box": "media",
            "SVGGraphics Box": "media",
            "Sprite Box": "symbol-triangle-up",
            "Port": "feed"
        }
    }

    get label_dict() {
        return {
            "Data Box": "{",
            "Doit Box": "[",
        }

    }


    render () {
        return (
            <MenuComponent menu_name="Make"
                           option_dict={this.option_dict}
                           icon_dict={this.icon_dict}
                           label_dict={this.label_dict}
                           disabled_items={this.props.disabled_items}
                           hidden_items={[]}
            />
        )
    }
}

let MakeMenu = connect(mapStateToProps, mapDispatchToProps)(MakeMenuRaw)

class BoxMenuRaw extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this)
    }

    _name_box() {
        this.props.focusName(this.props.last_focus_id)
    }


    get option_dict () {
        return {
            "Name": this._name_box,
            "Unfix Box Size": ()=>{this.props.unfixSize(this.props.last_focus_id)},
            "Toggle Closet": ()=>{this.props.toggleCloset(this.props.last_focus_id)},
            "Toggle Transparency": ()=>{this.props.toggleBoxTransparency(this.props.last_focus_id)},
            "Retarget Port": ()=>{this.props.retargetPort(this.props.last_focus_id)}
        }
    }

    get icon_dict () {
        return {
            "Name": "label",
            "Unfix Size":"undo",
            "Toggle Closet": "one-column",
            "Toggle Transparency": "eye-open",
            "Retarget Port": "feed-subscribed"
        }
    }

    get label_dict() {
        return {
            "Name": "|",
            "Toggle Closet": "F9"
        }

    }


    render () {
        return (
            <MenuComponent menu_name="Box"
                           option_dict={this.option_dict}
                           icon_dict={this.icon_dict}
                           label_dict={this.label_dict}
                           disabled_items={this.props.disabled_items}
                           hidden_items={[]}
            />
        )
    }
}

let BoxMenu = connect(mapStateToProps, mapDispatchToProps)(BoxMenuRaw)


class EditMenuRaw extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this)
    }

    _paste(event) {
        this.props.insertClipboardLastFocus();
    }

    _cut(event) {
        this.props.cutSelected();
    }

    _copy(event) {
        this.props.copySelected()
    }

    get option_dict () {
        return {
            "Cut": this._cut,
            "Copy": this._copy,
            "Paste": this._paste,
        }
    }

    get icon_dict () {
        return {
            "Cut": "cut",
            "Copy": "duplicate",
            "Paste": "clipboard",

        }
    }

    get label_dict() {
        return {
            "Cut": "ctr+x",
            "Copy": "ctrl+v",
            "Paste": "ctrl+v",
        }

    }


    render () {
        return (
            <MenuComponent menu_name="Edit"
                           option_dict={this.option_dict}
                           icon_dict={this.icon_dict}
                           label_dict={this.label_dict}
                           disabled_items={this.props.disabled_items}
                           hidden_items={[]}
            />
        )
    }
}
let EditMenu = connect(mapStateToPropsNull, mapDispatchToProps)(EditMenuRaw)

class ViewMenu extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this)
    }


    get option_dict () {
        return {
            "Show error drawer": this.props.openErrorDrawer,
        }
    }

    get icon_dict () {
        return {
            "Show error drawer": "panel-stats",
        }
    }

    get label_dict() {
        return {
        }

    }


    render () {
        return (
            <MenuComponent menu_name="View"
                           option_dict={this.option_dict}
                           icon_dict={this.icon_dict}
                           label_dict={this.label_dict}
                           disabled_items={this.props.disabled_items}
                           hidden_items={[]}
            />
        )
    }
}
EditMenu.propTypes = {
};