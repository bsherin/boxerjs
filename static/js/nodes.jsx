import React from "react";
import ContentEditable from "react-contenteditable";
import PropTypes from "prop-types";

import { Button } from "@blueprintjs/core";

import {doBinding, getCaretPosition} from "./utilities";
import {USUAL_TOOLBAR_HEIGHT, SIDE_MARGIN} from "./sizing_tools.js";
import {BOTTOM_MARGIN} from "./sizing_tools";

export {DataBox}


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
        let pos = getCaretPosition(this.iRef);
        this.props.funcs.storeFocus(this.props.unique_id, pos)
    }

    _handleKeyDown(event) {
        if ((event.key == "Backspace") && (getCaretPosition(this.iRef) == 0)) {
            event.preventDefault();
            this.props.funcs.deletePrecedingBox(this.props.unique_id)
            return
        }
        if (event.key == "Enter") {
            event.preventDefault();
            this.props.funcs.splitLineAtTextPosition(this.props.unique_id, getCaretPosition(this.iRef))
            return
        }
        if (event.key =="]") {
            event.preventDefault();
            this.props.funcs.positionAfterBox(this._myLine().parent)
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

    componentDidMount () {
        this._setFocusIfRequired()
    }

    componentDidUpdate () {
        this._setFocusIfRequired()
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

    render() {
        return (
            <React.Fragment>
                <ContentEditable className="editable mousetrap"
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
            let firstTextNodeId = myDataBox.line_list[0].node_list[0].unique_id;
            this.props.funcs.changeNode(firstTextNodeId, "setFocus", 0);
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
        if (this.props.boxWidth != null) {
            istyle.maxWidth = this.props.boxWidth - 20;
        }
        return (
            <span className="bp3-tag data-box-name" style={istyle}>
                <span> </span>
                <ContentEditable className="bp3-text-overflow-ellipsis bp3-fill"
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
    boxWidth: PropTypes.number
};

class DataBox extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.nameRef = null;
        this.boxRef = React.createRef();
        this.state.focusingName = false;
        this.state.boxWidth = null;
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


    render() {
        let dbclass;
        if (this.props.closed) {
            if ((this.props.name != null) || this.state.focusingName) {
                dbclass = "closed-data-box data-box-with-name"
            }
            else {
                dbclass = "closed-data-box"
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
                    </Button>
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
                            {the_content}
                            <ZoomButton handleClick={this._zoomMe}/>
                        </div>
                </div>
            </React.Fragment>
        )
    }
}

DataBox.propTypes = {
    name: PropTypes.string,
    closed: PropTypes.bool,
    unique_id: PropTypes.string,
    line_list: PropTypes.array,
    funcs: PropTypes.object,
    am_zoomed: PropTypes.bool
};

DataBox.defaultProps = {
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

    render() {
        let the_content = this.props.node_list.map((the_node, index) => {
            if (the_node.kind == "text") {
                return (
                    <TextNode key={the_node.unique_id}
                              funcs={this.props.funcs}
                              unique_id={the_node.unique_id}
                              setFocus={the_node.setFocus}
                              the_text={the_node.the_text}/>
                )
            }
            else  {
                return (
                    <DataBox key={the_node.unique_id}
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
    funcs: PropTypes.object
};