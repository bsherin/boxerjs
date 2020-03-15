import React from "react";

import PropTypes from 'prop-types';
import {doBinding, extractText, isNormalInteger, degreesToRadians, rgbToHex} from "./utilities.js";
import {DragHandle} from "./resizing_layouts";

import { Graphics, Point } from 'pixi.js';
import { PixiComponent, Stage, Sprite, Text} from '@inlet/react-pixi';
import * as PIXI from 'pixi.js'


export {PixiTurtleBox}

function _cX(x, fw) {
    let xcenter = fw / 2;
    return xcenter + x
}

function _cY(y, fh) {
    let ycenter = fh / 2;
    return ycenter - y
}

function _c(x, y, fw, fh) {
    return [_cX(x, fw), _cY(y, fh)]
}

const Rectangle = PixiComponent('Rectangle', {
  create: props => new Graphics(),
  applyProps: (instance, _, props) => {
    const { x, y, width, height, fill, fw, fh, penWidth, penColor} = props;
    let [tx, ty] = _c(x, y, fw, fh);
    instance.clear();
    if (fill != null) {
        instance.beginFill(fill);

    }
    else {
        instance.lineStyle(penWidth, penColor);
    }
    instance.drawRect(tx - width / 2, ty - height / 2, width, height);
    if (fill != null) {
        instance.endFill();
    }
  },
});

const Ellipse = PixiComponent('Ellipse', {
  create: props => new Graphics(),
  applyProps: (instance, _, props) => {
    const { x, y, width, height, fill, penWidth, penColor } = props;
    instance.clear();
    if (fill != null) {
        instance.beginFill(fill);

    }
    else {
        instance.lineStyle(penWidth, penColor);
    }
    instance.drawEllipse(x, y, width / 2, height / 2);
    instance.endFill();
  },
});

const tw = 11;
const th = 15;
const turtleColor = 0x008000;

const TriangleTurtle = PixiComponent('TriangleTurtle', {
  create: props => new Graphics(),
  applyProps: (instance, _, props) => {
    const { x, y, heading, sf } = props;
    instance.clear();
    instance.position.x = 0;
    instance.position.y = 0;
    instance.beginFill(turtleColor);
    instance.drawPolygon(
        new Point(x - sf * tw / 2, y + sf * th / 2),
        new Point(x, y - sf * th / 2),
        new Point(x + sf * tw / 2, y + sf * th / 2)
    );
    instance.endFill();
    instance.position.x = x;
    instance.position.y = y;
    instance.pivot.x = x;
    instance.pivot.y = y;
    instance.angle = heading;

  },
});


const Line = PixiComponent('Line', {
  create: props => new Graphics(),
  applyProps: (instance, _, props) => {
    const { x, y, xend, yend, fw, fh, penwidth, pencolor} = props;
    let [rx, ry] = _c(x, y, fw, fh);
    let [rxend, ryend] = _c(xend, yend, fw, fh);
    instance.clear();
    instance.lineStyle(penwidth, pencolor)
       .moveTo(rx, ry)
       .lineTo(rxend, ryend);
  },
});

function convertColorArg(the_color_strings) {
    let bgcolor;
    if (the_color_strings.length == 1) {
        let the_str = the_color_strings[0];
        if (isNormalInteger(the_str)) {
            bgcolor = parseInt(the_str);
        }
        else {
            bgcolor = the_str;
        }
}
    else {
        let cnums = [];
        for (let c of the_color_strings) {
            cnums.push(parseInt(c))
        }
        bgcolor = rgbToHex(cnums[0], cnums[1], cnums[2]);
    }
    return bgcolor
}

const defaultBgColor = 0xFFFFFF;
const defaultPenWidth = 1;
const defaultPenColor = 0x000000;
const defaultFontFamily = "Arial";
const defaultFontSize = 14;
const defaultFontStyle = "Normal";

