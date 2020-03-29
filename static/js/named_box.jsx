import React from "react";
import PropTypes from "prop-types";
import ContentEditable from "react-contenteditable";
import {Button} from "@blueprintjs/core";
import {DragHandle} from "./resizing_layouts.js";

import {doBinding, propsAreEqual} from "./utilities.js";
import {BOTTOM_MARGIN, SIDE_MARGIN, USUAL_TOOLBAR_HEIGHT} from "./sizing_tools.js";
import {graphics_kinds} from "./shared_consts.js";

const resizeTolerance = 2;

export {EditableTag, NamedBox, CloseButton, TypeLabel, ZoomButton}

class NamedBox extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.nameRef = null;
        this.boxRef = React.createRef();
        this.state = {
            focusingName: false,
            boxWidth: null,
            resizing: false,
            dwidth: 0,
            dheight: 0,
            startingWidth: null,
            startingHeight: null
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
       return !propsAreEqual(nextState, this.state) || !propsAreEqual(nextProps, this.props) || this.props.kind == "port"
        || this.props.funcs.containsPort(this.props.unique_id)
    }

    _flipMe() {
        this.boxRef = React.createRef();
        this.props.funcs.changeNode(this.props.unique_id, "showGraphics", !this.props.showGraphics)
    }

    _closeMe() {
        if (this.props.am_zoomed) {
            this._unzoomMe();
            return
        }
        if (this.props.am_in_portal) {
            if (this.props.portal_is_zoomed) {
                this.props.funcs.unzoomBox(this.props.am_in_portal)
            }
            else {
                let have_focus = this.boxRef.current.contains(document.activeElement);
                this.props.funcs.changeNode(this.props.am_in_portal, "closed", true, ()=>{
                    if (have_focus) {
                        this.props.funcs.positionAfterBox(this.props.am_in_portal, this.props.portal_parent)
                    }
                });
            }
        }

        else {
            let have_focus = this.boxRef.current.contains(document.activeElement);
            this.props.funcs.changeNode(this.props.unique_id, "closed", true, ()=>{
                if (have_focus) {
                    this.props.funcs.positionAfterBox(this.props.unique_id, this.props.portal_root)
                }
            })
        }
    }

    _openMe() {
        if (this.props.am_in_portal) {
            this.props.funcs.changeNode(this.props.am_in_portal, "closed", false)
            return
        }
        this.props.funcs.changeNode(this.props.unique_id, "closed", false)
    }

    _submitNameRef(the_ref) {
        this.nameRef = the_ref
    }

    _doneEditingName(callback=null) {
        this.setState({focusingName: false}, callback)
    }

    componentDidMount() {
        if (this.boxRef) {
            if (this.state.boxWidth != this.boxRef.current.offsetWidth) {
                 this.setState({ boxWidth: this.boxRef.current.offsetWidth });
            }
        }
        if (this.nameRef){
            $(this.nameRef).focus(this._gotNameFocus)
        }
    }

    _gotNameFocus() {
        this.setState({focusingName: true})
    }

    componentDidUpdate () {
        let self = this;
        if (this.props.focusName && this.props.focusName == this.props.portal_root) {
            if (this.nameRef) {
                $(this.nameRef).focus();
                this.setState({focusingName: true},()=>{
                    self.props.funcs.changeNode(this.props.unique_id, "focusName", false);
                });
            }
        }
        if (!this.props.closed && this.boxRef) {
            if (this.state.boxWidth != this.boxRef.current.offsetWidth) {
                 this.setState({ boxWidth: this.boxRef.current.offsetWidth });
            }
        }
        if (this.nameRef){
            $(this.nameRef).focus(this._gotNameFocus)
        }
    }

    _zoomMe() {
        if (this.props.am_in_portal) {
            this.props.funcs.zoomBox(this.props.am_in_portal)
        }
        else {
            this.props.funcs.zoomBox(this.props.unique_id)
        }

    }

    _unzoomMe() {
        this.props.funcs.unzoomBox(this.props.unique_id)

    }

     getUsableDimensions() {
        return {
            usable_width: this.props.innerWidth - 2 * SIDE_MARGIN,
            usable_height: this.props.innerHeight - BOTTOM_MARGIN - USUAL_TOOLBAR_HEIGHT,
            usable_height_no_bottom: window.innerHeight - USUAL_TOOLBAR_HEIGHT,
            body_height: window.innerHeight - BOTTOM_MARGIN
        };
    }

    _startResize(e, ui, startX, startY) {
        let bounding_rect = this.boxRef.current.getBoundingClientRect();

        let start_width = bounding_rect.width;
        let start_height = bounding_rect.height;
        this.setState({resizing: true, dwidth: 0, dheight: 0,
            startingWidth: start_width, startingHeight: start_height})
    }

    _onResize(e, ui, x, y, dx, dy) {
        this.setState({dwidth: dx, dheight: dy})
    }

    _setSize(new_width, new_height) {
        if (graphics_kinds.includes(this.props.kind) && this.props.showGraphics) {
            this.props.funcs.setGraphicsSize(this.props.unique_id, new_width, new_height)
        }
        else {
            this.props.funcs.setNodeSize(this.props.unique_id, new_width, new_height)
        }
    }

    _stopResize(e, ui, x, y, dx, dy) {
        let self = this;
        this.setState({resizing: false, dwidth: 0, dheight:0}, ()=>{
            if (Math.abs(dx) < resizeTolerance && Math.abs(dy) < resizeTolerance) {
                self._setSize(false, false)
            }
            else {
                self._setSize(this.state.startingWidth + dx, this.state.startingHeight + dy)}
            }
        )

    }

    render() {
        let dbclass;
        let type_label;
        if (this.props.type_label) {
            type_label = this.props.type_label
        }
        else if (this.props.kind == "doitbox") {
            type_label = "Doit"
        }
        else if (this.props.kind == "jsbox") {
            type_label = "JSBox"
        }
        else {
            type_label = "Data"
        }
        let clickable_label;
        let label_function;
        if (graphics_kinds.includes(this.props.kind)) {
            clickable_label = true;
            label_function = this._flipMe;
        }
        else {
            clickable_label = false;
            label_function = null
        }
        if (this.props.closed) {
            if ((this.props.name != null) || this.state.focusingName) {
                dbclass = "closed-data-box data-box-with-name"
            } else {
                dbclass = "closed-data-box"
            }
            if (this.props.kind == "doitbox" || this.props.kind == "jsbox") {
                dbclass = dbclass + " doit-box";
            }
            if (this.props.selected) {
                dbclass = dbclass + " selected"
            }
            if (this.props.transparent) {
                dbclass += " transparent"
            }
            return (
                <div className="data-box-outer">
                    {(this.props.name || this.state.focusingName) &&
                    <EditableTag the_name={this.props.name}
                                 portal_root={this.props.portal_root}
                                 portal_parent={this.props.portal_parent}
                                 funcs={this.props.funcs}
                                 boxWidth={75}
                                 submitRef={this._submitNameRef}
                                 doneEditingName={this._doneEditingName}
                                 boxId={this.props.unique_id}/>
                    }
                    <Button type="button"
                            className={dbclass}
                            minimal={false}
                            ref={this.boxRef}
                            onMouseDown={(e) => {
                                e.preventDefault()
                            }}
                            onClick={this._openMe}
                            icon={null}>
                        <div className="closed-button-inner"></div>
                    </Button>
                    <TypeLabel clickable={clickable_label}
                               clickFunc={null}
                               the_label={type_label}/>
                </div>
            )
        }

        dbclass = "data-box data-box-with-name targetable";
        if (this.props.kind == "doitbox" || this.props.kind == "jsbox") {
            dbclass = dbclass + " doit-box";
        } else if (this.props.kind == "sprite") {
            dbclass = dbclass + " sprite-box";
        } else if (this.props.kind == "port") {
            dbclass = dbclass + " port"
        }
        if (this.props.selected) {
            dbclass = dbclass + " selected";
        }
        if (this.props.transparent) {
            dbclass += " transparent"
        }
        let outer_style;
        let inner_style;
        let width;
        let height;
        let inner_width;
        let inner_height;
        if (this.props.am_zoomed) {
            let usable_dimensions = this.getUsableDimensions();
            width = usable_dimensions.usable_width;
            height = usable_dimensions.usable_height - 10;
            inner_height = "100%";
            inner_width = "100%";
            outer_style = {
                width: width,
                height: height,
                position: "absolute",
                top: USUAL_TOOLBAR_HEIGHT + 10,
                left: SIDE_MARGIN
            };
            inner_style = {
                height: inner_height,
                width: inner_width
            }
        } else if (this.state.resizing) {
            outer_style = {};
            inner_width = this.state.startingWidth + this.state.dwidth;
            inner_height = this.state.startingHeight + this.state.dheight;
            inner_style = {
                width: inner_width,
                height: inner_height,
                position: "relative"
            }
        } else if (graphics_kinds.includes(this.props.kind) && this.props.showGraphics) {
            outer_style = {};
            inner_width = this.props.graphics_fixed_width;
            inner_height = this.props.graphics_fixed_height;
            inner_style = {
                position: "relative"
            }
        }
        else if (this.props.fixed_size) {
                outer_style = {};
                inner_width = this.props.fixed_width;
                inner_height = this.props.fixed_height;
                inner_style = {
                    width: inner_width,
                    height: inner_height,
                    position: "relative"
                }
        }
        else {
            inner_style = {};
            outer_style = {}
        }
        let draghandle_position_dict = {position: "absolute", bottom: 2, right: 1};
        let outer_class = "data-box-outer";
        if (this.props.name == null && !this.state.focusingName) {
            outer_class += " empty-name"
        }
        let WrappedComponent = this.props.WrappedComponent;
        return (
            <React.Fragment>
                <div className={outer_class} style={outer_style} ref={this.outerRef}>
                    <EditableTag the_name={this.props.name}
                                 portal_root={this.props.portal_root}
                                 portal_parent={this.props.portal_parent}
                                 focusingMe={this.state.focusingName}
                                 boxWidth={this.state.boxWidth}
                                 funcs={this.props.funcs}
                                 am_sprite={this.props.kind == "sprite"}
                                 doneEditingName={this._doneEditingName}
                                 submitRef={this._submitNameRef}
                                 boxId={this.props.unique_id}/>
                    <div ref={this.boxRef} className={dbclass} id={this.props.unique_id} style={inner_style} >
                        <CloseButton handleClick={this._closeMe}/>
                        <WrappedComponent {...this.props} ref={this.props.inner_ref} inner_width={inner_width} inner_height={inner_height}/>
                        <ZoomButton handleClick={this._zoomMe}/>
                        <DragHandle position_dict={draghandle_position_dict}
                            dragStart={this._startResize}
                            onDrag={this._onResize}
                            dragEnd={this._stopResize}
                            direction="both"
                            iconSize={15}/>
                    </div>
                    {!this.props.am_zoomed &&
                        <TypeLabel clickable={clickable_label}
                                   clickFunc={label_function}
                                   the_label={type_label}/>
                    }
                </div>
            </React.Fragment>
        )
    }
}

