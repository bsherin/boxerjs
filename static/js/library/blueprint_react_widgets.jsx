
import React from "react";
import PropTypes from 'prop-types';

import { Tooltip, Button, FormGroup, InputGroup, HTMLSelect } from "@blueprintjs/core";

export {LabeledSelectList, LabeledFormField, SelectList, DragThing, GlyphButton, withTooltip}
import {doBinding} from "../utility/utilities.js";

function withTooltip(WrappedComponent) {
    return class extends React.Component {
        render () {
            if (this.props.tooltip) {
                let delay = this.props.tooltipDelay ? this.props.tooltipDelay : 1000;
                return (
                        <Tooltip content={this.props.tooltip} hoverOpenDelay={delay}>
                            <WrappedComponent {...this.props}/>
                        </Tooltip>
                    )
                }
            else {
                return  <WrappedComponent {...this.props}/>
            }
        }
    }
}

class GlyphButton extends React.Component {

    constructor(props) {
        super(props);
        this.update_props = ["icon", "minimal", "extra_glyph_text", "style"]
    }

    shouldComponentUpdate(nextProps, nextState) {
        for (let prop of this.update_props) {
            if (nextProps[prop] != this.props[prop]) {
                return true
            }
        }
        return false
    }

    render () {
        let style = this.props.style == null ? {paddingLeft: 2, paddingRight:2} : this.props.style;
        return (
           <Button type="button"
                      minimal={this.props.minimal}
                      small={true}
                      style={style}
                      onMouseDown={(e)=>{e.preventDefault()}}
                      onClick={this.props.handleClick}
                      intent={this.props.intent}
                      icon={this.props.icon}>
               {this.props.extra_glyph_text &&
                    <span className="extra-glyph-text">{this.props.extra_glyph_text}</span>
               }
            </Button>
        );
    }
}

GlyphButton.propTypes = {
    icon: PropTypes.string,
    minimal: PropTypes.bool,
    extra_glyph_text: PropTypes.string,
    style: PropTypes.object,
    handleClick: PropTypes.func,
    intent: PropTypes.string,
};

GlyphButton.defaultProps = {
    style: null,
    extra_glyph_text: null,
    minimal: true,
    intent: "none",
};

GlyphButton = withTooltip(GlyphButton);


class DragThing extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.state = {
            xpos: 0,
            ypos: 0,
            initial_x: null,
            initial_y: null,
            active: false
        }
    }
    
    _dragStart(e) {
        this.setState({
            initial_x: e.clientX,
            initial_y: e.clientY,
            active: true
        })
    }

    _drag(e) {
        if (this.state.active) {
            let currentX = e.clientX - this.state.initial_x;
            let currentY = e.clientY - this.state.initial_y;
            // this.props.handleDrag(xpos, ypos);
            this.setState({
                xpos: currentX,
                ypos: currentY
            })
        }
    }

    _dragEnd(e) {
        this.setState({active: false,
            xpos: 0,
            ypos: 0
        })
    }

    render() {
        let style ={fontSize: 25};
        if (this.state.active) {
            style.transform = "translate3d(" + this.state.xpos + "px, " + this.state.ypos + "px, 0)"
        }
        return (
            <span style={style}
                  onMouseDown={this._dragStart}
                  onMouseMove={this._drag}
                  onMouseUp={this._dragEnd}
                  className="fal fa-caret-right"/>
        )
    }
}

DragThing.propTypes = {
    handleDrag: PropTypes.func
};


class LabeledFormField extends React.Component {

    render() {
        return (
            <FormGroup label={this.props.label} style={{marginRight: 5}}>
                <InputGroup onChange={this.props.onChange} value={this.props.the_value}/>
            </FormGroup>
        )
    }
}

LabeledFormField.propTypes = {
    show: PropTypes.bool,
    label: PropTypes.string,
    onChange: PropTypes.func,
    the_value: PropTypes.string
};

LabeledFormField.defaultProps = {
    show: true
};

function LabeledSelectList(props) {
    return (
        <FormGroup label={props.label} style={{marginRight: 5}}>
            <HTMLSelect options={props.option_list} onChange={props.onChange} value={props.the_value}/>
        </FormGroup>
    )
}

class SelectList extends React.Component {

    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this)
    }

    handleChange(event) {
        this.props.onChange(event.target.value)
    }
    render() {
        let sstyle = {"marginBottom": 5, "width": "auto"};
        if (this.props.height != null) {
            sstyle["height"] = this.props.height
        }
        if (this.props.maxWidth != null) {
            sstyle["maxWidth"] = this.props.maxWidth
        }
        if (this.props.fontSize != null) {
            sstyle["fontSize"] = this.props.fontSize
        }

        let option_items = this.props.option_list.map((opt, index) =>
                <option key={index}>
                    {opt}
                </option>
        );
        return (
            <HTMLSelect style={sstyle}
                          onChange={this.handleChange}
                           minimal={this.props.minimal}
                          value={this.props.value}
            >
                {option_items}
            </HTMLSelect>
        )
    }
}

SelectList.propTypes = {
    option_list: PropTypes.array,
    onChange: PropTypes.func,
    minimal: PropTypes.bool,
    value: PropTypes.string,
    height: PropTypes.number,
    maxWidth: PropTypes.number,
    fontSize: PropTypes.number,
};

SelectList.defaultProps = {
    height: null,
    maxWidth: null,
    fontSize: null,
    minimal: false
};