class PixiTurtleBox extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.shape_var = 0;

        this.do_wrap = true;
        this.state = {
            turtleX: 0,
            turtleY: 0,
            penDown: true,
            showTurtle: true,
            heading: 0,
            spriteSize: 1,
            bgColor: defaultBgColor,
            penColor: defaultPenColor,
            penWidth: defaultPenWidth,
            fontFamily: defaultFontFamily,
            fontSize: defaultFontSize,
            fontStyle: defaultFontStyle,
            drawnComponents: []
        }
    }

    _clear() {
        this.setState({
            turtleX: 0,
            turtleY: 0,
            penDown: true,
            heading: 0,
            showTurtle: true,
            spriteSize: 1,
            penColor: defaultPenColor,
            penWidth: defaultPenWidth,
            fontFamily: defaultFontFamily,
            fontSize: defaultFontSize,
            fontStyle: defaultFontStyle,
            drawnComponents: [],
        })
    }

    _clean() {
        this.setState({
            drawnComponents: [],
        })
    }

    _setHeading(deg) {
        this.setState({heading: deg})
    }

    _right(deg) {
        this._setHeading(this.state.heading + deg)
    }

    _left(deg) {
        this._setHeading(this.state.heading - deg)
    }

    _penup() {
        this.setState({penDown: false})
    }

    _pendown() {
        this.setState({penDown: true})
    }

    _showTurtle() {
        this.setState({showTurtle: true})
    }

    _hideTurtle() {
        this.setState({showTurtle: false})
    }

    _cX(x) {
        let xcenter = this.props.fixed_width / 2;
        return xcenter + x
    }

    _cY(y) {
        let ycenter = this.props.fixed_height / 2;
        return ycenter - y
    }

    _c(x, y) {
        return [this._cX(x), this._cY(y)]
    }

    _cxy() {
        return [this._cX(this.state.turtleX), this._cY(this.state.turtleY)]
    }

    _moveTo(newX, newY, pdown=null, callback=null) {
        if (pdown == null) {
            pdown = this.state.penDown
        }
        if (newX != this.state.turtleX || newY != this.turtleY) {
            let new_comp;
            if (pdown) {
                new_comp = (<Line x={this.state.turtleX} y={this.state.turtleY}
                                  xend={newX} yend={newY}
                                  fw={this.props.fixed_width} fh={this.props.fixed_height}
                                  penwidth={this.state.penWidth} pencolor={this.state.penColor}

                />);
                let clist = _.cloneDeep(this.state.drawnComponents);
                clist.push(new_comp);
                this.setState({turtleX: newX, turtleY: newY, drawnComponents: clist}, callback);
            }

            else {
                this.setState({turtleX: newX, turtleY: newY}, callback);
            }
        }
    }

    _stampRectangle(w, h, hollow=false) {
        let new_comp = (<Rectangle x={this.state.turtleX} y={this.state.turtleY}
                                   width={w} height={h} fill={hollow ? null : this.state.penColor}
                                   fw={this.props.fixed_width} fh={this.props.fixed_height}
                                   penWidth={this.state.penWidth} penColor={this.state.penColor}
        />);
        this.setState({drawnComponents: [...this.state.drawnComponents, new_comp]})
    }

    _dot() {
        this._stampRectangle(this.state.penWdth, this.state.penWidth)
    }

    _stampEllipse(w, h, hollow=false) {
        let [tx, ty] = this._cxy();
        let new_comp = (<Ellipse x={tx} y={ty} width={w} height={h} fill={hollow ? null : this.state.penColor}
                                 penWidth={this.state.penWidth} penColor={this.state.penColor}
        />);
        this.setState({drawnComponents: [...this.state.drawnComponents, new_comp]})
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
        this.setState({fontFamily: fname, fontStyle: fstyle, fontsize: parseInt(fsize)})
    }


    _setPenColor(aboxorstring) {
        let the_text = this._getText(aboxorstring);
        if (!the_text) return;
        let the_color_strings = the_text.trim().split(" ");
        let pcolor = convertColorArg(the_color_strings);
        this.setState({penColor: pcolor});
    }

    _setBackgroundColor(aboxorstring) {
        let the_text = this._getText(aboxorstring);
        if (!the_text) return;
        let the_color_strings = the_text.trim().split(" ");
        let bgcolor = convertColorArg(the_color_strings);
        this.setState({bgColor: bgcolor})
    }

    _type(aboxorstring) {
        let the_text = this._getText(aboxorstring);
        if (!the_text) return;
        const style = new PIXI.TextStyle({
          fontFamily: this.state.fontFamily,
          fontSize: this.state.fontSize,
          fontStyle: this.state.fontStyle,
        });
        let [x, y] = this._cxy();
        let new_comp =  (<Text x={x} y={y} align="center" text={the_text}/>);
        this.setState({drawnComponents: [...this.state.drawnComponents, new_comp]})
    }

    _setPenWidth(w) {
        this.setState({penWidth: w});
    }
    
    _moveForward(distance) {

        let maxX = this.props.fixed_width / 2;
        let minX = -1 * maxX;
        let maxY = this.props.fixed_height / 2;
        let minY = -1 * maxY;
        let h_radians = degreesToRadians(this.state.heading);
        let cosAngle = Math.cos(h_radians);
        let sinAngle = Math.sin(h_radians);
        let x = this.state.turtleX;
        let y = this.state.turtleY;
        let self = this;
        if (distance > 0) {
            var newX = this.state.turtleX + sinAngle * distance;
            var newY = this.state.turtleY + cosAngle * distance;

            function xWrap(cutBound, otherBound) {
                var distanceToEdge = Math.abs((cutBound - x) / sinAngle);
                var edgeY = cosAngle * distanceToEdge + y;
                self._moveTo(cutBound, edgeY, self.state.penDown,()=> {
                    distance -= distanceToEdge;
                    x = otherBound;
                    y = edgeY;
                    self._moveTo(x, y, false, ()=>{
                        if (distance > 0) {
                            self._moveForward(distance)
                        }});
                });

            }
            function yWrap(cutBound, otherBound) {
                var distanceToEdge = Math.abs((cutBound - y) / cosAngle);
                var edgeX = sinAngle * distanceToEdge + x;
                self._moveTo(edgeX, cutBound, self.state.penDown,()=> {
                    distance -= distanceToEdge;
                    x = edgeX;
                    y = otherBound;
                    self._moveTo(x, y, false, ()=>{
                        if (distance > 0) {
                            self._moveForward(distance)
                        }
                    });
                });
            }
            function noWrap() {
                self._moveTo(newX, newY);
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
            else {
                noWrap();
            }
        }
    };

    _setSpriteSize(somearg) {
        let the_arg = this._getText(somearg);
        if (typeof(the_arg) == "string") {
            the_arg = parseInt(the_arg)
        }
        this.setState({spriteSize: the_arg});
    }

    _startResize(e, ui, startX, startY) {
        this.start_width = this.props.fixed_width;
        this.start_height = this.props.fixed_height;
    }

    _onResize(e, ui, x, y, dx, dy) {
        this.props.funcs.setNodeSize(this.props.unique_id, this.start_width + dx, this.start_height + dy)
    }

    _setSize(new_width, new_height) {
        this.props.funcs.setNodeSize(this.props.unique_id, new_width, new_height)
    }

    _stopResize(e, ui, x, y, dx, dy) {
        this._setSize(this.start_width + dx, this.start_height + dy)
    }

    render() {
        let draghandle_position_dict = {position: "absolute", bottom: 2, right: 1};
        let [tx, ty] = this._cxy();
        let dbclass = "data-box turtle-box";
        if (this.props.selected) {
            dbclass += " selected"
        }
        return (
            <div className="data-box-outer">
                <div className={dbclass}>
                  <Stage width={this.props.fixed_width}
                         height={this.props.fixed_height}
                  >
                      <Sprite width={this.props.fixed_width} height={this.props.fixed_height}
                              texture={PIXI.Texture.WHITE}
                              tint={this.state.bgColor} />
                      {this.state.showTurtle &&
                          <TriangleTurtle x={tx} y={ty} heading={this.state.heading} sf={this.state.spriteSize}/>
                      }
                      {this.state.drawnComponents.length > 0 &&
                      this.state.drawnComponents}
                  </Stage>
                </div>
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

PixiTurtleBox.propTypes = {
    unique_id: PropTypes.string,
    fixed_width: PropTypes.number,
    fixed_height: PropTypes.number,
    funcs: PropTypes.object
};

PixiTurtleBox.defaultProps = {
    fixed_width: 300,
    fixed_height: 300
};


