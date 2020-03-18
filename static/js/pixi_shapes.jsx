import {PixiComponent} from "@inlet/react-pixi";
import {Graphics, Point} from "pixi.js";

import { useApp } from '@inlet/react-pixi'

export {Rectangle, Ellipse, TriangleTurtle, Line}

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