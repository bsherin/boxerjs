import React from "react";

import {graphics_kinds, sprite_params} from "./shared_consts.js";
import {_getText, _extractValue, guid, doBinding, degreesToRadians, _convertColorArg, _svgConvertColorArg} from "./utility/utilities.js";

import {defaultFontFamily, defaultFontSize, defaultFontStyle, defaultPenColorString, defaultPenWidth} from "./shared_consts.js";
import {setSpriteParams} from "./redux/actions/composite_actions.js";
import {Ellipse, Rectangle, Line} from "./pixi_shapes.js";
import {SvgRect, SvgLine, } from "./svg_shapes.js";
import PIXI from "pixi.js";
import {Container, Text} from "react-pixi-fiber";

import {_getln} from "./redux/selectors.js";
import {_getContainingGraphicsBox} from "./redux/selectors";

export {SpriteNode}


window.getNode = (uid) => {
    return window.store.getState().node_dict[uid]
}

class SpriteNode {
    constructor(param_dict) {
        doBinding(this);
        for (let k in param_dict) {
            this[k] = _.cloneDeep(param_dict[k])
        }
        // this.saveParams = Object.keys(param_dict);
    }

    getContainingGraphicsNode() {
        return _getContainingGraphicsBox(this.unique_id, window.store.getState().node_dict)
    }

    useSvg() {
        let cgb = this.getContainingGraphicsNode()
        return cgb && (this.getContainingGraphicsNode().kind == "svggraphics")
    }

    getParam(pname) {
        let llist = [... this.line_list];
        llist.push(this.closetLine);
        for (let lin_id of llist) {
            for (let nd_id of window.getNode(lin_id).node_list) {
                let nd = window.getNode(nd_id);
                if (nd.name == pname) {
                    if (nd.name == "shape") {
                        return nd.drawn_components
                    }
                    else if (nd.name == "penColor") {
                        let color_string = window.getNode(_getln(nd_id, 0, 0, window.store.getState().node_dict)).the_text;
                        if (this.useSvg()) {
                            return _svgConvertColorArg(color_string)
                        } else {
                            return _convertColorArg(color_string)
                        }
                    } else {
                        return _extractValue(nd_id)
                    }
                }
            }
        }
        return null
    }

    getAllParams() {
        let llist = [...this.line_list];
        llist.push(this.closetLine);
        let pdict = {};
        for (let lin of llist) {
            for (let nd_id of window.getNode(lin).node_list) {
                let nd = window.getNode(nd_id);
                if (sprite_params.includes(nd.name)) {
                    if (nd.name == "shape") {
                        pdict["shape_components"] = nd.drawn_components
                    }
                    else if (nd.name == "penColor") {
                        let color_string = window.getNode(_getln(nd_id, 0, 0, window.store.getState().node_dict)).the_text;
                        if (this.useSvg()) {
                            pdict.penColor = _svgConvertColorArg(color_string)
                        } else {
                            pdict.penColor = _convertColorArg(color_string)
                        }
                    } else {
                        pdict[nd.name] = _extractValue(nd_id)
                    }
                }
            }
        }
        return pdict
    }

    setMyParams(param_dict, callback=null) {
        window.store.dispatch(setSpriteParams(this.unique_id, param_dict))
            .then(()=>{
                window.vstore.dispatch(setSpriteParams(this.unique_id, param_dict))
                    .then(()=>{
                        if (callback) {
                            callback(param_dict)
                        }
                    })
            })
    }

    clean(callback=null) {
        let gnode = this.getContainingGraphicsNode()
        if (gnode) {
            gnode.clearComponents(()=>{
                if (callback) {
                    callback(param_dict)
                }
            });
        }
    }

    clear(callback=null) {
        let gnode = this.getContainingGraphicsNode();
        let self = this;
        if (gnode) {
            gnode.clearComponents(() => {
                self.setMyParams({
                    xPosition: 0,
                    yPosition: 0,
                    pen: true,
                    shown: true,
                    heading: 0,
                    "spriteSize": 1,
                    "penColor": defaultPenColorString,
                    "penWidth": defaultPenWidth,
                    "fontFamily": defaultFontFamily,
                    "fontSize": defaultFontSize,
                    "fontStyle": defaultFontStyle
                }, callback)
            });
        }
    }