NamedBox.propTypes = {
    name: PropTypes.string,
    kind: PropTypes.string,
    closed: PropTypes.bool,
    clickable_label: PropTypes.bool,
    label_function: PropTypes.func,
    unique_id: PropTypes.string,
    line_list: PropTypes.array,
    funcs: PropTypes.object,
    selected: PropTypes.bool,
    am_zoomed: PropTypes.bool,
    fixed_size: PropTypes.bool,
    am_in_portal: PropTypes.string,
    portal_is_zoomed: PropTypes.bool,
    type_label: PropTypes.string,
    inner_ref: PropTypes.object,
    fixed_width: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.number]),
    fixed_height: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.number])
};

NamedBox.defaultProps = {
    kind: "databox",
    closed: false,
    clickable_label: false,
    am_zoomed: false,
    innerWidth: 0,
    innerHeight: 0,
    am_in_portal: false,
    portal_is_zoomed: false,
    type_label: null,
    inner_ref: null

};

class EditableTag extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return this.props.focusingMe || !propsAreEqual(nextProps, this.props)
    }

    _handleChange(event) {
        this.props.funcs.changeNode(this.props.boxId, "name", event.target.value)
    }

    _handleKeyDown(event) {
        if ((event.key == "Enter") || (event.key == "ArrowDown")) {
            event.preventDefault();
            let myDataBox = this.props.funcs.getNode(this.props.boxId);
            if (myDataBox.kind == "port") {
                let targetBox = this.props.funcs.getNode(myDataBox.target);
                if (targetBox.kind == "jsbox") {
                    this.props.funcs.changeNode(targetBox.unique_id, "setFocus", [this.props.boxId, 0]);
                }
                else if (targetBox.showCloset) {
                    let firstTextNodeId = targetBox.closetLine.node_list[0].unique_id;
                    this.props.funcs.changeNode(firstTextNodeId, "setFocus", [this.props.boxId, 0]);
                }
                else {
                    let firstTextNodeId = targetBox.line_list[0].node_list[0].unique_id;
                    this.props.funcs.changeNode(firstTextNodeId, "setFocus", [this.props.boxId, 0]);
                }
            }
            else if (myDataBox.kind == "jsbox") {
                this.props.funcs.changeNode(this.props.boxId, "setFocus", [this.props.portal_root, 0]);
            }
            else if (myDataBox.showCloset) {
                let firstTextNodeId = myDataBox.closetLine.node_list[0].unique_id;
                this.props.funcs.changeNode(firstTextNodeId, "setFocus", [this.props.portal_root, 0]);
            }
            else {
                let firstTextNodeId = myDataBox.line_list[0].node_list[0].unique_id;
                this.props.funcs.changeNode(firstTextNodeId, "setFocus", [this.props.portal_root, 0]);
            }

        }
        if (event.key =="]") {
            event.preventDefault();
            if (this.props.am_in_portal) {
                this.props.funcs.positionAfterBox(this.props.portal_root, this.props.portal_parent);
            }
            else {
                this.props.funcs.positionAfterBox(this.props.boxId, this.props.portal_root);
            }
        }
    }

    _onBlur(event) {
        this.props.doneEditingName(()=>{
            if (this.props.the_name == "") {
                this.props.funcs.changeNode(this.props.boxId, "name", null);

            }
        })
    }

    render() {
        let istyle;
        let html;
        if (this.props.the_name == null) {
            html = ""
        }
        else {
            html = this.props.the_name
        }

        istyle = {};

        if (this.props.boxWidth != null && !this.props.focusingMe) {
            istyle.maxWidth = this.props.boxWidth - 20;
        }
        let cname = "bp3-tag data-box-name";
        if (this.props.am_sprite) {
            cname += " sprite-name"
        }
        if (this.props.the_name == null && !this.props.focusingMe) {
            cname += " empty-tag"
        }
        let ceclass;
        if (this.props.focusingMe) {
            ceclass = "bp3-fill"
        }
        else {
            ceclass="bp3-text-overflow-ellipsis bp3-fill";
        }

        return (
            <span className={cname} style={istyle}>
                <span> </span>
                <ContentEditable className={ceclass}
                                 tagName="span"
                                 style={{}}
                                 onBlur={this._onBlur}
                                 innerRef={this.props.submitRef}
                                 disabled={false}
                                 onChange={this._handleChange}
                                 onKeyDown={this._handleKeyDown}
                                 html={html}
                                 />
            </span>
        )
    }
}

