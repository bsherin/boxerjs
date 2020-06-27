
import React from "react";
import PropTypes from 'prop-types';
import {doBinding} from "../utility/utilities.js";
import {DragHandle} from "../third_party/resizing_layouts";

export {TurtleBox}

class TurtleBox extends React.Component {

    constructor(props) {
        super(props);
        doBinding(this);
        this.turtleId = "turtle" + this.props.unique_id;
        this.imageId = "image" + this.props.unique_id;
        this.imageRef = React.createRef();
        this.turtleRef = React.createRef();
        this.turtle = null;
        this.initialize = this.initialize.bind(this);
        this.clear = this.clear.bind(this);
        this.reset = this.reset.bind(this);
        this.forward = this.forward.bind(this);
        this.wrap = this.wrap.bind(this);
        this.hideTurtle = this.hideTurtle.bind(this);
        this.showTurtle = this.showTurtle.bind(this);
        this.redrawOnMove = this.redrawOnMove.bind(this);
        this.penup = this.penup.bind(this);
        this.pendown = this.pendown.bind(this);
        this.right = this.right.bind(this);
        this.left = this.left.bind(this);
        this.setxy = this.setxy.bind(this);
        this.setheading = this.setheading.bind(this);
        this.width = this.width.bind(this);
        this.write = this.write.bind(this);
        this.setcolor = this.setcolor.bind(this);
        this.random = this.random.bind(this);
        this.repeat = this.repeat.bind(this);
        this.animate = this.animate.bind(this);
        this.setFont = this.setFont.bind(this);
        this.state = {
            resizing: false,
            dwidth: 0,
            dheight: 0,
            startingWidth: null,
            startingHeight: null
        };


    }
    componentDidMount() {
        this.imageContext = this.imageRef.current.getContext('2d');
        this.imageContext.textAlign = "center";
        this.imageContext.textBaseline = "middle";
        this.turtleContext = this.turtleRef.current.getContext('2d');
        this.turtleContext.globalCompositeOperation = 'destination-over';
        this.initialize();
        this.reset();
    }

    initialize() {
        this.turtle = {
            pos: {
                x: 0,
                y: 0
            },
            angle: 0,
            penDown: true,
            width: 1,
            visible: true,
            redraw: true, // does this belong here?
            wrap: true,
            colour: {
                r: 0,
                g: 0,
                b: 0,
                a: 1
            },
        };
        this.imageContext.lineWidth = this.turtle.width;
        this.imageContext.strokeStyle = "black";
        this.imageContext.globalAlpha = 1;
    }

    // draw the turtle and the current image if redraw is true
    // for complicated drawings it is much faster to turn redraw off
    _drawIf() {
        if (this.turtle.redraw) this._draw();
    }

    // use canvas centered coordinates facing upwards
     _centerCoords(context) {
        var width = context.canvas.width;
        var height = context.canvas.height;
        context.translate(width / 2, height / 2);
        context.transform(1, 0, 0, -1, 0, 0);
    }

    // draw the turtle and the current image
    _draw() {
        this._clearContext(this.turtleContext);
        if (this.turtle.visible) {
            var x = this.turtle.pos.x;
            var y = this.turtle.pos.y;
            var w = 10;
            var h = 15;
            this.turtleContext.save();
            // use canvas centered coordinates facing upwards
            this._centerCoords(this.turtleContext);
            // move the origin to the turtle center
            this.turtleContext.translate(x, y);
            // rotate about the center of the turtle
            this.turtleContext.rotate(-1 * this.turtle.angle);
            // move the turtle back to its position
            this.turtleContext.translate(-x, -y);
            // draw the turtle icon
            this.turtleContext.beginPath();
            this.turtleContext.moveTo(x - w / 2, y);
            this.turtleContext.lineTo(x + w / 2, y);
            this.turtleContext.lineTo(x, y + h);
            this.turtleContext.closePath();
            this.turtleContext.fillStyle = "green";
            this.turtleContext.fill();
            this.turtleContext.restore();
        }
        this.turtleContext.drawImage(this.imageRef.current, 0, 0, this.props.fixed_width, this.props.fixed_height,
            0, 0, this.props.fixed_width, this.props.fixed_height,);
    }

