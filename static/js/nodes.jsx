import React from "react";
import ContentEditable from "react-contenteditable";
import PropTypes from "prop-types";

import { Button } from "@blueprintjs/core";

import {doBinding, getCaretPosition, guid} from "./utilities.js";
import {USUAL_TOOLBAR_HEIGHT, SIDE_MARGIN} from "./sizing_tools.js";
import {BOTTOM_MARGIN} from "./sizing_tools";
import {ReactCodemirror} from "./react-codemirror.js";

import {doExecution} from "./eval_space.js";
import {TurtleBox} from "./turtle.js";
import {P5TurtleBox} from "./p5turtle.js"
import {DragHandle} from "./resizing_layouts.js"

export {DataBox}

let currentlyDeleting = false;

class TextNode extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.iRef = null;
    }

    trimSpaces(string) {
      return string
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
          .replace(/\<.*?\>/g, " ")
    }

    unTrimSpaces(string) {
      return string
        .replace(/\s/g, '\u00A0')
    }

    _handleChange(event) {
        let txt = this.trimSpaces(event.target.value);  // Otherwise we end up with junk
        this.props.funcs.handleTextChange(this.props.unique_id, txt)
    }

    _displayMessage() {
        let idx = getCaretPosition(this.iRef);
        console.log("hello the index is " + String(idx))
    }

    _refHandler(the_ref) {
        this.iRef = the_ref
    }

    _onBlur() {
        currentlyDeleting = false;
        let pos = getCaretPosition(this.iRef);
        this.props.funcs.storeFocus(this.props.unique_id, pos)
    }

    async _runMe() {
        let parent_line = this._myLine();

        let result = await doExecution(parent_line, parent_line.parent, this.props.funcs.getBaseNode());
        if (!result) {
            return
        }
        if (typeof(result) != "object") {
            let new_node = this.props.funcs.newTextNode(String(result));
            let new_line = this.props.funcs.newLineNode([new_node]);
            let new_databox = this.props.funcs.newDataBox([new_line]);
            this.props.funcs.insertNode(new_databox, parent_line.unique_id, this._myNode().position + 1)
        }
        else {

            let updated_result = _.cloneDeep(result);
            updated_result.unique_id = guid();
            if (updated_result.kind == "databox") {
                this.props.funcs.updateIds(updated_result.line_list);
            }

            this.props.funcs.insertNode(updated_result, parent_line.unique_id, this._myNode().position + 1)
        }
    }

    _handleKeyDown(event) {
        if (event.key == "Backspace") {
            let caret_pos = getCaretPosition(this.iRef);
            if (caret_pos == 0){
                event.preventDefault();
                this.props.funcs.deletePrecedingBox(this.props.unique_id, !currentlyDeleting);

            }
            else {
                let new_node = this.props.funcs.newTextNode(this.props.the_text.charAt(caret_pos - 1));
                this.props.funcs.addToClipboardStart(new_node, !currentlyDeleting);
            }
            currentlyDeleting = true;
            return
        }
        currentlyDeleting = false;
        if (event.key == "Enter") {
            event.preventDefault();
            if (event.ctrlKey || event.metaKey) {
                this._runMe();
            }
            else {
                this.props.funcs.splitLineAtTextPosition(this.props.unique_id, getCaretPosition(this.iRef));
            }

            return
        }
        if (event.key =="]") {
            event.preventDefault();
            this.props.funcs.positionAfterBox(this._myLine().parent);
            return
        }
        if (event.key == "ArrowUp") {
            event.preventDefault();
            let my_line = this._myLine();
            if (my_line.position == 0) {
                this.props.funcs.focusName()
            }
            else {
                let myDataBox = this._myBox();
                let firstTextNodeId = myDataBox.line_list[my_line.position - 1].node_list[0].unique_id;
                this.props.funcs.changeNode(firstTextNodeId, "setFocus", 0);
            }
            return
        }
        if (event.key == "ArrowDown") {
            event.preventDefault();
            let my_line = this._myLine();
            let myDataBox = this._myBox();
            if (my_line.position < (myDataBox.line_list.length - 1)) {
                let firstTextNodeId = myDataBox.line_list[my_line.position + 1].node_list[0].unique_id;
                this.props.funcs.changeNode(firstTextNodeId, "setFocus", 0);
            }
            return
        }
        if ((event.key == "ArrowLeft") && (getCaretPosition(this.iRef) == 0)){
            event.preventDefault();
            let myNode = this._myNode();
            if (myNode.position == 0) {
                return
            }
            let myLine = this._myLine();
            for (let pos = myNode.position - 1; pos >=0; --pos) {
                let candidate = this.props.funcs.getNode(myLine.node_list[pos].unique_id);
                if (candidate.kind == "text") {
                    this.props.funcs.changeNode(candidate.unique_id, "setFocus", candidate.the_text.length);
                    return
                }
            }
            return
        }
        if ((event.key == "ArrowRight") && (getCaretPosition(this.iRef) == this.props.the_text.length)){
            event.preventDefault();
            let myNode = this._myNode();
            let myLine = this._myLine();
            let nnodes = myLine.node_list.length;
            if (myNode.position == nnodes - 1) {
                return
            }
            for (let pos = myNode.position + 1; pos < nnodes; ++pos) {
                let candidate = this.props.funcs.getNode(myLine.node_list[pos].unique_id);
                if (candidate.kind == "text") {
                    this.props.funcs.changeNode(candidate.unique_id, "setFocus", 0);
                    return
                }
            }
        }
    }

    _myNode() {
        return this.props.funcs.getNode(this.props.unique_id)
    }

    _myLineId() {
        return this.props.funcs.getParentId(this.props.unique_id);
    }

    _myLine() {
        return this.props.funcs.getNode(this._myLineId())
    }

    _myBox() {
        return this.props.funcs.getNode(this._myLine().parent)
    }
    _listen_for_clicks () {
        let self = this;
        $(this.iRef).off("dblclick");
        $(this.iRef).dblclick(function(e) {
             e.preventDefault();
             self._runMe();
            return false
         });
        $(this.iRef).off("mousedown");

        // This mousedown listener is necessary to prevent selection of text on doubleclick
        $(this.iRef).mousedown(function(e) {
            if (e.detail > 1) {
                e.preventDefault();
            }
        })
    }

    componentDidMount () {
        this._setFocusIfRequired();
        this._listen_for_clicks();
    }

    componentDidUpdate () {
        this._setFocusIfRequired();
        this._listen_for_clicks();
    }

    _positionCursor(pos) {
        try {
            let node = this.iRef;
            var textNode = node.firstChild;
            var range = document.createRange();
            range.setStart(textNode, pos);
            range.setEnd(textNode, pos);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
        catch (e) {
            console.log("Got an error positioning the cursor.")
        }
    }

    _setFocusIfRequired () {
        if (this.props.setFocus != null) {
            if (this.iRef) {
                $(this.iRef).focus();
                if (this.props.setFocus != 0) {
                    this._positionCursor(this.props.setFocus)
                }
                this.props.funcs.changeNode(this.props.unique_id, "setFocus", null);
            }
        }
    }

    _handleDoubleClick() {
        console.log("got double click")
    }

    render() {
        let cname;
        if (this.props.selected) {
            cname = "editable mousetrap selected"
        }
        else {
            cname = "editable mousetrap"
        }
        return (
            <React.Fragment>
                <ContentEditable className={cname}
                                 tagName="div"
                                 style={{}}
                                 id={this.props.unique_id}
                                 innerRef={this._refHandler}
                                 disabled={false}
                                 onChange={this._handleChange}
                                 onKeyDown={this._handleKeyDown}
                                 onBlur={this._onBlur}
                                 html={this.unTrimSpaces(this.props.the_text)}
                                 />
             </React.Fragment>

        )
    }
}