    addComponent(new_comp, callback=null) {
        let gnode = this.getContainingGraphicsNode()
        if (gnode) {
            gnode.addGraphicsComponent(new_comp, callback);
        }
    }

    setHeading(deg, callback=null) {
        let mdeg = deg % 360;
        if (mdeg < 0) {
            mdeg = 360 + mdeg
        }
        this.setMyParams({"heading": mdeg}, callback)
    }

    right(deg, callback=null) {
        this.setHeading(this.sparams.heading + deg, callback)
    }

    left(deg) {
        this.setHeading(this.sparams.heading - deg)
    }

    penup(callback=null) {
        this.setMyParams({pen: false})
    }

    pendown(callback=null) {
        this.setMyParams({pen: true}, callback)
    }

    showTurtle(callback=null) {
        this.setMyParams({shown: true}, callback)
    }

    hideTurtle(callback=null) {
        this.setMyParams({shown: false}, callback)
    }

    get pcolor() {
        if (this.useSvg()) {
            return _svgConvertColorArg(this.sparams.penColor)
        }
        else {
            return _convertColorArg(this.sparams.penColor)
        }
    }

    stampRectangle(w, h, hollow=false) {
        let new_comp;
        if (!this.useSvg()) {
            new_comp = (<Rectangle x={this.sparams["xPosition"]} y={this.sparams["yPosition"]} key={guid()}
                           width={w} height={h} fill={hollow ? null : this.pcolor}
                           penWidth={this.sparams["penWidth"]} penColor={this.pcolor}
            />);
        }
        else {
            new_comp = (<SvgRect x={this.sparams["xPosition"]} y={this.sparams["yPosition"]} key={guid()}
                        width={w} height={h} fill={hollow ? null : this.pcolor}
                        penWidth={this.sparams["penWidth"]} penColor={this.pcolor}/>)
        }

        this.addComponent(new_comp)
    }

    dot() {
        this.stampRectangle(this.sparams.penWidth, this.sparams.penWidth)
    }

    stampEllipse(w, h, hollow=false) {
        let new_comp = (<Ellipse x={this.sparams.xPosition} y={this.sparams.yPosition} key={guid()}
                                 width={w} height={h} fill={hollow ? null : this.pcolor}
                                 penWidth={this.sparams.penWidth} penColor={this.pcolor}
        />);
        this.addComponent(new_comp)
    }

    setGraphicsMode(aboxorstring) {
        let the_text = _getText(aboxorstring);
        if (!the_text) return;
        let gnode = this.getContainingGraphicsNode()
        if (gnode) {
            if (the_text.toLowerCase() == "clip") {
                gnode.setWrap(false);
            } else {
                gnode.setWrap(true);
            }
        }
    }

    setTypeFont(aboxorstring, callback=null) {
        let the_text = _getText(aboxorstring);
        if (!the_text) return;
        let [fname, fstyle, fsize] = the_text.trim().split(" ");
        this.setMyParams({fontFamily: fname, fontStyle: fstyle, fontsize: parseInt(fsize)}, callback)
    }

    setPenColor(aboxorstring, callback=null) {
        let the_text = _getText(aboxorstring);
        if (!the_text) return;
        let the_color_strings = the_text.trim().split(" ");
        // let pcolor = _convertColorArg(the_color_strings);
        this.setMyParams({penColor: the_text}, callback);
    }

    setBackgroundColor(aboxorstring) {
        let the_text = _getText(aboxorstring);
        if (!the_text) return;
        let gnode = this.getContainingGraphicsNode()
        if (gnode) {
            gnode.setBgColor(the_text)
        }
    }

    type(aboxorstring) {
        let the_text = _getText(aboxorstring);
        if (!the_text) return;
        const style = new PIXI.TextStyle({
          fontFamily: this.sparams.fontFamily,
          fontSize: this.sparams.fontSize,
          fontStyle: this.sparams.fontStyle,
        });
        let new_comp =  (
            <Container scale={[1, -1]}>
                <Text x={this.sparams.xPosition} y={this.sparams.yPosition} align="center" text={the_text}/>
            </Container>
        );
        this.addComponent(new_comp)
    }