    // clear the display, don't move the turtle
    clear() {
        this._clearContext(this.imageContext);
        this._drawIf();
    }

    _clearContext(context) {
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.restore();
    }

    // reset the whole system, clear the display and move turtle back to
    // origin, facing the Y axis.
    reset() {
        this.initialize();
        this.clear();
        this._draw();
    }

    // Trace the forward motion of the turtle, allowing for possible
    // wrap-around at the boundaries of the canvas.
    forward(distance) {
        this.imageContext.save();
        this._centerCoords(this.imageContext);
        this.imageContext.beginPath();
        // get the boundaries of the canvas
        var maxX = this.imageContext.canvas.width / 2;
        var minX = -this.imageContext.canvas.width / 2;
        var maxY = this.imageContext.canvas.height / 2;
        var minY = -this.imageContext.canvas.height / 2;
        var x = this.turtle.pos.x;
        var y = this.turtle.pos.y;
        let self = this;
        // trace out the forward steps
        while (distance > 0) {
            // move the to current location of the turtle
            this.imageContext.moveTo(x, y);
            // calculate the new location of the turtle after doing the forward movement
            var cosAngle = Math.cos(this.turtle.angle);
            var sinAngle = Math.sin(this.turtle.angle);
            var newX = x + sinAngle * distance;
            var newY = y + cosAngle * distance;

            // wrap on the X boundary
            function xWrap(cutBound, otherBound) {
                var distanceToEdge = Math.abs((cutBound - x) / sinAngle);
                var edgeY = cosAngle * distanceToEdge + y;
                self.imageContext.lineTo(cutBound, edgeY);
                distance -= distanceToEdge;
                x = otherBound;
                y = edgeY;
            }
            // wrap on the Y boundary
            function yWrap(cutBound, otherBound) {
                var distanceToEdge = Math.abs((cutBound - y) / cosAngle);
                var edgeX = sinAngle * distanceToEdge + x;
                self.imageContext.lineTo(edgeX, cutBound);
                distance -= distanceToEdge;
                x = edgeX;
                y = otherBound;
            }
            // don't wrap the turtle on any boundary
            function noWrap() {
                self.imageContext.lineTo(newX, newY);
                self.turtle.pos.x = newX;
                self.turtle.pos.y = newY;
                distance = 0;
            }
            // if wrap is on, trace a part segment of the path and wrap on boundary if necessary
            if (this.turtle.wrap) {
                if (newX > maxX)
                    xWrap(maxX, minX);
                else if (newX < minX)
                    xWrap(minX, maxX);
                else if (newY > maxY)
                    yWrap(maxY, minY);
                else if (newY < minY)
                    yWrap(minY, maxY);
                else
                    noWrap();
            }
            // wrap is not on.
            else {
                noWrap();
            }
        }
        // only draw if the pen is currently down.
        if (this.turtle.penDown)
            this.imageContext.stroke();
        this.imageContext.restore();
        this._drawIf();
    }

    // turn edge wrapping on/off
    wrap(bool) {
        this.turtle.wrap = bool;
    }

    // show/hide the turtle
    hideTurtle() {
        this.turtle.visible = false;
        this._drawIf();
    }

    // show/hide the turtle
    showTurtle() {
        this.turtle.visible = true;
        this._drawIf();
    }

    // turn on/off redrawing
    redrawOnMove(bool) {
        this.turtle.redraw = bool;
    }

    // lift up the pen (don't draw)
    penup() {
        this.turtle.penDown = false;
    }
    // put the pen down (do draw)
    pendown() {
        this.turtle.penDown = true;
    }

    // turn right by an angle in degrees
    right(angle) {
        this.turtle.angle += this._degToRad(angle);
        this._drawIf();
    }

    // turn left by an angle in degrees
    left(angle) {
        this.turtle.angle -= this._degToRad(angle);
        this._drawIf();
    }

    // move the this.turtle to a particular coordinate (don't draw on the way there)
    setxy(x, y) {
        this.turtle.pos.x = x;
        this.turtle.pos.y = y;
        this._drawIf();
    }