TextNode.propTypes = {
    the_text: PropTypes.string,
    setFocus: PropTypes.number,
    unique_id: PropTypes.string,
    selected: PropTypes.bool,
    funcs: PropTypes.object,
};

TextNode.defaultProps = {
    setFocus: null
};

class EditableTag extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    _handleChange(event) {
        this.props.funcs.changeNode(this.props.boxId, "name", event.target.value)
    }

    _handleKeyDown(event) {
        if ((event.key == "Enter") || (event.key == "ArrowDown")) {
            event.preventDefault();
            let myDataBox = this.props.funcs.getNode(this.props.boxId);
            if (myDataBox.kind == "jsbox") {
                this.props.funcs.changeNode(this.props.boxId, "setFocus", 0);
            }
            else {
                let firstTextNodeId = myDataBox.line_list[0].node_list[0].unique_id;
                this.props.funcs.changeNode(firstTextNodeId, "setFocus", 0);
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
        if ((this.props.the_name == null) && !this.props.focusingMe) {
            istyle = {display: "none"};
        }
        else {
            istyle = {};
        }
        if (this.props.boxWidth != null && !this.props.focusingMe) {
            istyle.maxWidth = this.props.boxWidth - 20;
        }
        let ceclass;
        if (this.props.focusingMe) {
            ceclass = "bp3-fill"
        }
        else {
            ceclass="bp3-text-overflow-ellipsis bp3-fill"
        }

        return (
            <span className="bp3-tag data-box-name" style={istyle}>
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
    boxWidth: PropTypes.number
};

class DataBox extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.nameRef = null;
        this.boxRef = React.createRef();
        this.outerRef = React.createRef();
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
    //     return !propsAreEqual(nextProps, this.props)
    // }

    _handleChange(evt) {
        let the_html = evt.target.value;
        console.log(the_html)
    }

    _closeMe() {
        if (this.props.am_zoomed) {
            this._unzoomeMe()
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
    }

    _zoomMe() {
        this.props.funcs.zoomBox(this.props.unique_id)
    }

    _unzoomeMe() {
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
        this.props.funcs.setNodeSize(this.props.unique_id, new_width, new_height)
    }

    _stopResize(e, ui, x, y, dx, dy) {
        let self = this;
        this.setState({resizing: false, dwidth: 0, dheight:0}, ()=>{
            self._setSize(this.state.startingWidth + dx, this.state.startingHeight + dy)})
    }

    render() {
        let type_label;
        if (this.props.kind == "doitbox") {
            type_label = "Doit"
        }
        else {
            type_label = "Data"
        }
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
                    <TypeLabel the_label={type_label}/>
                </div>
            )
        }
        let the_content = this.props.line_list.map((the_line, index) => (
                <DataboxLine key={the_line.unique_id}
                             unique_id={the_line.unique_id}
                             funcs={this.props.funcs}
                             node_list={the_line.node_list}/>
            ));

        if ((this.props.name != null) || this.state.focusingName) {
            dbclass = "data-box data-box-with-name"
        }
        else {
            dbclass = "data-box"
        }
        if (this.props.kind == "doitbox") {
            dbclass = dbclass + " doit-box";
        }
        if (this.props.selected) {
            dbclass = dbclass + " selected";
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
                width: this.props.fixed_width, height:
                this.props.fixed_height,
                position: "relative"
            }
        }
        else {
            inner_style = {};
            outer_style = {}
        }
        let draghandle_position_dict = {position: "absolute", bottom: 2, right: 1};
        return (
            <React.Fragment>
                <div className="data-box-outer" style={outer_style} ref={this.outerRef}>
                    <EditableTag the_name={this.props.name}
                                 focusingMe={this.state.focusingName}
                                 boxWidth={this.state.boxWidth}
                                 funcs={this.props.funcs}
                                 doneEditingName={this._doneEditingName}
                                 submitRef={this._submitNameRef}
                                 boxId={this.props.unique_id}/>
                    <div ref={this.boxRef} className={dbclass} style={inner_style} >
                        <CloseButton handleClick={this._closeMe}/>
                        {the_content}
                        <ZoomButton handleClick={this._zoomMe}/>
                        <DragHandle position_dict={draghandle_position_dict}
                            dragStart={this._startResize}
                            onDrag={this._onResize}
                            dragEnd={this._stopResize}
                            direction="both"
                            iconSize={15}/>
                    </div>
                    {!this.props.am_zoomed &&
                        <TypeLabel the_label={type_label}/>
                    }
                </div>
            </React.Fragment>
        )
    }
}