    setPosition(abox) {
        let the_text = _getText(abox);
        if (!the_text) return;
        let [x, y] = the_text.split(" ");
        this.moveTo(parseInt(x), parseInt(y))
    }

    setPenWidth(w, callback=null) {
        this.setMyParams({penWidth: w}, callback);
    }

    setSpriteSize(aboxorstring, callback=null) {
        let the_arg = _getText(aboxorstring);
        if (typeof(the_arg) == "string") {
            the_arg = parseInt(the_arg)
        }
        this.setMyParams({spriteSize: the_arg}, callback);
    }

    moveTo(newX, newY, pdown=null, callback=null) {
        let in_svg = this.useSvg();

        if (pdown == null) {
            pdown = this.sparams["pen"]
        }
        if (newX != this.sparams.xPosition || newY != this.sparams.yPosition) {
            let new_comp;
            if (pdown) {
                if (!in_svg) {
                    new_comp = (<Line x={this.sparams.xPosition} y={this.sparams.yPosition}
                                  xend={newX} yend={newY}
                                  key={guid()}
                                  penwidth={this.sparams.penWidth} pencolor={_convertColorArg(this.pcolor)}

                />);
                }
                else {
                    new_comp = (<SvgLine x={this.sparams.xPosition} y={this.sparams.yPosition}
                                         xend={newX} yend={newY}
                                         key={guid()}
                                         penWidth={this.sparams.penWidth}
                                         penColor={_svgConvertColorArg(this.pcolor)}

                    />);
                }

                this.addComponent(new_comp, ()=>{
                    this.setMyParams ({"xPosition": newX, "yPosition": newY}, ()=>{
                        if (callback) {
                            callback(newX, newY)
                        }
                    });
                });
            }
            else {
                this.setMyParams ({"xPosition": newX, "yPosition": newY}, ()=>{
                    if (callback) {
                        callback(newX, newY)
                    }
                });
            }
        }
    }

    _updatedNode() {
        return window.getNode(this.unique_id)
    }

    moveForward(distance, callback=null) {
        let gnode = this.getContainingGraphicsNode();
        if (!gnode) return;

        let do_wrap = gnode.do_wrap;
        let maxX = gnode.graphics_fixed_width / 2;
        let minX = -1 * maxX;
        let maxY = gnode.graphics_fixed_height / 2;
        let minY = -1 * maxY;
        let the_heading;
        if (distance >= 0) {
            the_heading = this.sparams["heading"]
        }
        else {
            the_heading = this.sparams["heading"] + 180
        }
        distance = Math.abs(distance);
        let h_radians = degreesToRadians(the_heading);
        let cosAngle = Math.cos(h_radians);
        let sinAngle = Math.sin(h_radians);
        let x = this.sparams["xPosition"];
        let y = this.sparams["yPosition"];
        let self = this;
        if (distance > 0) {
            var newX = this.sparams["xPosition"] + sinAngle * distance;
            var newY = this.sparams["yPosition"] + cosAngle * distance;

            function xWrap(cutBound, otherBound) {
                var distanceToEdge = Math.abs((cutBound - x) / sinAngle);
                var edgeY = cosAngle * distanceToEdge + y;
                self._updatedNode().moveTo(cutBound, edgeY, self.sparams["pen"],()=> {
                    distance -= distanceToEdge;
                    x = otherBound;
                    y = edgeY;
                    self._updatedNode().moveTo(x, y, false, ()=>{
                        if (distance > 0) {
                            self._updatedNode().moveForward(distance, callback)
                        }});
                });
            }
            function yWrap(cutBound, otherBound) {
                var distanceToEdge = Math.abs((cutBound - y) / cosAngle);
                var edgeX = sinAngle * distanceToEdge + x;
                self._updatedNode().moveTo(edgeX, cutBound, self.sparams["pen"],()=> {
                    distance -= distanceToEdge;
                    x = edgeX;
                    y = otherBound;
                    self._updatedNode().moveTo(x, y, false, ()=>{
                        if (distance > 0) {
                            self._updatedNode().moveForward(distance, callback)
                        }
                    });
                });
            }
            function noWrap() {
                self._updatedNode().moveTo(newX, newY, self.sparams["pen"], callback);
            }
            if (do_wrap) {
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
}


