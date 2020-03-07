import React from "react";
import Sketch from "react-p5";
import PropTypes from 'prop-types';
import {doBinding} from "./utilities.js";
// import {DragHandle} from "./resizing_layouts";
export {P5TurtleBox}



class P5TurtleBox extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);

        this.isPenDown = true;
        this._stateStack = [];
        this.p5 = null;
        this.canvasParentRef = null;
        this.savedImage = null;
        this.x = 0;
        this.y = 0;
        this.xleft = -1 * this.props.fixed_with / 2;
        this.ytop = this.props.fixed_height / 2;
        this.bearing = 0;
        this.state = {
            resizing: false,
            dwidth: 0,
            dheight: 0,
            // bearingRadians: 0,
            startingWidth: null,
            startingHeight: null,
            // x: this.props.fixed_width / 2,
            // y: this.props.fixed_height / 2,
            // newX: this.props.fixed_width / 2,
            // newY: this.props.fixed_height / 2
        };
    }

    _clear() {
        this.p5.clear();
        this.p5.background(255, 204, 0);
        this.savedImage = this.p5.get();
        this.x = 0;
        this.y = 0;
        this._drawTurtle();
        // this.setState({
        //     bearingRadians: 0,
        //     x: this.props.fixed_width / 2,
        //     y : this.props.fixed_height / 2,
        //     newX: this.props.fixed_width / 2,
        //     newY: this.props.fixed_height / 2
        // }, ()=>{this._drawTurtle()});

    }
    _moveTo(newX, newY) {
        if (newX != this.x || newY != this.y) {
            this.p5.image(this.savedImage, 0, 0);
            if (this.isPenDown) {
                this.p5.strokeWeight(2);
                this.p5.stroke(51);
                this.p5.line(this.x, this.y, newX, newY);
                this.savedImage = this.p5.get()
            }
            this.x = newX;
            this.y = newY;
            this._drawTurtle()
        }
    }

    _moveForward(distance) {
      var newX = this.state.x + cos(this.state.bearingRadians) * distance;
      var newY = this.state.y + sin(this.state.bearingRadians) * distance;
      this._moveTo(newX, newY);
    };

    _drawTurtle() {
        this.p5.strokeWeight(4);
        this.p5.ellipse(this.x, this.y, 10, 10);
    }

    _setup(p5, canvasParentRef) {
        this.p5 = p5;
        this.canvasParentRef = canvasParentRef;

        p5.createCanvas(this.props.fixed_width, this.props.fixed_height).parent(canvasParentRef); // use parent to render canvas in this ref (without that p5 render this canvas outside your component)
        p5.background(255, 204, 0);
        this.savedImage = p5.get();
        this._drawTurtle();
        p5.noLoop()
    }

    _draw(p5) {

        // if (this.state.newX != this.state.x || this.state.newY != this.state.y) {
        //     p5.image(this.savedImage, 0, 0);
        //     if (this.isPenDown) {
        //         p5.strokeWeight(2);
        //         p5.stroke(51);
        //         p5.line(this.state.x, this.state.y, this.state.newX, this.state.newY);
        //         this.savedImage = p5.get()
        //     }
        //     // p5.translate(this.state.newX, this.state.newY);
        //     this.setState({x: this.state.newX, y: this.state.newY}, ()=> {
        //             this._drawTurtle()
        //         }
        //     );
        // }


      //p5.rotate(this.bearingRadians + PI * 0.5);
      // p5.imageMode(CENTER);
      // p5.image(i, 0, 0, w, h);
    }

    render() {
        return (
            <div className="data-box-outer">
                <Sketch setup={this._setup} draw={this._draw}/>
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