DataBox.propTypes = {
    name: PropTypes.string,
    kind: PropTypes.string,
    closed: PropTypes.bool,
    unique_id: PropTypes.string,
    line_list: PropTypes.array,
    funcs: PropTypes.object,
    selected: PropTypes.bool,
    am_zoomed: PropTypes.bool,
    fixed_size: PropTypes.bool,
    fixed_width: PropTypes.number,
    fixed_height: PropTypes.number
};

DataBox.defaultProps = {
    kind: "databox",
    closed: false,
    am_zoomed: false,
    innerWidth: 0,
    innerHeight: 0
};

class JsBox extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.nameRef = null;
        this.boxRef = React.createRef();
        this.state.focusingName = false;
        this.state.boxWidth = null;
        this.cmobject = null;
    }

    _handleCodeChange(new_code) {
        this.props.funcs.handleCodeChange(this.props.unique_id, new_code)
    }

    _handleBlur() {
        this.props.funcs.storeFocus(this.props.unique_id, 0);
    }

    _runMe() {
        doExecution(this.props.the_code, this.props.unique_id, this.props.funcs.getBaseNode(), this.props.funcs)
    }

    _closeMe() {
        let have_focus = this.boxRef.current.contains(document.activeElement);
        this.props.funcs.changeNode(this.props.unique_id, "closed", true, ()=>{
            if (have_focus) {
                this.props.funcs.positionAfterBox(this.props.unique_id)
            }
        })
    }

    _openMe() {
        this.props.funcs.changeNode(this.props.unique_id, "closed", false)
    }

    _submitNameRef(the_ref) {
        this.nameRef = the_ref
    }

    _doneEditingName(callback=null) {
        this.setState({focusingName: false}, callback)
    }

    _setCMObject(cmobject) {
        this.cmobject = cmobject
    }

    componentDidMount() {
        if (this.boxRef) {
            if (this.state.boxWidth != this.boxRef.current.offsetWidth) {
                 this.setState({ boxWidth: this.boxRef.current.offsetWidth });
            }
        }
        this._setFocusIfRequired()
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
        this._setFocusIfRequired()
    }

    _setFocusIfRequired () {
        if (this.props.setFocus != null) {
            if (this.cmobject) {
                this.cmobject.focus();
                this.props.funcs.changeNode(this.props.unique_id, "setFocus", null);
            }
        }
    }

    _nameMe() {
        this.props.funcs.focusName(this.props.unique_id)
    }

    _upArrow() {
        let head = this.cmobject.getCursor();
        if (head.line == 0) {
            this._nameMe()
        }
        else {
            this.cmobject.setCursor({line:head.line - 1, ch:head.ch})
        }
    }

    _extraKeys() {
        let self = this;
        return {
                'Ctrl-Enter': ()=>self._runMe(),
                'Cmd-Enter': ()=>self._runMe(),
                'Ctrl-N': ()=>self._nameMe(),
                'ArrowUp': ()=>self._upArrow(),
                'Up': ()=>self._upArrow()
            }
    }

    render() {
        let dbclass;
        if (this.props.closed) {
            if ((this.props.name != null) || this.state.focusingName) {
                dbclass = "closed-data-box data-box-with-name doit-box"
            }
            else {
                dbclass = "closed-data-box doit-box"
            }
            if (this.props.selected) {
                dbclass = dbclass + " selected"
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
                    <TypeLabel the_label="JSbox"/>
                </div>
            )
        }

        if ((this.props.name != null) || this.state.focusingName) {
            dbclass = "data-box js-box data-box-with-name"
        }
        else {
            dbclass = "data-box js-box"
        }
        if (this.props.selected) {
            dbclass = dbclass + " selected"
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
        else {
            inner_style = {};
            outer_style = {}
        }

        return (
            <React.Fragment>
                <div className="data-box-outer" style={outer_style}>
                    <EditableTag the_name={this.props.name}
                                 focusingMe={this.state.focusingName}
                                 boxWidth={this.state.boxWidth}
                                 funcs={this.props.funcs}
                                 doneEditingName={this._doneEditingName}
                                 submitRef={this._submitNameRef}
                                 boxId={this.props.unique_id}/>
                        <div ref={this.boxRef} className={dbclass} style={inner_style} >
                            <CloseButton handleClick={this._closeMe}/>
                            <ReactCodemirror code_content={this.props.the_code}
                                             mode="javascript"
                                             handleChange={this._handleCodeChange}
                                             handleBlur={this._handleBlur}
                                             saveMe={null}
                                             setCMObject={this._setCMObject}
                                             readOnly={false}
                                             extraKeys={this._extraKeys()}
                                             first_line_number={null}
                            />
                        </div>
                        <TypeLabel the_label="JSbox"/>
                </div>
            </React.Fragment>
        )
    }
}