EditableTag.propTypes = {
    the_name: PropTypes.string,
    funcs: PropTypes.object,
    boxId: PropTypes.string,
    submitRef: PropTypes.func,
    doneEditingName: PropTypes.func,
    focusingMe: PropTypes.bool,
    selected: PropTypes.bool,
    boxWidth: PropTypes.number,
    am_sprite: PropTypes.bool,
};

EditableTag.defaultProps = {
    am_sprite: false
};

class CloseButton extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return false
    }

    render () {
        return (
            <Button type="button"
                    className="close-button"
                      minimal={true}
                      small={true}
                      intent="none"
                      onMouseDown={(e)=>{e.preventDefault()}}
                      onClick={this.props.handleClick}
                      icon="small-cross">
            </Button>
        )
    }
}

CloseButton.propTypes = {
    handlClick: PropTypes.func
};

class TypeLabel extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return false
    }

    _handleClick() {
        this.props.clickFunc();
    }

    render() {
        if (this.props.clickable) {
            return (
                <button onClick={this._handleClick} className="type-label clickable">{this.props.the_label}</button>
            )
        }
        return (
            <span className="type-label">{this.props.the_label}</span>
        )
    }
}

TypeLabel.propTypes = {
    the_label: PropTypes.string,
    clickable: PropTypes.bool,
    clickFunc: PropTypes.func
};

TypeLabel.defaultProps = {
    clickable: false
};

class ZoomButton extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return false
    }

    render () {
        return (
            <Button type="button"
                    className="zoom-button"
                    minimal={true}
                    small={true}
                    intent="none"
                    onMouseDown={(e)=>{e.preventDefault()}}
                    onClick={this.props.handleClick}
                    icon="fullscreen">
            </Button>
        )
    }
}

ZoomButton.propTypes = {
    handlClick: PropTypes.func
};