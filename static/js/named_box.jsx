import React from "react";
import PropTypes from "prop-types";
import ContentEditable from "react-contenteditable";
import {Button} from "@blueprintjs/core";
import {Spring, animated} from 'react-spring/renderprops'

import {DragHandle} from "./resizing_layouts.js";

import {doBinding, propsAreEqual} from "./utilities.js";
import {BOTTOM_MARGIN, SIDE_MARGIN, USUAL_TOOLBAR_HEIGHT} from "./sizing_tools.js";
import {graphics_kinds} from "./shared_consts.js";
import {connect} from "react-redux";
import {mapDispatchToProps} from "./actions/dispatch_mapper";
import {withErrorDrawer} from "./error_drawer";
import {withStatus} from "./toaster";

const resizeTolerance = 2;

export {EditableTag, withName, CloseButton, TypeLabel, ZoomButton, NamedBox_propTypes, NamedBox_defaultProps}

function withName(WrappedComponent) {
    return class extends React.Component {
        constructor(props) {
            super(props);
            doBinding(this);
            this.state = {};
            this.nameRef = null;
            this.boxRef = React.createRef();
            this.from_style = null;
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

        // shouldComponentUpdate(nextProps, nextState) {
        //     if (window.freeze && window._running > 0){
        //         return false
        //     }
        //     return !propsAreEqual(nextState, this.state) || !propsAreEqual(nextProps, this.props) || this.props.kind == "port"
        //         || this.props.funcs.containsPort(this.props.unique_id)
        // }

        _flipMe() {
            this.boxRef = React.createRef();
            this.props.changeNode(this.props.unique_id, "showGraphics", !this.props.showGraphics)
        }

        _convertMe() {
            this.boxRef = React.createRef();
            this.props.changeNode(this.props.unique_id, "showConverted", !this.props.showConverted)
        }

        _closeMe() {
            if (this.props.am_zoomed) {
                this._unzoomMe();
                return
            }
            if (this.props.am_in_portal) {
                if (this.props.portal_is_zoomed) {
                    this.props.unzoomBox(this.props.am_in_portal)
                } else {
                    let have_focus = this.boxRef.current.contains(document.activeElement);
                    this.props.changeNode(this.props.am_in_portal, "closed", true, () => {
                        if (have_focus) {
                            this.props.positionAfterBox(this.props.am_in_portal, this.props.portal_parent)
                        }
                    });
                }
            } else {
                let have_focus = this.boxRef.current.contains(document.activeElement);
                this.props.changeNode(this.props.unique_id, "closed", true, () => {
                    if (have_focus) {
                        this.props.positionAfterBox(this.props.unique_id, this.props.portal_root)
                    }
                })
            }
        }

        _openMe() {
            this.setState({opening: true});
            if (this.props.am_in_portal) {
                this.props.changeNode(this.props.am_in_portal, "closed", false)
                return
            }
            this.props.changeNode(this.props.unique_id, "closed", false)
        }

        _submitNameRef(the_ref) {
            this.nameRef = the_ref
        }

        _doneEditingName(callback = null) {
            this.setState({focusingName: false}, callback)
        }

        componentDidMount() {
            if (this.boxRef && this.boxRef.current) {
                if (this.state.boxWidth != this.boxRef.current.offsetWidth) {
                    this.setState({boxWidth: this.boxRef.current.offsetWidth});
                }
            }
            if (this.nameRef) {
                $(this.nameRef).focus(this._gotNameFocus)
            }
        }

        _gotNameFocus() {
            this.setState({focusingName: true})
        }

        componentDidUpdate() {
            let self = this;
            if (this.props.focusNameTag && this.props.focusNameTag == this.props.portal_root) {
                if (this.nameRef) {
                    $(this.nameRef).focus();
                    this.setState({focusingName: true}, () => {
                        self.props.changeNode(this.props.unique_id, "focusNameTag", false);
                    });
                }
            }
            if (!this.props.closed && this.boxRef && this.boxRef.current) {
                if (this.state.boxWidth != this.boxRef.current.offsetWidth) {
                    this.setState({boxWidth: this.boxRef.current.offsetWidth});
                }
            }
            if (this.nameRef) {
                $(this.nameRef).focus(this._gotNameFocus)
            }
        }

        _zoomMe() {
            if (this.props.am_in_portal) {
                this.props.zoomBox(this.props.am_in_portal)
            } else {
                this.props.zoomBox(this.props.unique_id)
            }

        }

        _unzoomMe() {
            this.props.unzoomBox(this.props.unique_id)

        }

        getUsableDimensions() {
            return {
                usable_width: this.props.state_globals.innerWidth - 2 * SIDE_MARGIN,
                usable_height: this.props.state_globals.innerHeight - BOTTOM_MARGIN - USUAL_TOOLBAR_HEIGHT,
                usable_height_no_bottom: window.innerHeight - USUAL_TOOLBAR_HEIGHT,
                body_height: window.innerHeight - BOTTOM_MARGIN
            };
        }

        _startResize(e, ui, startX, startY) {
            let bounding_rect = this.boxRef.current.getBoundingClientRect();

            let start_width = bounding_rect.width;
            let start_height = bounding_rect.height;
            this.setState({
                resizing: true, dwidth: 0, dheight: 0,
                startingWidth: start_width, startingHeight: start_height
            })
        }

        _onResize(e, ui, x, y, dx, dy) {
            this.setState({dwidth: dx, dheight: dy})
        }

        _setSize(new_width, new_height) {
            if (graphics_kinds.includes(this.props.kind) && this.props.showGraphics) {
                this.props.setGraphicsSize(this.props.unique_id, new_width, new_height)
            } else {
                this.props.setNodeSize(this.props.unique_id, new_width, new_height)
            }
        }

        _stopResize(e, ui, x, y, dx, dy) {
            let self = this;
            this.setState({resizing: false, dwidth: 0, dheight: 0}, () => {
                    if (Math.abs(dx) < resizeTolerance && Math.abs(dy) < resizeTolerance) {
                        self._setSize(false, false)
                    } else {
                        self._setSize(this.state.startingWidth + dx, this.state.startingHeight + dy)
                    }
                }
            )

        }

        render() {
            let dbclass;
            let type_label;
            if (this.props.type_label) {
                type_label = this.props.type_label
            } else if (this.props.kind == "doitbox") {
                type_label = "Doit"
            } else if (this.props.kind == "jsbox") {
                type_label = "JSBox"
            } else {
                type_label = "Data"
            }
            let clickable_label;
            let label_function;
            if (graphics_kinds.includes(this.props.kind)) {
                clickable_label = true;
                label_function = this._flipMe;
            } else if (this.props.kind == "htmlbox") {
                clickable_label = true;
                label_function = this._convertMe;
            } else {
                clickable_label = false;
                label_function = null
            }
            let outer_style;
            let inner_style;
            let width;
            let height;
            let inner_width;
            let inner_height;
            let immediate;
            if (this.props.closed) {
                if ((this.props.name != null) || this.state.focusingName) {
                    dbclass = "closed-data-box data-box-with-name"
                } else {
                    dbclass = "closed-data-box"
                }
                outer_style = {};
                inner_style = {width: 75, height: 36};
                immediate = false
            } else {
                dbclass = "data-box data-box-with-name targetable";
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
                        left: SIDE_MARGIN,
                    };
                    inner_style = {
                        height: inner_height,
                        width: inner_width
                    };
                    immediate = true;
                } else if (this.state.resizing) {
                    outer_style = {};
                    inner_width = this.state.startingWidth + this.state.dwidth;
                    inner_height = this.state.startingHeight + this.state.dheight;
                    inner_style = {
                        width: inner_width,
                        height: inner_height,
                        position: "relative"
                    };
                    immediate = true;
                } else if (graphics_kinds.includes(this.props.kind) && this.props.showGraphics) {
                    outer_style = {};
                    inner_style = {
                        position: "relative",
                        width: this.props.graphics_fixed_width + 13,
                        height: this.props.graphics_fixed_height + 16
                    };
                    immediate = false;
                } else if (this.props.fixed_size) {
                    outer_style = {};
                    inner_width = this.props.fixed_width;
                    inner_height = this.props.fixed_height;
                    inner_style = {
                        width: inner_width,
                        height: inner_height,
                        position: "relative"
                    };
                    immediate = false
                } else {
                    inner_style = {width: "auto", height: "auto"};
                    outer_style = {};
                    immediate = true
                }
            }

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

            let draghandle_position_dict = {position: "absolute", bottom: 2, right: 1};
            let outer_class = "data-box-outer";
            if (this.props.name == null && !this.state.focusingName) {
                outer_class += " empty-name"
            }
            // let WrappedComponent = this.props.WrappedComponent;
            if (!this.from_style) {
                this.from_style = inner_style
            }
            let wrapper_style;
            if (this.props.am_zoomed) {
                wrapper_style = {height: "100%"}
            } else {
                wrapper_style = {}
            }
            return (
                <div className={outer_class} style={outer_style} ref={this.outerRef}>
                    <EditableTag the_name={this.props.name}
                                 portal_root={this.props.portal_root}
                                 portal_parent={this.props.portal_parent}
                                 focusingMe={this.state.focusingName}
                                 boxWidth={this.state.boxWidth}
                                 am_sprite={this.props.kind == "sprite"}
                                 doneEditingName={this._doneEditingName}
                                 submitRef={this._submitNameRef}
                                 boxId={this.props.unique_id}/>
                    <Spring from={this.from_style} to={inner_style} immediate={immediate}>
                        {inner_props => {
                            if (this.props.closed) {
                                return (<div>
                                        <div className={dbclass} style={inner_props}
                                             ref={this.boxRef}
                                             onMouseDown={(e) => {
                                                 e.preventDefault()
                                             }}
                                             onClick={this._openMe}>
                                            <div className="closed-button-inner"></div>

                                        </div>
                                        <TypeLabel clickable={clickable_label}
                                                   clickFunc={label_function}
                                                   the_label={type_label}/>
                                    </div>
                                )
                            } else {
                                return (<div style={wrapper_style}>
                                        <div ref={this.boxRef} className={dbclass} id={this.props.unique_id}
                                             style={inner_props}>
                                            <CloseButton handleClick={this._closeMe}/>
                                            <WrappedComponent {...this.props} ref={this.props.inner_ref}
                                                              inner_width={inner_props.width}
                                                              inner_height={inner_props.height}
                                                              graphics_width={this.props.graphics_fixed_width}
                                                              graphics_height={this.props.graphics_fixed_height}
                                            />
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
                                )
                            }
                        }}
                    </Spring>
                </div>
            )

        }
    }
}

