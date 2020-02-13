import React from "react";
import ContentEditable from "react-contenteditable";
import PropTypes from "prop-types";

import { Button } from "@blueprintjs/core";

import {doBinding, getCaretPosition} from "./utilities";
import {KeyTrap} from "./key_trap.js";

export {DataBox}


class TextNode extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.state.iRef = null;
    }

    _handleChange(event) {
        this.props.handleTextChange(this.props.unique_id, event.target.value)
    }

    _displayMessage() {
        let idx = getCaretPosition(this.state.iRef);
        console.log("hello the index is " + String(idx))
    }

    _refHandler(the_ref) {
        this.setState({iRef: the_ref});
    }

    _insertDataBox() {
        this.props.insertDataBox(this.props.unique_id, getCaretPosition(this.state.iRef))
    }

    render() {
        let key_bindings = [[["ctrl+]"], this._insertDataBox], [["ctrl+f"], this._displayMessage]];
        return (
            <React.Fragment>
                <ContentEditable className="editable mousetrap"
                                 tagName="div"
                                 style={{}}
                                 innerRef={this._refHandler}
                                 disabled={false}
                                 onChange={this._handleChange}
                                 html={this.props.the_text}
                                 />
                 <KeyTrap global={false} target_ref={this.state.iRef} bindings={key_bindings} />
             </React.Fragment>

        )
    }

}

TextNode.propTypes = {
    the_text: PropTypes.string,
    unique_id: PropTypes.string,
    handleTextChange: PropTypes.func,
    changeNode: PropTypes.func,
    insertDataBox: PropTypes.func
};

class DataBox extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    _handleChange(evt) {
        let the_html = evt.target.value;
        console.log(the_html)
    }

    _closeMe() {
        this.props.changeNode(this.props.unique_id, "closed", true)
    }

    _openMe() {
        this.props.changeNode(this.props.unique_id, "closed", false)
    }

    render() {
        if (this.props.closed) {

            return (
                <Button type="button"
                        className="closed-data-box"
                        minimal={false}
                        onMouseDown={(e)=>{e.preventDefault()}}
                        onClick={this._openMe}
                        icon="box">
            </Button>
            )

        }
        let the_content = this.props.line_list.map((the_line, index) => (
                <DataboxLine key={the_line.unique_id}
                             unique_id={the_line.unique_id}
                             changeNode={this.props.changeNode}
                             handleTextChange={this.props.handleTextChange}
                             insertDataBox={this.props.insertDataBox}
                             node_list={the_line.node_list}/>
            ));

        return (
            <div className="data-box" >
                <CloseButton handleClick={this._closeMe}/>
                {the_content}
            </div>
        )
    }
}

DataBox.propTypes = {
    name: PropTypes.string,
    closed: PropTypes.bool,
    unique_id: PropTypes.string,
    line_list: PropTypes.array,
    handleTextChange: PropTypes.func,
    changeNode: PropTypes.func,
    insertDataBox: PropTypes.func
};

DataBox.defaultProps = {
    closed: false
};

class CloseButton extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }
    
    render () {
        return (
            <Button type="button"
                    className="close-button"
                      minimal={true}
                      small={true}
                      intent="danger"
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

class DataboxLine extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    render() {
        let the_content = this.props.node_list.map((the_node, index) => {
            if (the_node.kind == "text") {
                return (
                    <TextNode key={the_node.unique_id}
                              changeNode={this.props.changeNode}
                              handleTextChange={this.props.handleTextChange}
                              insertDataBox={this.props.insertDataBox}
                              unique_id={the_node.unique_id}
                              the_text={the_node.the_text}/>
                )
            }
            else  {
                return (
                    <DataBox key={the_node.unique_id}
                             changeNode={this.props.changeNode}
                             handleTextChange={this.props.handleTextChange}
                             insertDataBox={this.props.insertDataBox}
                             unique_id={the_node.unique_id}
                             closed={the_node.closed}
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
    handleTextChange: PropTypes.func,
    changeNode: PropTypes.func,
    insertDataBox: PropTypes.func
};