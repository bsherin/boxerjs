import React from "react";
import Sketch from "react-p5";
import PropTypes from 'prop-types';
import {doBinding, extractText, isNormalInteger} from "./utilities.js";
import {DragHandle} from "./resizing_layouts";
// import {DragHandle} from "./resizing_layouts";
export {P5TurtleBox}



class P5TurtleBox extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);


        this._stateStack = [];
        this.p5 = null;
        this.bgp5 = null;
        this.tp5 = null;
        this.ty = 0;
        this.tx = 0;
        this.canvasParentRef = null;

        this.bgcanvasParentRef = null;

        this.x = 0;
        this.y = 0;
        this.xcenter = this.props.fixed_width / 2;
        this.ycenter = this.props.fixed_height / 2;

        this.isPenDown = true;
        this.show_turtle = true;
        this.bgcolor = "rgb(255,255,255)";
        this.heading = 0;
        this.do_wrap = true;
        this.pen_width = 1;
        this.pen_color = 0;
        this.sprite_size = 1;
    }


    _clear() {
        this.bgp5.clear();
        this.bgp5.background(this.bgcolor);
        this.x = 0;
        this.y = 0;
        this.heading = 0;
        this._postDraw();

    }

    _clean() {
        this.bgp5.clear();
        this.bgp5.background(this.bgcolor);
        this._postDraw();

    }

    _setHeading(deg) {
        this.heading = deg;
        this._preDraw();
        this._drawTurtle();
    }

    _right(deg) {
        this._setHeading(this.heading + deg)
    }

    _left(deg) {
        this._setHeading(this.heading - deg)
    }

    _penup() {
        this.isPenDown = false;
    }

    _pendown() {
        this.isPenDown = true;
    }

    _showTurtle() {
        this.show_turtle = true;
        this._preDraw();
        this._postDraw();
    }

    _hideTurtle() {
        this.show_turtle = false;
        this._preDraw();
        this._postDraw();
    }

    _cX(x) {
        return this.xcenter + x
    }

    _cY(y) {
        return this.ycenter - y
    }

    _c(x, y) {
        return [this._cX(x), this._cY(y)]
    }

    _cxy() {
        return [this._cX(this.x), this._cY(this.y)]
    }

    _preDraw() {
        this.p5.clear();
        this.p5.copy(this.bgp5.get(), 0, 0, this.props.fixed_width, this.props.fixed_height, 0, 0, this.props.fixed_width, this.props.fixed_height);
        //this.p5.image(this.savedImage, 0, 0);
    }

    _postDraw(draw_turtle=true) {
        // this.savedImage = this.p5.get();
        this.p5.copy(this.bgp5.get(), 0, 0, this.props.fixed_width, this.props.fixed_height, 0, 0, this.props.fixed_width, this.props.fixed_height);
        if (draw_turtle) {
            this._drawTurtle();
        }
    }

    _moveTo(newX, newY) {
        if (newX != this.x || newY != this.y) {
            this._preDraw();
            if (this.isPenDown) {
                this.bgp5.strokeWeight(this.pen_width);
                this.bgp5.stroke(this.pen_color);
                let [cx, cy] = this._cxy();
                let [cnewX, cnewY] = this._c(newX, newY);
                this.bgp5.line(cx, cy, cnewX, cnewY);
                this._postDraw(false)
            }
            this.x = newX;
            this.y = newY;
            this._drawTurtle()
        }
    }

    _stampRectangle(w, h, hollow=false) {
        let [x, y] = this._cxy();
        this._preDraw();
        this.bgp5.rectMode(this.bgp5.CENTER);
        if (hollow) {
            this.bgp5.noFill();
        }
        else {
            this.bgp5.fill(this.pen_color);
        }
        this.bgp5.strokeWeight(this.pen_width);
        this.bgp5.rect(x, y, w, h);
        this._postDraw();
    }

    _dot() {
        this._stampRectangle(this.pen_width, this.pen_width)
    }

    _stampEllipse(w, h, hollow=false) {
        let [x, y] = this._cxy();
        this._preDraw();
        this.bgp5.ellipseMode(this.bgp5.CENTER);
        if (hollow) {
            this.bgp5.noFill();
        }
        else {
            this.bgp5.fill(this.pen_color);
        }
        this.bgp5.strokeWeight(this.pen_width);
        this.bgp5.ellipse(x, y, w, h);
        this._postDraw();
    }

    _getText(aboxorstring) {
        let the_text = null;
        if (typeof(aboxorstring) == "object") {
            the_text = extractText(abox);
        }
        else if (typeof(aboxorstring) == "string") {
            the_text = aboxorstring
        }
        else if (typeof(aboxorstring) == "number") {
            the_text = aboxorstring
        }
        return the_text
    }

    get styleDict() {
        return {
            itatic:  this.bgp5.ITALIC,
            bold:  this.bgp5.BOLD,
            normal: this.bgp5.NORMAL,
            bolditalic: this.bgp5.BOLDITALIC
        }
    }


    _setGraphicsMode(aboxorstring) {
        let the_text = this._getText(aboxorstring);
        if (!the_text) return;
        if (the_text.toLowerCase() == "clip") {
            this.do_wrap = false;
        }
        else {
            this.do_wrap = true;
        }
    }

    _setTypeFont(aboxorstring) {
        let the_text = this._getText(aboxorstring);
        if (!the_text) return;
        let [fname, fstyle, fsize] = the_text.trim().split(" ");
        this.bgp5.textFont(fname);
        this.bgp5.textStyle(this.styleDict[fstyle.toLowerCase()]);
        this.bgp5.textSize(parseInt(fsize));
    }


    _setPenColor(aboxorstring) {
        let the_text = this._getText(aboxorstring);
        if (!the_text) return;
        let the_color_strings = the_text.trim().split(" ");
        if (the_color_strings.length == 1) {
            let the_str = the_color_strings[0];
            if (isNormalInteger(the_str)) {
                this.pen_color = this.bgp5.color(parseInt(the_str));
                return
            }
            else {
                this.pen_color = this.bgp5.color(the_str)
                return
            }
        }
        let the_color_ints = [];
        for (let c of the_color_strings) {
            the_color_ints.push(parseInt(c))
        }

        this.pen_color = this.bgp5.color(`rgb(${String(the_color_ints)})`);
    }

    _type(aboxorstring) {
        let the_text = this._getText(aboxorstring);

        if (!the_text) return;
        let [x, y] = this._cxy();
        this._preDraw();
        this.bgp5.textAlign(this.bgp5.CENTER, this.bgp5.CENTER);
        this.bgp5.fill(this.pen_color);
        this.bgp5.strokeWeight(this.pen_width);
        this.bgp5.text(the_text, x, y);
        this._postDraw();
    }

    _setPenWidth(w) {

        this.pen_width = w;
    }
    _moveForward(distance) {

        let maxX = this.props.fixed_width / 2;
        let minX = -1 * maxX;
        let maxY = this.props.fixed_height / 2;
        let minY = -1 * maxY;
        let cosAngle = this.p5.cos(this.heading);
        let sinAngle = this.p5.sin(this.heading);
        let x = this.x;
        let y = this.y;
        let self = this;
        while (distance > 0) {
            var newX = this.x + sinAngle * distance;
            var newY = this.y + cosAngle * distance;

            function xWrap(cutBound, otherBound) {
                var distanceToEdge = Math.abs((cutBound - x) / sinAngle);
                var edgeY = cosAngle * distanceToEdge + y;
                self._moveTo(cutBound, edgeY);
                distance -= distanceToEdge;
                x = otherBound;
                y = edgeY;
                let pds = self.isPenDown;
                self.isPenDown = false;
                self._moveTo(x, y);
                self.isPenDown = pds;
            }
            // wrap on the Y boundary
            function yWrap(cutBound, otherBound) {
                var distanceToEdge = Math.abs((cutBound - y) / cosAngle);
                var edgeX = sinAngle * distanceToEdge + x;
                self._moveTo(edgeX, cutBound);
                distance -= distanceToEdge;
                x = edgeX;
                y = otherBound;
                let pds = self.isPenDown;
                self.isPenDown = false;
                self._moveTo(x, y);
                self.isPenDown = pds;
            }
            // don't wrap the turtle on any boundary
            function noWrap() {
                self._moveTo(newX, newY);
                distance = 0;
            }
            if (this.do_wrap) {
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

    };

    _drawTurtle() {
        // this.p5.strokeWeight(4);
        let [cx, cy] = this._cxy();
        if (this.tp5 && this.show_turtle) {
            this.p5.push();
            this.p5.translate(cx, cy);
            this.p5.rotate(this.heading);
            this.p5.copy(this.tp5.get(), 0, 0, this.props.fixed_width, this.props.fixed_height,
                -1 * this.tx, -1 * this.ty, this.props.fixed_width, this.props.fixed_height);
            this.p5.pop()
        }
    }

    _setup(p5, canvasParentRef) {
        this.p5 = p5;
        this.canvasParentRef = canvasParentRef;

        p5.createCanvas(this.props.fixed_width, this.props.fixed_height).parent(canvasParentRef); // use parent to render canvas in this ref (without that p5 render this canvas outside your component)
        p5.background(this.bgcolor);
        p5.angleMode(p5.DEGREES);
        this.heading = 0;
        // this._drawTurtle();
        p5.noLoop()
    }


    _setSpriteSize(somearg) {
        let the_arg = this._getText(somearg);
        if (typeof(the_arg) == "string") {
            the_arg = parseInt(the_arg)
        }
        this.sprite_size = the_arg;
        this._preDraw();
        this._initTurtleCanvas();
        this._postDraw()
    }

    _drawTriangle(x, y, p5) {
        let w = 10;
        let h = 15;
        p5.noFill();
        let f = this.sprite_size
        p5.triangle(
            x - f * w / 2, y + f * h / 2,
            x, y - f * h / 2,
            x + f * w / 2, y + f * h / 2
        );
    }

    _tsetup(p5, canvasParentRef) {
        this.tp5 = p5;
        p5.createCanvas(this.props.fixed_width, this.props.fixed_height).parent(canvasParentRef);
        this._initTurtleCanvas()
    }

    _initTurtleCanvas() {
        this.tp5.clear();
        this.tp5.strokeWeight(1);
        [this.tx, this.ty] = this._c(0, 0);
        this._drawTriangle(this.tx, this.ty, this.tp5);
        this._drawTurtle();
        this.tp5.noLoop();
    }

    _bgsetup(p5, canvasParentRef) {
        this.bgp5 = p5;
        this.bgcanvasParentRef = canvasParentRef;
        this.bgp5.angleMode(this.bgp5.DEGREES);
        this.bgp5.background(this.bgcolor);
        p5.createCanvas(this.props.fixed_width, this.props.fixed_height).parent(canvasParentRef);

    }
    
    _initBgCanvas() {
        this.bgp5.clear();
        p5.noLoop()
    }

    _draw(p5) {

    }

    _startResize(e, ui, startX, startY) {
        this.start_width = this.props.fixed_width;
        this.start_height = this.props.fixed_height;
    }

    _onResize(e, ui, x, y, dx, dy) {
        this.p5.resizeCanvas(this.start_width + dx, this.start_height + dy);
    }

    _setSize(new_width, new_height) {
        this.props.funcs.setNodeSize(this.props.unique_id, new_width, new_height)
    }

    componentDidUpdate() {
        if (this.p5) {
            this.p5.clear();
            this.xcenter = this.props.fixed_width / 2;
            this.ycenter = this.props.fixed_height / 2;
            this.bgp5.resizeCanvas(this.props.fixed_width, this.props.fixed_height);
            this.tp5.resizeCanvas(this.props.fixed_width, this.props.fixed_height);
            this.bgp5.clear();
            this._initTurtleCanvas();
        }

    }

    _stopResize(e, ui, x, y, dx, dy) {
        let self = this;

        this._setSize(this.start_width + dx, this.start_height + dy)
    }

    render() {
        let draghandle_position_dict = {position: "absolute", bottom: 2, right: 1};
        return (
            <div className="data-box-outer">
                <Sketch setup={this._setup} className="data-box turtle-box" draw={this._draw}/>
                <Sketch style={{display: "none"}} setup={this._bgsetup} draw={this._draw}/>
                <Sketch style={{display: "none"}} setup={this._tsetup} draw={this._draw}/>
                <DragHandle position_dict={draghandle_position_dict}
                            dragStart={this._startResize}
                            onDrag={this._onResize}
                            dragEnd={this._stopResize}
                            direction="both"
                            iconSize={15}/>
            </div>
        )
    }
}

P5TurtleBox.propTypes = {
    unique_id: PropTypes.string,
    fixed_width: PropTypes.number,
    fixed_height: PropTypes.number,
    funcs: PropTypes.object
};

P5TurtleBox.defaultProps = {
    fixed_width: 300,
    fixed_height: 300
};