let NamedBox_propTypes = {
    name: PropTypes.string,
    kind: PropTypes.string,
    closed: PropTypes.bool,
    clickable_label: PropTypes.bool,
    label_function: PropTypes.func,
    unique_id: PropTypes.string,
    line_list: PropTypes.array,
    selected: PropTypes.bool,
    am_zoomed: PropTypes.bool,
    fixed_size: PropTypes.bool,
    am_in_portal: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.string]),
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

let NamedBox_defaultProps = {
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

class EditableTagRaw extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (window.freeze && window._running > 0){
                return false
            }
        return this.props.focusingMe || !propsAreEqual(nextProps, this.props, ["funcs"])
    }

    _handleChange(event) {
        this.props.changeNode(this.props.boxId, "name", event.target.value)
    }

    _handleKeyDown(event) {
        if ((event.key == "Enter") || (event.key == "ArrowDown")) {
            event.preventDefault();
            let myDataBox = this.props.node_dict[this.props.boxId];
            if (myDataBox.kind == "port") {
                let targetBox = this.props.node_dict[myDataBox.target];
                if (targetBox.kind == "jsbox") {
                    this.props.setFocus(targetBox.unique_id, this.props.boxId, 0);
                }
                else if (targetBox.showCloset) {
                    let firstTextNodeId = targetBox.closetLine.node_list[0].unique_id;
                    this.props.setFocus(firstTextNodeId, this.props.boxId, 0);
                }
                else {
                    let firstTextNodeId = targetBox.line_list[0].node_list[0].unique_id;
                    this.props.setFocus(firstTextNodeId, this.props.boxId, 0);
                }
            }
            else if (myDataBox.kind == "jsbox") {
                this.props.setFocus(this.props.boxId, this.props.portal_root, 0);
            }
            else if (myDataBox.showCloset) {
                let closet = this.props.node_dict[myDataBox.closetLine]
                let firstTextNodeId = this.props.node_dict[closet.node_list[0]].unique_id;
                this.props.setFocus(firstTextNodeId, this.props.portal_root, 0);
            }
            else {
                let the_line = this.props.node_dict[myDataBox.line_list[0]]
                let firstTextNodeId = this.props.node_dict[the_line.node_list[0]].unique_id;
                this.props.setFocus(firstTextNodeId, this.props.portal_root, 0);
            }

        }
        if (event.key =="]") {
            event.preventDefault();
            if (this.props.am_in_portal) {
                this.props.positionAfterBox(this.props.portal_root, this.props.portal_parent);
            }
            else {
                this.props.positionAfterBox(this.props.boxId, this.props.portal_root);
            }
        }
    }

    _onBlur(event) {
        this.props.doneEditingName(()=>{
            if (this.props.the_name == "") {
                this.props.changeNode(this.props.boxId, "name", null);

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

EditableTagRaw.propTypes = {
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

EditableTagRaw.defaultProps = {
    am_sprite: false
};

function mapStateToPropsND(state, ownProps) {
    return {node_dict: state.node_dict}
}

let EditableTag = connect(mapStateToPropsND, mapDispatchToProps)(EditableTagRaw);

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
                <Button onClick={this._handleClick} className="type-label clickable">{this.props.the_label}</Button>
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