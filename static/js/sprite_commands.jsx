import React from "react";

import {graphics_kinds} from "./shared_consts.js";
import {extractText, guid, doBinding, degreesToRadians, _convertColorArg, _svgConvertColorArg} from "./utilities.js";

import {defaultFontFamily, defaultFontSize, defaultFontStyle, defaultPenColor, defaultPenWidth} from "./shared_consts";
import {Ellipse, Rectangle, Line} from "./pixi_shapes.js";
import {SvgRect, SvgLine, } from "./svg_shapes.js";
import PIXI from "pixi.js";
import {Container, Text} from "react-pixi-fiber";

export {SpriteNode}

const sprite_params =[
        "xPosition",
        "yPosition",
        "pen",
        "shown",
        "heading",
        "spriteSize",
        "penWidth",
        "fontFamily",
        "fontSize",
        "fontStyle"
];

class SpriteNode {
    constructor(param_dict) {
        doBinding(this);
        for (let k in param_dict) {
            this[k] = _.cloneDeep(param_dict[k])
        }
        this.saveParams = Object.keys(param_dict);
    }

    getContainingGraphicsNode() {
        let base_id = window.getBaseNode().unique_id;
        function getGBox(the_id) {
            if (the_id == base_id) {
                return null
            }
            let cnode = window.getNode(the_id)
            if (graphics_kinds.includes(cnode.kind)) {
                return cnode
            }
            else {
                return getGBox(cnode.parent)
            }
        }
        return getGBox(this.unique_id);
    }

    useSvg() {
        return this.getContainingGraphicsNode().kind == "svggraphics";
    }

    getParam(pname) {
        for (let lin of this.line_list) {
            for (let nd of lin.node_list) {
                if (nd.name == pname) {
                    return _extractValue(nd)
                }
            }
        }
        for (let nd of mnode.closetLine.node_list) {
            if (nd.name == pname) {
                return _extractValue(nd)
            }
        }
        return null
    }


    getAllParams() {
        let pdict = {};
        for (let lin of this.line_list) {
            for (let nd of lin.node_list) {
                if (sprite_params.includes(nd.name)) {
                    pdict[nd.name]  = _extractValue(nd)
                }
                if (nd.name == "shape") {
                    pdict["shape_components"] = nd.drawn_components
                }
            }
        }
        for (let nd of this.closetLine.node_list) {
            if (sprite_params.includes(nd.name)) {
                pdict[nd.name] = _extractValue(nd)
            }
            if (nd.name == "penColor") {
                let color_string = nd.line_list[0].node_list[0].the_text;
                if (this.useSvg()) {
                    pdict.penColor = _svgConvertColorArg(color_string)
                }
                else {
                    pdict.penColor = _convertColorArg(color_string)
                }
            }
        }
        return pdict
    }

    setMyParams(param_dict, callback=null) {
        window.setSpriteParams(this.unique_id, param_dict, ()=>{
            if (callback) {
                callback(param_dict)
            }
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
                    "penColor": defaultPenColor,
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
        this.setHeading(this.getParam("heading") + deg, callback)
    }

    left(deg) {
        this.setHeading(his.getParam("heading") - deg)
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

    stampRectangle(w, h, hollow=false) {
        let sparams = this.getAllParams();
        let new_comp;
        if (!this.useSvg()) {
            new_comp = (<Rectangle x={sparams["xPosition"]} y={sparams["yPosition"]} key={guid()}
                           width={w} height={h} fill={hollow ? null : sparams["penColor"]}
                           penWidth={sparams["penWidth"]} penColor={sparams["penColor"]}
            />);
        }
        else {
            new_comp = (<SvgRect x={sparams["xPosition"]} y={sparams["yPosition"]} key={guid()}
                        width={w} height={h} fill={hollow ? null : sparams["penColor"]}
                        penWidth={sparams["penWidth"]} penColor={sparams["penColor"]}/>)
        }

        this.addComponent(new_comp)
    }

    dot() {
        let sparams = this.getAllParams();
        this.stampRectangle(sparams.penWidth, sparams.penWidth)
    }

    stampEllipse(w, h, hollow=false) {
        let sparams = this.getAllParams(sprite_id);
        let new_comp = (<Ellipse x={sparams.xPosition} y={sparams.yPosition} key={guid()}
                                 width={w} height={h} fill={hollow ? null : sparams.penColor}
                                 penWidth={sparams.penWidth} penColor={sparams.penColor}
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
        let sparams = this.getAllParams();
        const style = new PIXI.TextStyle({
          fontFamily: sparams.fontFamily,
          fontSize: sparams.fontSize,
          fontStyle: sparams.fontStyle,
        });
        let new_comp =  (
            <Container scale={[1, -1]}>
                <Text x={sparams.xPosition} y={sparams.yPosition} align="center" text={the_text}/>
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

        let sparams = this.getAllParams();
        if (pdown == null) {
            pdown = sparams["pen"]
        }
        if (newX != sparams.xPosition || newY != sparams.yPosition) {
            let new_comp;
            if (pdown) {
                if (!in_svg) {
                    new_comp = (<Line x={sparams.xPosition} y={sparams.yPosition}
                                  xend={newX} yend={newY}
                                  key={guid()}
                                  penwidth={sparams.penWidth} pencolor={sparams.penColor}

                />);
                }
                else {
                    new_comp = (<SvgLine x={sparams.xPosition} y={sparams.yPosition}
                                         xend={newX} yend={newY}
                                         key={guid()}
                                         penWidth={sparams.penWidth}
                                         penColor={sparams.penColor}

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
        let sparams = this.getAllParams();
        let maxX = gnode.graphics_fixed_width / 2;
        let minX = -1 * maxX;
        let maxY = gnode.graphics_fixed_height / 2;
        let minY = -1 * maxY;
        let the_heading;
        if (distance >= 0) {
            the_heading = sparams["heading"]
        }
        else {
            the_heading = sparams["heading"] + 180
        }
        distance = Math.abs(distance);
        let h_radians = degreesToRadians(the_heading);
        let cosAngle = Math.cos(h_radians);
        let sinAngle = Math.sin(h_radians);
        let x = sparams["xPosition"];
        let y = sparams["yPosition"];
        let self = this;
        if (distance > 0) {
            var newX = sparams["xPosition"] + sinAngle * distance;
            var newY = sparams["yPosition"] + cosAngle * distance;

            function xWrap(cutBound, otherBound) {
                var distanceToEdge = Math.abs((cutBound - x) / sinAngle);
                var edgeY = cosAngle * distanceToEdge + y;
                self._updatedNode().moveTo(cutBound, edgeY, sparams["pen"],()=> {
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
                self._updatedNode().moveTo(edgeX, cutBound, sparams["pen"],()=> {
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
                self._updatedNode().moveTo(newX, newY, sparams["pen"], callback);
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


function _extractValue(nd) {
    let the_text = nd.line_list[0].node_list[0].the_text;
    if (isNaN(the_text)){
        if (the_text.toLowerCase() == "false") {
            return false
        }
        else if (the_text.toLowerCase() == "true") {
            return true
        }
        return the_text
    }
    else {
        return eval(the_text)
    }
}


function _getText(aboxorstring) {
    let the_text = null;
    if (typeof(aboxorstring) == "object") {
        the_text = extractText(aboxorstring);
    }
    else if (typeof(aboxorstring) == "string") {
        the_text = aboxorstring
    }
    else if (typeof(aboxorstring) == "number") {
        the_text = aboxorstring
    }
    return the_text
}