    // set the angle of the turtle in degrees
    setheading(angle) {
        this.turtle.angle = this._degToRad(angle);
        this._drawIf();
    }

    // convert degrees to radians
    _degToRad(deg) {
        return deg / 180 * Math.PI;
    }

    // convert radians to degrees
    _radToDeg(rad) {
        return rad * 180 / Math.PI;
    }

    // set the width of the line
    width(w) {
        this.turtle.width = w;
        this.imageContext.lineWidth = w;
    }

    // write some text at the turtle position.
    // ideally we'd like this to rotate the text based on
    // the turtle orientation, but this will require some clever
    // canvas transformations which aren't implemented yet.
    write(msg) {
        this.imageContext.save();
        this._centerCoords(this.imageContext);
        this.imageContext.translate(this.turtle.pos.x, this.turtle.pos.y);
        this.imageContext.transform(1, 0, 0, -1, 0, 0);
        this.imageContext.translate(-this.turtle.pos.x, -this.turtle.pos.y);
        this.imageContext.fillText(msg, this.turtle.pos.x, this.turtle.pos.y);
        this.imageContext.restore();
        this._drawIf();
    }

    // set the colour of the line using RGB values in the range 0 - 255.
    setcolor(r, g, b, a) {
        this.imageContext.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + a + ")";
        this.turtle.colour.r = r;
        this.turtle.colour.g = g;
        this.turtle.colour.b = b;
        this.turtle.colour.a = a;
    }

    // Generate a random integer between low and hi
    random(low, hi) {
        return Math.floor(Math.random() * (hi - low + 1) + low);
    }

    repeat(n, action) {
        for (var count = 1; count <= n; count++)
            action();
    }

    animate(f, ms) {
        return setInterval(f, ms);
    }

    setFont(font) {
        this.imageContext.font = font;
    }

    _startResize(e, ui, startX, startY) {
        let start_width = this.props.fixed_width;
        let start_height = this.props.fixed_height;
        this.setState({resizing: true, dwidth: 0, dheight: 0,
            startingWidth: start_width, startingHeight: start_height})
    }

    _onResize(e, ui, x, y, dx, dy) {
        this.setState({dwidth: dx, dheight: dy})
    }

    _setSize(new_width, new_height) {
        this.props.setNodeSize(this.props.unique_id, new_width, new_height)
    }

    _stopResize(e, ui, x, y, dx, dy) {
        let self = this;
        this.setState({resizing: false, dwidth: 0, dheight:0}, ()=>{
            self._setSize(this.state.startingWidth + dx, this.state.startingHeight + dy)})
    }

    render() {
        let draghandle_position_dict = {position: "absolute", bottom: 2, right: 1};
        return (
            <div className="data-box-outer">
                <div className="data-box turtle-box">
                    <canvas id="this.props.turtleId"
                            ref={this.turtleRef}
                            width={this.state.resizing ? this.props.fixed_width + this.state.dwidth : this.props.fixed_width}
                            height={this.props.fixed_height ? this.props.fixed_height + this.state.dheight : this.props.fixed_height}>
                    </canvas>
                    <canvas id="this.props.imageId"
                            ref={this.imageRef}
                            width={this.props.fixed_width ?  this.props.fixed_width + this.state.dwidth : this.props.fixed_width}
                            height={this.props.fixed_height ? this.props.fixed_height + this.state.dheight : this.props.fixed_height}
                            style={{display: "none"}}>
                    </canvas>
                    <DragHandle position_dict={draghandle_position_dict}
                            dragStart={this._startResize}
                            onDrag={this._onResize}
                            dragEnd={this._stopResize}
                            direction="both"
                            iconSize={15}/>
                </div>
            </div>
        )
    }
}

TurtleBox.propTypes = {
    unique_id: PropTypes.string,
    fixed_width: PropTypes.number,
    fixed_height: PropTypes.number,
    funcs: PropTypes.object
};

TurtleBox.defaultProps = {
    fixed_width: 300,
    fixed_height: 300
};


