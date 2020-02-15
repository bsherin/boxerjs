import React from "react";
import ContentEditable from "react-contenteditable";
import PropTypes from "prop-types";

import { Button, Tag } from "@blueprintjs/core";

import {doBinding, getCaretPosition, propsAreEqual} from "./utilities";
import {KeyTrap} from "./key_trap.js";
import {getUsableDimensions} from "./sizing_tools.js";

export {DataBox}


class TextNode extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.state.iRef = null;
    }

    _handleChange(event) {
        this.props.funcs.handleTextChange(this.props.unique_id, event.target.value)
    }

    _displayMessage() {
        let idx = getCaretPosition(this.state.iRef);
        console.log("hello the index is " + String(idx))
    }

    _refHandler(the_ref) {
        this.setState({iRef: the_ref});
    }

    _insertDataBox() {
        this.props.funcs.insertDataBox(this.props.unique_id, getCaretPosition(this.state.iRef))
    }

    _handleKeyDown(event) {
        if ((event.key == "Backspace") && (getCaretPosition(this.state.iRef) == 0)) {
            event.preventDefault();
            this.props.funcs.deletePrecedingBox(this.props.unique_id)
        }
        if (event.key == "Enter") {
            event.preventDefault();
            this.props.funcs.splitLineAtTextPosition(this.props.unique_id, getCaretPosition(this.state.iRef))
        }
        if (event.key == "ArrowUp") {
            event.preventDefault();
            let my_line = this._myLine();
            if (my_line.position == 0) {
                this._focusName()
            }
            else {
                let myDataBox = this._myBox();
                let firstTextNodeId = myDataBox.line_list[my_line.position - 1].node_list[0].unique_id;
                this.props.funcs.changeNode(firstTextNodeId, "setFocus", 0);
            }
        }
        if (event.key == "ArrowDown") {
            event.preventDefault();
            let my_line = this._myLine();
            let myDataBox = this._myBox();
            if (my_line.position < (myDataBox.line_list.length - 1)) {
                let firstTextNodeId = myDataBox.line_list[my_line.position + 1].node_list[0].unique_id;
                this.props.funcs.changeNode(firstTextNodeId, "setFocus", 0);
            }
        }
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
        let node = this.state.iRef;
        var textNode = node.firstChild;
        var range = document.createRange();
        range.setStart(textNode, pos);
        range.setEnd(textNode, pos);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    _setFocusIfRequired () {
        if (this.props.setFocus != null) {
            if (this.state.iRef) {
                $(this.state.iRef).focus();
                if (this.props.setFocus != 0) {
                    this._positionCursor(this.props.setFocus)
                }
                this.props.funcs.changeNode(this.props.unique_id, "setFocus", null);
            }
        }
    }

    _focusName() {
        let line_id = this.props.funcs.getParentId(this.props.unique_id);
        let box_id = this.props.funcs.getParentId(line_id);
        let currentName = this.props.funcs.getNode(box_id).name;
        let self = this;
        if (currentName == null) {
            this.props.funcs.changeNode(box_id, "name", "", doFocus)
        }
        else {
            doFocus()
        }

        function doFocus() {
            self.props.funcs.changeNode(box_id, "focusName", true)
        }
    }

    render() {
        let key_bindings = [
            [["ctrl+]"], this._insertDataBox],
            [["ctrl+f"], this._displayMessage],
            [["ctrl+n"], this._focusName]
        ];
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
                                 html={this.props.the_text}
                                 />
                 <KeyTrap global={false} target_ref={this.state.iRef} bindings={key_bindings} />
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
            let firstTextNodeId = myDataBox.line_list[0].node_list[0].unique_id
            this.props.funcs.changeNode(firstTextNodeId, "setFocus", 0);
        }
    }

    _onBlur(event) {
        if (this.props.the_name == "") {
            this.props.funcs.changeNode(this.props.boxId, "name", null)
        }
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
        return (
            <span className="bp3-tag data-box-name" style={istyle}>
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
    focusingMe: PropTypes.bool
};

class DataBox extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.state.nameRef = null;
        this.state.focusingName = false;
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
            this.props.funcs.changeNode(this.props.unique_id, "closed", true)
        }
    }

    _openMe() {
        this.props.funcs.changeNode(this.props.unique_id, "closed", false)
    }

    _submitNameRef(the_ref) {
        this.setState({"nameRef": the_ref})
    }

    _doneEditingName() {
        this.setState({focusingName: false})
    }

    componentDidUpdate () {
        if (this.props.focusName) {
            if (this.state.nameRef) {
                $(this.state.nameRef).focus();
                this.setState({focusingName: true});
                this.props.funcs.changeNode(this.props.unique_id, "focusName", false);
            }
        }
    }

    _zoomMe() {
        this.props.funcs.zoomBox(this.props.unique_id)
    }

    _unzoomeMe() {
        this.props.funcs.unzoomBox(this.props.unique_id)
    }

    render() {

        if (this.props.closed) {
            return (
                <div className="data-box-outer">
                    {(this.props.name || this.state.focusingName) &&
                        <EditableTag the_name={this.props.name}
                                     funcs={this.props.funcs}
                                     submitRef={this._submitNameRef}
                                     doneEditingName={this._doneEditingName}
                                     boxId={this.props.unique_id}/>
                    }
                    <Button type="button"
                            className="closed-data-box"
                            minimal={false}
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
        let dbclass;
        if ((this.props.name != null) || this.state.focusingName) {
            dbclass = "data-box data-box-with-name"
        }
        else {
            dbclass = "data-box"
        }
        let outer_style;
        let inner_style;
        if (this.props.am_zoomed) {
            let usable_dimensions = getUsableDimensions();
            outer_style = {
                width: "100%",
                height: usable_dimensions.usable_height
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
                                 funcs={this.props.funcs}
                                 doneEditingName={this._doneEditingName}
                                 submitRef={this._submitNameRef}
                                 boxId={this.props.unique_id}/>
                    <div className={dbclass} style={inner_style} >
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
    am_zoomed: false
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