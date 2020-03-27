import {doBinding, propsAreEqual} from "./utilities";
import {BOTTOM_MARGIN, SIDE_MARGIN, USUAL_TOOLBAR_HEIGHT} from "./sizing_tools";
import {Button} from "@blueprintjs/core";
import {DragHandle} from "./resizing_layouts";
import PropTypes from "prop-types";
import {EditableTag} from "./nodes";

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
        return !propsAreEqual(nextState, this.state) || !propsAreEqual(nextProps, this.props)
    }

    _closeMe() {
        if (this.props.am_zoomed) {
            this._unzoomMe();
            return
        }
        if (this.props.am_in_portal) {
            let have_focus = this.boxRef.current.contains(document.activeElement);
            this.props.funcs.changeNode(this.props.am_in_portal, "closed", true, ()=>{
                if (have_focus) {
                    this.props.funcs.positionAfterBox(this.props.am_in_portal)
                }
            });
        }

        else {
            let have_focus = this.boxRef.current.contains(document.activeElement);
            this.props.funcs.changeNode(this.props.unique_id, "closed", true, ()=>{
                if (have_focus) {
                    this.props.funcs.positionAfterBox(this.props.unique_id)
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
        if (this.props.focusName) {
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
        if (this.props.am_in_portal) {
            this.props.funcs.unzoomBox(this.props.am_in_portal)
        }
        else {
            this.props.funcs.unzoomBox(this.props.unique_id)
        }

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
        this.props.funcs.setNodeSize(this.props.unique_id, new_width, new_height)
    }

    _stopResize(e, ui, x, y, dx, dy) {
        let self = this;
        this.setState({resizing: false, dwidth: 0, dheight:0}, ()=>{
            if (dx < resizeTolerance && dy < resizeTolerance) {
                self._setSize(false, false)
            }
            else {
                self._setSize(this.state.startingWidth + dx, this.state.startingHeight + dy)}
            }
        )

    }

    render() {
        let dbclass;
        if (this.props.closed) {
            if ((this.props.name != null) || this.state.focusingName) {
                dbclass = "closed-data-box data-box-with-name"
            }
            else {
                dbclass = "closed-data-box"
            }
            if (this.props.kind == "doitbox") {
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
                            onMouseDown={(e)=>{e.preventDefault()}}
                            onClick={this._openMe}
                            icon={null}>
                        <div className="closed-button-inner"></div>
                    </Button>
                    <TypeLabel clickable={this.props.clickable_label}
                               clickFunc={this.props.label_function}
                               the_label={this.props.type_label}/>
                </div>
            )
        }

        dbclass = "data-box data-box-with-name targetable";
        if (this.props.kind == "doitbox") {
            dbclass = dbclass + " doit-box";
        }
        else if (this.props.kind == "sprite") {
            dbclass = dbclass + " sprite-box";
        }
        if (this.props.selected) {
            dbclass = dbclass + " selected";
        }
        if (this.props.transparent) {
            dbclass += " transparent"
        }
        let outer_style;
        let inner_style;
        if (this.props.am_zoomed) {
            let usable_dimensions = this.getUsableDimensions();
            outer_style = {
                width: usable_dimensions.usable_width,
                height: usable_dimensions.usable_height - 10,
                position: "absolute",
                top: USUAL_TOOLBAR_HEIGHT + 10,
                left: SIDE_MARGIN
            };
            inner_style = {
                height: "100%"
            }
        }
        else if (this.state.resizing) {
            outer_style = {
            };
            inner_style = {
                width: this.state.startingWidth + this.state.dwidth,
                height: this.state.startingHeight + this.state.dheight,
                position: "relative"
            }
        }
        else if (this.props.fixed_size) {
            outer_style = {};
            inner_style = {
                width: this.props.fixed_width,
                height: this.props.fixed_height,
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
        return (
            <React.Fragment>
                <div className={outer_class} style={outer_style} ref={this.outerRef}>
                    <EditableTag the_name={this.props.name}
                                 focusingMe={this.state.focusingName}
                                 boxWidth={this.state.boxWidth}
                                 funcs={this.props.funcs}
                                 am_sprite={this.props.kind == "sprite"}
                                 doneEditingName={this._doneEditingName}
                                 submitRef={this._submitNameRef}
                                 boxId={this.props.unique_id}/>
                    <div ref={this.boxRef} className={dbclass} id={this.props.unique_id} style={inner_style} >
                        <CloseButton handleClick={this._closeMe}/>
                        {this.props.wrapped_content}
                        <ZoomButton handleClick={this._zoomMe}/>
                        <DragHandle position_dict={draghandle_position_dict}
                            dragStart={this._startResize}
                            onDrag={this._onResize}
                            dragEnd={this._stopResize}
                            direction="both"
                            iconSize={15}/>
                    </div>
                    {!this.props.am_zoomed &&
                        <TypeLabel clickable={this.props.clickable_label}
                                   clickFunc={this.props.label_function}
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
    portal_close_func: PropTypes.func,
    portal_name_func: PropTypes.func,
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
};