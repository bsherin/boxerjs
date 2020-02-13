import React from "react";
import ContentEditable from "react-contenteditable";
import PropTypes from "prop-types";

import { Icon } from "@blueprintjs/core";

import {doBinding} from "./utilities";
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
        console.log("hello")
    }

    _refHandler(the_ref) {
        this.setState({iRef: the_ref});
    }

    render() {
        let key_bindings = [[["ctrl+a"], this._displayMessage], [["ctrl+f"], this._displayMessage]];
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
    handleTextChange: PropTypes.func
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

    render() {
        let the_content = this.props.line_list.map((the_line, index) => (
                <DataboxLine key={the_line.unique_id}
                             unique_id={the_line.unique_id}
                             handleTextChange={this.props.handleTextChange}
                             node_list={the_line.node_list}/>
            ));

        return (
            <div className="data-box" >
                <Icon icon="small-cross" className="close-button" iconSize={14}/>
                {the_content}
            </div>
        )
    }
}

DataBox.propTypes = {
    name: PropTypes.string,
    unique_id: PropTypes.string,
    line_list: PropTypes.array,
    handleTextChange: PropTypes.func
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
                              handleTextChange={this.props.handleTextChange}
                              unique_id={the_node.unique_id}
                              the_text={the_node.the_text}/>
                )
            }
            else  {
                return (
                    <DataBox key={the_node.unique_id}
                             handleTextChange={this.props.handleTextChange}
                             unique_id={the_node.unique_id}
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

DataBox.propTypes = {
    unique_id: PropTypes.string,
    node_list: PropTypes.array,
    handleTextChange: PropTypes.func
};