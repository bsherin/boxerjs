

import React from "react";
import PropTypes from 'prop-types';

import {connect} from "react-redux";

import { MenuItem, Menu, Popover, MenuDivider, PopoverPosition, Button } from "@blueprintjs/core";

import {doBinding} from "./utility/utilities.js";

import {mapDispatchToProps} from "./redux/actions/dispatch_mapper.js";

function mapStateToProps(state, ownProps){
    return Object.assign(
        {last_focus_id: state.stored_focus.last_focus_id,
            last_focus_pos: state.stored_focus.last_focus_pos,
            last_focus_port_chain: state.stored_focus.last_focus_port_chain
        }, ownProps)
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


    get option_dict () {
        return {
            "Save As...": this.props.saveProjectAs,
            "Save": this.props.saveProject
        }
    }

    get icon_dict() {
        return {
            "Save As...": "floppy-disk",
            "Save": "saved",
        }
    }

    get label_dict() {
        return {
            "Save As...": "ctrl+s",
            "Save": "ctrl+s",
        }

    }

    render () {
        return (
            <MenuComponent menu_name="Project"
                           option_dict={this.option_dict}
                           icon_dict={this.icon_dict}
                           disabled_items={this.props.disabled_items}
                           disable_all={false}
                           label_dict={this.label_dict}
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
            "Markdown Box": ()=>{this._new_box("markdownbox")},
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
            "Markdown Box": "code",
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
        this.props.focusName(this.props.last_focus_id, this.props.last_focus_port_chain)
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
        this.props.insertClipboard(this.props.last_focus_id, this.props.last_focus_pos,
            this.props.last_focus_port_chain);
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
let EditMenu = connect(mapStateToProps, mapDispatchToProps)(EditMenuRaw)

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