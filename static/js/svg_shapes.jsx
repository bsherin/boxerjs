import React from "react";
import PropTypes from "prop-types";
import {doBinding, guid} from "./utility/utilities";

export {SvgLine, SvgRect, SvgTriangle, svg_shape_classes}

class SvgLine extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
    }

    render() {
        return (
            <line key={guid()}
                  x1={this.props.x} y1={this.props.y}
                  x2={this.props.xend} y2={this.props.yend}
                  strokeWidth={this.props.penWidth} stroke={this.props.penColor}
                />
        )
    }
}

SvgLine.type_name = "SvgLine";  // this is needed for dehydrating in production build

class SvgRect extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
    }

    render() {
        return (
            <rect key={guid()}
                  x={this.props.x} y={this.props.y}
                  width={this.props.width} height={this.props.height}
                  strokeWidth={this.props.penWidth} stroke={this.props.penColor}
                  fill={this.props.fill}
                />
        )
    }
}

SvgRect.propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    penWidth: PropTypes.number,
    stroke: PropTypes.string,
    fill: PropTypes.string,
}

SvgRect.defaultProps = {
    stroke: null,
    penWidth: null
}

SvgRect.type_name = "SvgRect";

class SvgTriangle extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
    }

    render() {
        let x = this.props.x;
        let y = this.props.y;
        let w = this.props.width;
        let h = this.props.height;
        let point_string = `${x - w / 2}, ${y - h / 2} ${x}, ${y + h / 2} ${x + w / 2}, ${y - h / 2}`
        return (
            <polygon key={guid()}
                  points={point_string}
                  width={this.props.width} height={this.props.height}
                  strokeWidth={this.props.penWidth} stroke={this.props.penColor}
                  fill={this.props.fill}
                />
        )
    }
}

SvgTriangle.propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    penWidth: PropTypes.number,
    penColor: PropTypes.string,
    fill: PropTypes.string,
}

SvgTriangle.type_name = "SvgTriangle";

SvgTriangle.defaultProps = {
    x: 0,
    y: 0,
    stroke: null,
    penWidth: null
}

const svg_shape_classes = {
    SvgLine: SvgLine,
    SvgRect: SvgRect,
    SvgTriangle: SvgTriangle
};