JsBox.propTypes = {
    name: PropTypes.string,
    the_code: PropTypes.string,
    closed: PropTypes.bool,
    unique_id: PropTypes.string,
    funcs: PropTypes.object,
    selected: PropTypes.bool,
};

JsBox.defaultProps = {
    closed: false,
    am_zoomed: false,
    innerWidth: 0,
    innerHeight: 0
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
                      intent="primary"
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

    render() {
        return (
            <span className="type-label">{this.props.the_label}</span>
        )
    }
}

TypeLabel.propTypes = {
    the_label: PropTypes.string
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
                      intent="primary"
                      onMouseDown={(e)=>{e.preventDefault()}}
                      onClick={this.props.handleClick}
                      icon="zoom-to-fit">
            </Button>
        )
    }
}

ZoomButton.propTypes = {
    handlClick: PropTypes.func
};

class DataboxLine extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }
    // shouldComponentUpdate(nextProps, nextState) {
    //     return !propsAreEqual(nextProps, this.props)
    // }

    _handleSelection(selectedKeys) {
        this.props.funcs.setSelected(selectedKeys);
    }

    render() {
        let the_content = this.props.node_list.map((the_node, index) => {
            if (the_node.kind == "text") {
                return (
                    <TextNode key={the_node.unique_id}
                               selected={the_node.selected}
                               className="editable"
                              funcs={this.props.funcs}
                              unique_id={the_node.unique_id}
                              setFocus={the_node.setFocus}
                              the_text={the_node.the_text}/>
                )
            }
            else if (the_node.kind == "jsbox") {
                return (
                    <JsBox key={the_node.unique_id}
                           selected={the_node.selected}
                           name={the_node.name}
                           className="data-box-outer"
                           funcs={this.props.funcs}
                           unique_id={the_node.unique_id}
                           setFocus={the_node.setFocus}
                           closed={the_node.closed}
                           focusName={the_node.focusName}
                           the_code={the_node.the_code}/>
                )
            }

            else if (the_node.kind == "turtlebox") {
                this.props.funcs.setTurtleRef(the_node.unique_id, React.createRef());
                return (
                    <TurtleBox key={the_node.unique_id}
                               selected={the_node.selected}
                               ref={window.turtle_box_refs[the_node.unique_id]}
                               //name={the_node.name}
                               fixed_width={the_node.fixed_width ? the_node.fixed_width : 300}
                               fixed_height={the_node.fixed_height ? the_node.fixed_height : 300}
                               funcs={this.props.funcs}
                               unique_id={the_node.unique_id}
                               closed={the_node.closed}/>
                )
            }
            else if (the_node.kind == "p5turtlebox") {
                this.props.funcs.setTurtleRef(the_node.unique_id, React.createRef());
                return (
                    <P5TurtleBox key={the_node.unique_id}
                               selected={the_node.selected}
                               ref={window.turtle_box_refs[the_node.unique_id]}
                               //name={the_node.name}
                               fixed_width={the_node.fixed_width ? the_node.fixed_width : 300}
                               fixed_height={the_node.fixed_height ? the_node.fixed_height : 300}
                               funcs={this.props.funcs}
                               unique_id={the_node.unique_id}
                               closed={the_node.closed}/>
                )
            }

            else  {
                return (
                    <DataBox key={the_node.unique_id}
                             kind={the_node.kind}
                              selected={the_node.selected}
                              className="data-box-outer"
                             fixed_size={the_node.fixed_size}
                             fixed_width={the_node.fixed_width}
                             fixed_height={the_node.fixed_height}
                             name={the_node.name}
                             funcs={this.props.funcs}
                             unique_id={the_node.unique_id}
                             closed={the_node.closed}
                             am_zoomed={the_node.am_zoomed}
                             focusName={the_node.focusName}
                             line_list={the_node.line_list}/>
                )
            }
        });
        return (
            <div className="data-line">
                    {the_content}
            </div>
        )
    }
}

DataboxLine.propTypes = {
    unique_id: PropTypes.string,
    node_list: PropTypes.array,
    funcs: PropTypes.object,
};