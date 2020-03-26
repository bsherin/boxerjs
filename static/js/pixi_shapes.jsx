
import {Graphics, Point} from "pixi.js";
import * as PIXI from "pixi.js";
// noinspection ES6CheckImport
import {CustomPIXIComponent} from "react-pixi-fiber";
import React from "react";

export {Rectangle, Ellipse, Line, shape_classes, Triangle}

const Rectangle = CustomPIXIComponent({
  customDisplayObject: props => new Graphics(),
  customApplyProps: (instance, oldProps, newProps) => {
    const { x, y, width, height, fill, penWidth, penColor} = newProps;
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

const Line = CustomPIXIComponent({
  customDisplayObject: props => new PIXI.Graphics(),
  customApplyProps: function(instance, oldProps, newProps) {
    const {x, y, xend, yend, penwidth, pencolor} = newProps;
    instance.clear();
    instance.lineStyle(penwidth, pencolor)
        .moveTo(x, y)
        .lineTo(xend, yend);
  }
}, "Line");

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

