// import {PixiComponent} from "@inlet/react-pixi";
import {Graphics, Point, Sprite} from "pixi.js";
import * as PIXI from "pixi.js";
import {CustomPIXIComponent} from "react-pixi-fiber";
import React from "react";

export {Rectangle, Ellipse, Line, shape_classes, SimpleLine, Triangle}


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

const Rectangle = CustomPIXIComponent({
  customDisplayObject: props => new Graphics(),
  customApplyProps: (instance, oldProps, newProps) => {
    const { x, y, width, height, fill, fw, fh, penWidth, penColor} = newProps;
    instance.clear();
    if (fill != null) {
        instance.beginFill(fill);

    }
    else {
        instance.lineStyle(penWidth, penColor);
    }
    instance.drawRect(x - width / 2, y - height / 2, width, height);
    if (fill != null) {
        instance.endFill();
    }
  },
}, 'Rectangle');

const Ellipse = CustomPIXIComponent({
  customDisplayObject: props => new Graphics(),
  customApplyProps: (instance, oldProps, newProps) => {
    const { x, y, width, height, fill, penWidth, penColor } = newProps;
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
}, 'Ellipse');

const tw = 11;
const th = 15;
const turtleColor = 0x008000;

const Line = CustomPIXIComponent({
  customDisplayObject: props => new PIXI.Graphics(),
  customApplyProps: function(instance, oldProps, newProps) {
    const {x, y, xend, yend, fw, fh, penwidth, pencolor} = newProps;
    instance.clear();
    instance.lineStyle(penwidth, pencolor)
        .moveTo(x, y)
        .lineTo(xend, yend);
  }
}, "Line");

const SimpleLine = CustomPIXIComponent({
  customDisplayObject: props => new PIXI.Graphics(),
  customApplyProps: function(instance, oldProps, newProps) {
    const {xstart, ystart, xend, yend, penwidth, pencolor} = newProps;
    instance.clear();
    instance.lineStyle(1, 0)
          .moveTo(xstart, ystart)
          .lineTo(xend, yend);
  }
}, "SimpleLine");

const Triangle = CustomPIXIComponent({
  customDisplayObject: props => new Graphics(),
  customApplyProps: (instance, _, props) => {
    const {tw, th, tcolor} = props;
    instance.clear();
    instance.beginFill(tcolor);
    instance.drawPolygon(
        new Point(0 - tw / 2, - th / 2),
        new Point(0, th / 2),
        new Point(tw / 2, - th / 2)
    );
    instance.endFill();
    instance.pivot.x = 0;
    instance.pivot.y = 0;
  },
}, 'Triangle');


const shape_classes = {
  Rectangle: Rectangle,
  Ellipse: Ellipse,
  Line: Line,
  Triangle: Triangle
};

// texture creation experiments
// must be rendered into a container I think
//
// Look also at TriangleTurtle and generateTexture


// let _turtleTexture = null;
//
// function _setTurtleTexture(ttext) {
//     _turtleTexture = ttext
// }
//
// const tt = (
//     <AppContext.Consumer >
//                     {app =>
//                         <TriangleTurtle x={150} y={150} heading={0} sf={13} app={app} setTexture={_setTurtleTexture}/>
//                     }
//     </AppContext.Consumer>);
// )
