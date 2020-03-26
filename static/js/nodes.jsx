import React from "react";
import ContentEditable from "react-contenteditable";
import PropTypes from "prop-types";

import { Button } from "@blueprintjs/core";

import {doBinding, getCaretPosition, guid, selectedAcrossBoxes, rgbToHex,
    degreesToRadians, propsAreEqual} from "./utilities.js";
import {USUAL_TOOLBAR_HEIGHT, SIDE_MARGIN} from "./sizing_tools.js";
import {BOTTOM_MARGIN} from "./sizing_tools";
import {ReactCodemirror} from "./react-codemirror.js";

import {doExecution, repairCopiedDrawnComponents} from "./eval_space.js";
import {DragHandle} from "./resizing_layouts.js"

import {Line, Rectangle, Ellipse, } from "./pixi_shapes.js";
// noinspection ES6CheckImport
import { Sprite, Stage, withApp, Container, Text} from "react-pixi-fiber";
import * as PIXI from "pixi.js";

import {defaultPenWidth, defaultPenColor, defaultFontFamily} from "./shared_consts.js";
import {defaultFontSize, defaultFontStyle, data_kinds} from "./shared_consts.js";
import {extractText, isNormalInteger} from "./utilities";

export {DataBox, EditableTag, loader}

let currentlyDeleting = false;
const resizeTolerance = 2;

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

PIXI.settings.RESOLUTION = 1;
const loader = PIXI.Loader.shared;
loader.add('turtle', "/static/assets/turtle_image.png");

function _convertColorArg(the_color_strings) {
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

class SpriteBox extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return !propsAreEqual(nextProps, this.props)
    }

    _turtleX() {
        return this._getParam("xPosition")
    }

    _turtleY() {
        return this._getParam("yPosition")
    }

    _myNode() {
        return this.props.funcs.getNode(this.props.unique_id)
    }

    _extractValue(nd) {
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

    _getParam(pname) {
        let mnode = this._myNode();
        for (let lin of mnode.line_list) {
            for (let nd of lin.node_list) {
                if (nd.name == pname) {
                    return this._extractValue(nd)
                }
            }
        }
        for (let nd of mnode.closetLine.node_list) {
            if (nd.name == pname) {
                return this._extractValue(nd)
            }
        }
        return null
    }

    _getAllParams() {
        let pdict = {};
        let mnode = this._myNode();
        for (let lin of mnode.line_list) {
            for (let nd of lin.node_list) {
                if (sprite_params.includes(nd.name)) {
                    pdict[nd.name]  = this._extractValue(nd)
                }
                if (nd.name == "shape") {
                    pdict["shape_components"] = nd.drawn_components
                }
            }
        }
        for (let nd of mnode.closetLine.node_list) {
            if (sprite_params.includes(nd.name)) {
                pdict[nd.name] = this._extractValue(nd)
            }
            if (nd.name == "penColor") {
                let color_string = nd.line_list[0].node_list[0].the_text;
                let the_color_strings = color_string.trim().split(" ");
                pdict.penColor = _convertColorArg(the_color_strings)
            }
        }
        return pdict
    }

    _setMyParams(param_dict, callback) {
        this.props.funcs.setSpriteParams(this.props.unique_id, param_dict, callback)
    }

    _clean() {
        this.props.clearComponents();
    }

    _clear() {
        this.props.clearComponents(()=>{
            this._setMyParams({
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
            })
        });
    }

    _setHeading(deg) {
        let mdeg = deg % 360;
        if (mdeg < 0) {
            mdeg = 360 + mdeg
        }
        this._setMyParams({"heading": mdeg})
    }

    _right(deg) {
        this._setHeading(this._getParam("heading") + deg)
    }

    _left(deg) {
        this._setHeading(this._getParam("heading") - deg)
    }

    _penup() {
        this._setMyParams({pen: false})
    }

    _pendown() {
        this._setMyParams({pen: true})
    }

    _showTurtle() {
        this._setMyParams({shown: true})
    }

    _hideTurtle() {
        this._setMyParams({shown: false})
    }

    _stampRectangle(w, h, hollow=false) {
        let sparams = this._getAllParams();
        let new_comp = (<Rectangle x={sparams["xPosition"]} y={sparams["yPosition"]} key={guid()}
                                   width={w} height={h} fill={hollow ? null : sparams["penColor"]}
                                   penWidth={sparams["penWidth"]} penColor={sparams["penColor"]}
        />);
        this.props.addComponent(new_comp)
    }

    _dot() {
        let sparams = this._getAllParams();
        this._stampRectangle(sparams.penWidth, sparams.penWidth)
    }

    _stampEllipse(w, h, hollow=false) {
        let sparams = this._getAllParams();
        let new_comp = (<Ellipse x={sparams.xPosition} y={sparams.yPosition} key={guid()}
                                 width={w} height={h} fill={hollow ? null : sparams.penColor}
                                 penWidth={sparams.penWidth} penColor={sparams.penColor}
        />);
        this.props.addComponent(new_comp)
    }

    _getText(aboxorstring) {
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

    _setGraphicsMode(aboxorstring) {
        let the_text = this._getText(aboxorstring);
        if (!the_text) return;
        if (the_text.toLowerCase() == "clip") {
            this.props.setWrap(false);
        }
        else {
            this.props.setWrap(true);
        }
    }

    _setTypeFont(aboxorstring) {
        let the_text = this._getText(aboxorstring);
        if (!the_text) return;
        let [fname, fstyle, fsize] = the_text.trim().split(" ");
        this._setMyParams({fontFamily: fname, fontStyle: fstyle, fontsize: parseInt(fsize)})
    }

    _isColor(aboxorstring) {
        return typeof(aboxorstring) == "object" && aboxorstring.hasOwnProperty("kind") &&  aboxorstring.kind == "color"
    }


    _setPenColor(aboxorstring) {
        let the_text = this._getText(aboxorstring);
        if (!the_text) return;
        let the_color_strings = the_text.trim().split(" ");
        let pcolor = _convertColorArg(the_color_strings);
        this._setMyParams({penColor: the_text});
    }

    _setBackgroundColor(aboxorstring) {
        let the_text = this._getText(aboxorstring);
        if (!the_text) return;
        let the_color_strings = the_text.trim().split(" ");
        let bgcolor = _convertColorArg(the_color_strings);
        this.props.setBgColor(bgcolor)
    }

    _type(aboxorstring) {
        let the_text = this._getText(aboxorstring);
        if (!the_text) return;
        let sparams = this._getAllParams();
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
        this.props.addComponent(new_comp)
    }

    _setPenWidth(w) {
        this._setMyParams({penWidth: w});
    }

    _setSpriteSize(aboxorstring) {
        let the_arg = this._getText(aboxorstring);
        if (typeof(the_arg) == "string") {
            the_arg = parseInt(the_arg)
        }
        this._setMyParams({spriteSize: the_arg});
    }

    _moveTo(newX, newY, pdown=null, callback=null) {
        let sparams = this._getAllParams();
        if (pdown == null) {
            pdown = sparams["pen"]
        }
        if (newX != this.props.xPosition || newY != this.props.yPosition) {
            let new_comp;
            if (pdown) {
                new_comp = (<Line x={sparams.xPosition} y={sparams.yPosition}
                                  xend={newX} yend={newY}
                                  key={guid()}
                                  penwidth={sparams.penWidth} pencolor={sparams.penColor}

                />);
                this.props.addComponent(new_comp, ()=>{
                    this._setMyParams ({"xPosition": newX, "yPosition": newY}, callback);
                });
            }
            else {
                this._setMyParams ({"xPosition": newX, "yPosition": newY}, callback);
            }
        }
    }

    _moveForward(distance) {
        let sparams = this._getAllParams();
        let maxX = this.props.graphics_fixed_width / 2;
        let minX = -1 * maxX;
        let maxY = this.props.graphics_fixed_height / 2;
        let minY = -1 * maxY;
        let h_radians = degreesToRadians(sparams["heading"]);
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
                self._moveTo(cutBound, edgeY, sparams["pen"],()=> {
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
                self._moveTo(edgeX, cutBound, sparams["pen"],()=> {
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
                self._moveTo(newX, newY, sparams["pen"]);
            }
            if (self.props.do_wrap) {
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

    render() {
        let sparams = this._getAllParams();
        let the_sprite = (
            <Sprite x={sparams["xPosition"]}
                    y={sparams["yPosition"]}
                    scale={sparams["spriteSize"]}
                    angle={-1 * sparams["heading"]}
                    anchor={[0.5, 0.5]}>
                {sparams.shape_components}
            </Sprite>
        );

        if (this.props.showGraphics) {
            if (sparams.shown) {
                return the_sprite
            }
            return null
        }
        else {
            return (
                <DataBox {...this.props} clickable_label={false}/>
            )
        }

    }
}

class GraphicsBoxRaw extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.do_wrap = true;
        this.boxRef = React.createRef();
        this.state = {
            focusingName: false,
            boxWidth: null,
            resizing: false,
            dwidth: 0,
            dheight: 0,
            startingWidth: null,
            startingHeight: null
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !propsAreEqual(nextState, this.state) || !propsAreEqual(nextProps, this.props)
    }

    _closeMe() {
        if (this.props.am_zoomed) {
            this._unzoomeMe()
        }
        else {
            let have_focus = this.boxRef.current.contains(document.activeElement);
            this.props.funcs.changeNode(this.props.unique_id, "closed", true, ()=>{
                if (have_focus) {
                    this.props.funcs.positionAfterBox(this.props.unique_id)
                }
            })
        }
    }

    _submitNameRef(the_ref) {
        this.nameRef = the_ref
    }

    _doneEditingName(callback=null) {
        this.setState({focusingName: false}, callback)
    }

    componentDidMount() {
        if (this.boxRef && this.boxRef.current) {
            if (this.state.boxWidth != this.boxRef.current.offsetWidth) {
                 this.setState({ boxWidth: this.boxRef.current.offsetWidth });
            }
        }
        if (this.nameRef){
            $(this.nameRef).focus(this._gotNameFocus)
        }
    }

    _gotNameFocus() {
        this.setState({focusingName: true})
    }

    componentDidUpdate () {
        let self = this;
        if (this.props.focusName) {
            if (this.nameRef) {
                $(this.nameRef).focus();
                this.setState({focusingName: true},()=>{
                    self.props.funcs.changeNode(this.props.unique_id, "focusName", false);
                });
            }
        }
        if (!this.props.closed && this.boxRef.current) {
            if (this.state.boxWidth != this.boxRef.current.offsetWidth) {
                 this.setState({ boxWidth: this.boxRef.current.offsetWidth });
            }
        }
    }

    _flipMe() {
        this.boxRef = React.createRef();
        this.props.funcs.changeNode(this.props.unique_id, "showGraphics", !this.props.showGraphics)
    }

    _addComponent(new_comp, callback=null) {
        this.props.funcs.addGraphicsComponent(this.props.unique_id, new_comp, callback);
        //this.setState({drawnComponents: [...this.state.drawnComponents, new_comp]})
    }

    _clearComponents(callback=null) {
        // this.setState({drawnComponents: []})
        this.props.funcs.changeNode(this.props.unique_id, "drawn_components", [], callback)
    }

    _setWrap(wrap) {
        this.do_wrap = wrap;
    }

    _setBgColor(color) {
        this.props.funcs.changeNode(this.props.unique_id, "bgColor", color);
    }

    _startResize(e, ui, startX, startY) {
        let bounding_rect = this.boxRef.current.getBoundingClientRect();

        let start_width = bounding_rect.width;
        let start_height = bounding_rect.height;
        this.setState({ resizing: true, dwidth: 0, dheight: 0,
            startingWidth: start_width, startingHeight: start_height });
    }

    _onResize(e, ui, x, y, dx, dy) {
        this.setState({dwidth: dx, dheight: dy})
    }

    _setSize(new_width, new_height) {
        this.props.funcs.setGraphicsSize(this.props.unique_id, new_width, new_height)
    }

    _stopResize(e, ui, x, y, dx, dy) {
        let self = this;
        this.setState({resizing: false, dwidth: 0, dheight:0}, ()=>{
            if (Math.abs(dx) < resizeTolerance && Math.abs(dy) < resizeTolerance) {
                self._setSize(false, false)
            }
            else {
                self._setSize(this.state.startingWidth + dx, this.state.startingHeight + dy)}
            }
        )

    }

    _snapTexture() {
        return this.props.app.renderer.generateTexture(this.props.app.stage)
    }

    _getColorBoxColor() {
        let mynode = this.props.funcs.getNode(this.props.unique_id);
        let color_string = mynode.line_list[0].node_list[0].the_text;
        let the_color_strings = color_string.trim().split(" ");
        return _convertColorArg(the_color_strings)
    }

    render() {
        let type_label = "Data";
        let dbclass;
        if (this.props.closed) {
            return (
                <DataBox {...this.props} clickable_label={false}/>
            )
        }
        else if (!this.props.showGraphics) {
            return (
                <DataBox {...this.props} clickable_label={true} label_function={this._flipMe}/>
            )
        }
        else {
            let draghandle_position_dict = {position: "absolute", bottom: 2, right: 1};
            let dbclass = "data-box";
            if (this.props.transparent) {
                dbclass += " transparent"
            }
            if (this.props.selected) {
                dbclass += " selected"
            }
            dbclass += " data-box-with-name";
            let gwidth;
            let gheight;
            if (this.state.resizing) {
                gwidth = this.state.startingWidth + this.state.dwidth;
                gheight = this.state.startingHeight + this.state.dheight;
            }
            else {
                gwidth = this.props.graphics_fixed_width;
                gheight = this.props.graphics_fixed_height;
            }
            let outer_class = "data-box-outer";
            if (this.props.name == null && !this.state.focusingName) {
                outer_class += " empty-name"
            }

            if (this.props.kind == "color") {
                let bgcolor = this._getColorBoxColor();
                return (
                    <div className={outer_class}>
                        <EditableTag the_name={this.props.name}
                                     focusingMe={this.state.focusingName}
                                     boxWidth={this.state.boxWidth}
                                     funcs={this.props.funcs}
                                     doneEditingName={this._doneEditingName}
                                     submitRef={this._submitNameRef}
                                     boxId={this.props.unique_id}/>
                        <div className={dbclass} ref={this.boxRef}>
                            <CloseButton handleClick={this._closeMe}/>
                            <Stage options={{width: gwidth, height:gheight, antialias: true}}>
                                <Sprite width={gwidth} height={gheight} key="bgsprite"
                                        texture={PIXI.Texture.WHITE}
                                        tint={bgcolor} />
                            </Stage>

                            <DragHandle position_dict={draghandle_position_dict}
                                        dragStart={this._startResize}
                                        onDrag={this._onResize}
                                        dragEnd={this._stopResize}
                                        direction="both"
                                        iconSize={15}/>
                        </div>
                        {!this.props.am_zoomed && <TypeLabel clickable={true} clickFunc={this._flipMe} the_label={type_label}/>}
                    </div>
                )
            }
            else {
                let sprite_components = [];
                let acindex = 0;
                let temp_ll = _.cloneDeep(this.props.line_list);
                if (this.props.closetLine) {
                    temp_ll.push(this.props.closetLine)
                }
                for (let lin of temp_ll) {
                    for (let nd of lin.node_list) {
                        if (nd.kind == "sprite") {
                            this.props.funcs.setTurtleRef(nd.unique_id, React.createRef());
                            let new_comp = (
                                <SpriteBox {...nd}
                                           key={nd.unique_id}
                                           app={this.props.app}
                                           ref={window.turtle_box_refs[nd.unique_id]}
                                           funcs={this.props.funcs}
                                           graphics_fixed_width={this.props.graphics_fixed_width}
                                           graphics_fixed_height={this.props.graphics_fixed_height}
                                           addComponent={this._addComponent}
                                           do_wrap={this.do_wrap}
                                           setWrap={this._setWrap}
                                           setBgColor={this._setBgColor}
                                           clearComponents={this._clearComponents}
                                           showGraphics={this.props.showGraphics}/>
                            );
                            acindex += 1;
                            if (new_comp) {
                                sprite_components.push(new_comp)
                            }
                        }
                    }
                }
                let draghandle_position_dict = {position: "absolute", bottom: 2, right: 1};
                let dbclass = "data-box";
                if (this.props.transparent) {
                    dbclass += " transparent"
                }
                if (this.props.selected) {
                    dbclass += " selected"
                }
                dbclass += " data-box-with-name";
                let gwidth;
                let gheight;
                if (this.state.resizing) {
                    gwidth = this.state.startingWidth + this.state.dwidth;
                    gheight = this.state.startingHeight + this.state.dheight;
                }
                else {
                    gwidth = this.props.graphics_fixed_width;
                    gheight = this.props.graphics_fixed_height;
                }
                let outer_class = "data-box-outer";
                if (this.props.name == null && !this.state.focusingName) {
                    outer_class += " empty-name"
                }
                let offsetPoint = new PIXI.Point(gwidth / 2, gheight / 2);
                let scalePoint = [-1, 1];  // This reflects over y axis
                return (
                    <div className={outer_class}>
                        <EditableTag the_name={this.props.name}
                                     focusingMe={this.state.focusingName}
                                     boxWidth={this.state.boxWidth}
                                     funcs={this.props.funcs}
                                     doneEditingName={this._doneEditingName}
                                     submitRef={this._submitNameRef}
                                     boxId={this.props.unique_id}/>
                        <div className={dbclass} ref={this.boxRef}>
                            <CloseButton handleClick={this._closeMe}/>
                            <Stage options={{width: gwidth, height:gheight, antialias: true}}>
                                <Sprite width={gwidth} height={gheight} key="bgsprite"
                                        texture={PIXI.Texture.WHITE}
                                        tint={this.props.bgColor} />
                                <Container position={offsetPoint} angle={180} scale={scalePoint}>
                                    {sprite_components.length > 0 && sprite_components}
                                    {(this.props.drawn_components.length > 0) && this.props.drawn_components}
                                </Container>
                            </Stage>

                            <DragHandle position_dict={draghandle_position_dict}
                                        dragStart={this._startResize}
                                        onDrag={this._onResize}
                                        dragEnd={this._stopResize}
                                        direction="both"
                                        iconSize={15}/>
                        </div>
                        {!this.props.am_zoomed && <TypeLabel clickable={true} clickFunc={this._flipMe} the_label={type_label}/>}
                    </div>
                )

            }

        }
    }
}

GraphicsBoxRaw.propTypes = {
    unique_id: PropTypes.string,
    graphics_fixed_width: PropTypes.number,
    graphics_fixed_height: PropTypes.number,
    showGraphics: PropTypes.bool,
    funcs: PropTypes.object,
    app: PropTypes.object
};

const GraphicsBox = withApp(GraphicsBoxRaw);


class TextNode extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.iRef = null;
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !propsAreEqual(nextProps, this.props)
    }

    trimSpaces(string) {
      // noinspection RegExpRedundantEscape
        return string
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
          .replace(/\<.*?\>/g, " ")
    }

    unTrimSpaces(string) {
      return string
        .replace(/\s/g, '\u00A0')
    }

    _handleChange(event) {
        let txt = this.trimSpaces(event.target.value);  // Otherwise we end up with junk
        this.props.funcs.handleTextChange(this.props.unique_id, txt)
    }

    _displayMessage() {
        let idx = getCaretPosition(this.iRef);
        console.log("hello the index is " + String(idx))
    }

    _refHandler(the_ref) {
        this.iRef = the_ref
    }

    _onBlur() {
        currentlyDeleting = false;
        let pos = getCaretPosition(this.iRef);
        this.props.funcs.storeFocus(this.props.unique_id, pos)
    }

    async _runMe() {
        let parent_line = this._myLine();

        let result = await doExecution(parent_line, parent_line.parent, this.props.funcs.getBaseNode());
        if (result == null) {
            return
        }
        if (typeof(result) != "object") {
            let new_node = this.props.funcs.newTextNode(String(result));
            let new_line = this.props.funcs.newLineNode([new_node]);
            let new_databox = this.props.funcs.newDataBox([new_line]);
            this.props.funcs.insertNode(new_databox, parent_line.unique_id, parent_line.node_list.length)
        }
        else {
            let updated_result = _.cloneDeep(result);
            updated_result.unique_id = guid();
            if (data_kinds.includes(updated_result.kind)) {
                updated_result.name = null;
                this.props.funcs.updateIds(updated_result.line_list);
                if (updated_result.closetLine) {
                    this.props.funcs.updateIds([updated_result.closetLine])
                }
            }
            repairCopiedDrawnComponents(updated_result, true);
            this.props.funcs.insertNode(updated_result, parent_line.unique_id, parent_line.node_list.length)
        }
    }

   _handleKeyDown(event) {
        if (["Control", "Shift", "Meta"].includes(event.key)) {
            return
        }
        if (event.key == "F9") {
            event.preventDefault();
            this.props.funcs.toggleCloset(this.props.unique_id);
            return
        }
        if (event.key == "k") {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                let caret_pos = getCaretPosition(this.iRef);
                this.props.funcs.deleteToLineEnd(this.props.unique_id, caret_pos)
            }
            return
        }
        if (event.key == "Enter") {
            event.preventDefault();
            if (event.ctrlKey || event.metaKey) {
                this._runMe();
            }
            else {
                currentlyDeleting = false;
                this.props.funcs.splitLineAtTextPosition(this.props.unique_id, getCaretPosition(this.iRef));
            }
            // this.props.funcs.clearSelected();

            return
        }

        if (event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) {
            return
        }

        if (event.key == "Escape") {
            event.preventDefault();
            this.props.funcs.clearSelected();
        }
        if (event.key == "Backspace") {
            if (this.props.funcs.boxer_selected) {
                event.preventDefault();
                this.props.funcs.deleteBoxerSelection();
                return;
            }
            let caret_pos = getCaretPosition(this.iRef);
            if (caret_pos == 0){
                event.preventDefault();
                this.props.funcs.deletePrecedingBox(this.props.unique_id, !currentlyDeleting);
            }
            else {
                let the_text = window.getSelection().toString();
                if (the_text) {
                    this.props.funcs.copySelected()
                }
                else {
                    let new_node = this.props.funcs.newTextNode(this.props.the_text.charAt(caret_pos - 1));
                    this.props.funcs.addToClipboardStart(new_node, !currentlyDeleting);
                }
            }
            currentlyDeleting = true;
            return
        }
        this.props.funcs.clearSelected();
        if (event.key == "ArrowDown") {
            event.preventDefault();
            let my_line = this._myLine();
            let myDataBox = this._myBox();
            if (my_line.amCloset) {
                let firstTextNodeId = myDataBox.line_list[0].node_list[0].unique_id;
                this.props.funcs.changeNode(firstTextNodeId, "setFocus", 0);
            }
            if (my_line.position < (myDataBox.line_list.length - 1)) {
                let firstTextNodeId = myDataBox.line_list[my_line.position + 1].node_list[0].unique_id;
                this.props.funcs.changeNode(firstTextNodeId, "setFocus", 0);
            }
            return
        }
        if ((event.key == "ArrowLeft") && (getCaretPosition(this.iRef) == 0)){
            event.preventDefault();
            let myNode = this._myNode();
            if (myNode.position == 0) {
                return
            }
            let myLine = this._myLine();
            for (let pos = myNode.position - 1; pos >=0; --pos) {
                let candidate = this.props.funcs.getNode(myLine.node_list[pos].unique_id);
                if (candidate.kind == "text") {
                    this.props.funcs.changeNode(candidate.unique_id, "setFocus", candidate.the_text.length);
                    return
                }
            }
            return
        }
        if ((event.key == "ArrowRight") && (getCaretPosition(this.iRef) == this.props.the_text.length)){
            event.preventDefault();
            let myNode = this._myNode();
            let myLine = this._myLine();
            let nnodes = myLine.node_list.length;
            if (myNode.position == nnodes - 1) {
                return
            }
            for (let pos = myNode.position + 1; pos < nnodes; ++pos) {
                let candidate = this.props.funcs.getNode(myLine.node_list[pos].unique_id);
                if (candidate.kind == "text") {
                    this.props.funcs.changeNode(candidate.unique_id, "setFocus", 0);
                    return
                }
            }
        }

        currentlyDeleting = false;

        if (event.key =="]") {
            event.preventDefault();
            this.props.funcs.positionAfterBox(this._myLine().parent);
            return
        }
        if (event.key == "ArrowUp") {
            event.preventDefault();
            let my_line = this._myLine();
            let myDataBox = this._myBox();
            if (my_line.amCloset || (my_line.position == 0 && !myDataBox.showCloset)) {
                this.props.funcs.focusName()
            }
            else if (my_line.position == 0) {
                let firstTextNodeId = myDataBox.closetLine.node_list[0].unique_id;
                this.props.funcs.changeNode(firstTextNodeId, "setFocus", 0);
            }
            else {
                let firstTextNodeId = myDataBox.line_list[my_line.position - 1].node_list[0].unique_id;
                this.props.funcs.changeNode(firstTextNodeId, "setFocus", 0);
            }
        }

    }

    _myNode() {
        return this.props.funcs.getNode(this.props.unique_id)
    }

    _myLineId() {
        return this.props.funcs.getParentId(this.props.unique_id);
    }

    _myLine() {
        return this.props.funcs.getNode(this._myLineId())
    }

    _myBox() {
        return this.props.funcs.getNode(this._myLine().parent)
    }
    _listen_for_clicks () {
        let self = this;
        $(this.iRef).off("dblclick");
        $(this.iRef).dblclick(function(e) {
             e.preventDefault();
             self._runMe();
            return false
         });
        $(this.iRef).off("mousedown");

        // This mousedown listener is necessary to prevent selection of text on doubleclick
        $(this.iRef).mousedown(function(event) {

            if (event.shiftKey) {
                let sel = selectedAcrossBoxes(self.iRef);
                if (sel) {
                    event.preventDefault();
                    let start_id = sel[0];
                    let end_id = sel[1];
                    self.props.funcs.selectSpan(start_id, end_id);
                }
            }
            else if (event.detail > 1) {
                event.preventDefault();
            }
        });

    }

    componentDidMount () {
        this._setFocusIfRequired();
        this._listen_for_clicks();
    }

    componentDidUpdate () {

        this._setFocusIfRequired();
        this._listen_for_clicks();
    }

    _positionCursor(pos) {
        try {
            let node = this.iRef;
            var textNode = node.firstChild;
            var range = document.createRange();
            range.setStart(textNode, pos);
            range.setEnd(textNode, pos);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
        catch (e) {
            console.log("Got an error positioning the cursor.")
        }
    }

    _setFocusIfRequired () {
        if (this.props.setFocus != null) {
            if (this.iRef) {
                $(this.iRef).focus();
                if (this.props.setFocus != 0) {
                    this._positionCursor(this.props.setFocus)
                }
                this.props.funcs.changeNode(this.props.unique_id, "setFocus", null);
            }
        }
    }

    _handleDoubleClick() {
        console.log("got double click")
    }

    render() {
        let cname;
        if (this.props.selected) {
            cname = "editable mousetrap selected"
        }
        else {
            cname = "editable mousetrap"
        }
        return (
            <React.Fragment>
                <ContentEditable className={cname}
                                 tagName="div"
                                 style={{}}
                                 id={this.props.unique_id}
                                 innerRef={this._refHandler}
                                 disabled={false}
                                 onChange={this._handleChange}
                                 onKeyDown={this._handleKeyDown}
                                 onBlur={this._onBlur}
                                 html={this.unTrimSpaces(this.props.the_text)}
                                 />
             </React.Fragment>

        )
    }
}

TextNode.propTypes = {
    the_text: PropTypes.string,
    setFocus: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.number]),
    unique_id: PropTypes.string,
    selected: PropTypes.bool,
    funcs: PropTypes.object,
};

TextNode.defaultProps = {
    setFocus: null
};

class EditableTag extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return this.props.focusingMe || !propsAreEqual(nextProps, this.props)
    }

    _handleChange(event) {
        this.props.funcs.changeNode(this.props.boxId, "name", event.target.value)
    }

    _handleKeyDown(event) {
        if ((event.key == "Enter") || (event.key == "ArrowDown")) {
            event.preventDefault();
            let myDataBox = this.props.funcs.getNode(this.props.boxId);
            if (myDataBox.kind == "jsbox") {
                this.props.funcs.changeNode(this.props.boxId, "setFocus", 0);
            }
            else if (myDataBox.showCloset) {
                let firstTextNodeId = myDataBox.closetLine.node_list[0].unique_id;
                this.props.funcs.changeNode(firstTextNodeId, "setFocus", 0);
            }
            else {
                let firstTextNodeId = myDataBox.line_list[0].node_list[0].unique_id;
                this.props.funcs.changeNode(firstTextNodeId, "setFocus", 0);
            }

        }
        if (event.key =="]") {
            event.preventDefault();
            this.props.funcs.positionAfterBox(this.props.boxId);
        }
    }

    _onBlur(event) {
        this.props.doneEditingName(()=>{
            if (this.props.the_name == "") {
                this.props.funcs.changeNode(this.props.boxId, "name", null);

            }
        })
    }

    render() {
        let istyle;
        let html;
        if (this.props.the_name == null) {
            html = ""
        }
        else {
            html = this.props.the_name
        }

        istyle = {};

        if (this.props.boxWidth != null && !this.props.focusingMe) {
            istyle.maxWidth = this.props.boxWidth - 20;
        }
        let cname = "bp3-tag data-box-name";
        if (this.props.am_sprite) {
            cname += " sprite-name"
        }
        if (this.props.the_name == null && !this.props.focusingMe) {
            cname += " empty-tag"
        }
        let ceclass;
        if (this.props.focusingMe) {
            ceclass = "bp3-fill"
        }
        else {
            ceclass="bp3-text-overflow-ellipsis bp3-fill";
        }

        return (
            <span className={cname} style={istyle}>
                <span> </span>
                <ContentEditable className={ceclass}
                                 tagName="span"
                                 style={{}}
                                 onBlur={this._onBlur}
                                 innerRef={this.props.submitRef}
                                 disabled={false}
                                 onChange={this._handleChange}
                                 onKeyDown={this._handleKeyDown}
                                 html={html}
                                 />
            </span>
        )
    }
}

EditableTag.propTypes = {
    the_name: PropTypes.string,
    funcs: PropTypes.object,
    boxId: PropTypes.string,
    submitRef: PropTypes.func,
    doneEditingName: PropTypes.func,
    focusingMe: PropTypes.bool,
    selected: PropTypes.bool,
    boxWidth: PropTypes.number,
    am_sprite: PropTypes.bool,
};

EditableTag.defaultProps = {
    am_sprite: false
};

class DataBox extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.nameRef = null;
        this.boxRef = React.createRef();
        this.outerRef = React.createRef();
        this.state = {
            focusingName: false,
            boxWidth: null,
            resizing: false,
            dwidth: 0,
            dheight: 0,
            startingWidth: null,
            startingHeight: null
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !propsAreEqual(nextState, this.state) || !propsAreEqual(nextProps, this.props)
    }

    _handleChange(evt) {
        let the_html = evt.target.value;
        console.log(the_html)
    }

    _closeMe() {
        if (this.props.am_zoomed) {
            this._unzoomeMe()
        }
        else {
            let have_focus = this.boxRef.current.contains(document.activeElement);
            this.props.funcs.changeNode(this.props.unique_id, "closed", true, ()=>{
                if (have_focus) {
                    this.props.funcs.positionAfterBox(this.props.unique_id)
                }
            })
        }
    }

    _openMe() {
        this.props.funcs.changeNode(this.props.unique_id, "closed", false)
    }

    _submitNameRef(the_ref) {
        this.nameRef = the_ref
    }

    _doneEditingName(callback=null) {
        this.setState({focusingName: false}, callback)
    }

    componentDidMount() {
        if (this.boxRef) {
            if (this.state.boxWidth != this.boxRef.current.offsetWidth) {
                 this.setState({ boxWidth: this.boxRef.current.offsetWidth });
            }
        }
        if (this.nameRef){
            $(this.nameRef).focus(this._gotNameFocus)
        }
    }

    _gotNameFocus() {
        this.setState({focusingName: true})
    }

    componentDidUpdate () {
        let self = this;
        if (this.props.focusName) {
            if (this.nameRef) {
                $(this.nameRef).focus();
                this.setState({focusingName: true},()=>{
                    self.props.funcs.changeNode(this.props.unique_id, "focusName", false);
                });
            }
        }
        if (!this.props.closed && this.boxRef) {
            if (this.state.boxWidth != this.boxRef.current.offsetWidth) {
                 this.setState({ boxWidth: this.boxRef.current.offsetWidth });
            }
        }
        if (this.nameRef){
            $(this.nameRef).focus(this._gotNameFocus)
        }
    }

    _zoomMe() {
        this.props.funcs.zoomBox(this.props.unique_id)
    }

    _unzoomeMe() {
        this.props.funcs.unzoomBox(this.props.unique_id)
    }

     getUsableDimensions() {
        return {
            usable_width: this.props.innerWidth - 2 * SIDE_MARGIN,
            usable_height: this.props.innerHeight - BOTTOM_MARGIN - USUAL_TOOLBAR_HEIGHT,
            usable_height_no_bottom: window.innerHeight - USUAL_TOOLBAR_HEIGHT,
            body_height: window.innerHeight - BOTTOM_MARGIN
        };
    }

    _startResize(e, ui, startX, startY) {
        let bounding_rect = this.boxRef.current.getBoundingClientRect();

        let start_width = bounding_rect.width;
        let start_height = bounding_rect.height;
        this.setState({resizing: true, dwidth: 0, dheight: 0,
            startingWidth: start_width, startingHeight: start_height})
    }

    _onResize(e, ui, x, y, dx, dy) {
        this.setState({dwidth: dx, dheight: dy})
    }

    _setSize(new_width, new_height) {
        this.props.funcs.setNodeSize(this.props.unique_id, new_width, new_height)
    }

    _stopResize(e, ui, x, y, dx, dy) {
        let self = this;
        this.setState({resizing: false, dwidth: 0, dheight:0}, ()=>{
            if (dx < resizeTolerance && dy < resizeTolerance) {
                self._setSize(false, false)
            }
            else {
                self._setSize(this.state.startingWidth + dx, this.state.startingHeight + dy)}
            }
        )

    }

    render() {
        let type_label;
        if (this.props.kind == "doitbox") {
            type_label = "Doit"
        }
        else {
            type_label = "Data"
        }
        let dbclass;
        if (this.props.closed) {
            if ((this.props.name != null) || this.state.focusingName) {
                dbclass = "closed-data-box data-box-with-name"
            }
            else {
                dbclass = "closed-data-box"
            }
            if (this.props.kind == "doitbox") {
                dbclass = dbclass + " doit-box";
            }
            if (this.props.selected) {
                dbclass = dbclass + " selected"
            }
            if (this.props.transparent) {
                dbclass += " transparent"
            }
            return (
                <div className="data-box-outer">
                    {(this.props.name || this.state.focusingName) &&
                        <EditableTag the_name={this.props.name}
                                     funcs={this.props.funcs}
                                     boxWidth={75}
                                     submitRef={this._submitNameRef}
                                     doneEditingName={this._doneEditingName}
                                     boxId={this.props.unique_id}/>
                    }
                    <Button type="button"
                            className={dbclass}
                            minimal={false}
                            ref={this.boxRef}
                            onMouseDown={(e)=>{e.preventDefault()}}
                            onClick={this._openMe}
                            icon={null}>
                        <div className="closed-button-inner"></div>
                    </Button>
                    <TypeLabel clickable={this.props.clickable_label}
                               clickFunc={this.props.label_function}
                               the_label={type_label}/>
                </div>
            )
        }

        let the_content = this.props.line_list.map((the_line, index) => {
                return (
                    <DataboxLine key={the_line.unique_id}
                                 unique_id={the_line.unique_id}
                                 amCloset={the_line.amCloset}
                                 funcs={this.props.funcs}
                                 node_list={the_line.node_list}/>
                )
        });

        if (this.props.showCloset) {
            let cline = this.props.closetLine;
            let clinenode = (
                <DataboxLine key={cline.unique_id}
                                 unique_id={cline.unique_id}
                                 amCloset={cline.amCloset}
                                 funcs={this.props.funcs}
                                 node_list={cline.node_list}/>
            );
            the_content.unshift(clinenode)
        }

        dbclass = "data-box data-box-with-name";
        if (this.props.kind == "doitbox") {
            dbclass = dbclass + " doit-box";
        }
        else if (this.props.kind == "sprite") {
            dbclass = dbclass + " sprite-box";
        }
        if (this.props.selected) {
            dbclass = dbclass + " selected";
        }
        if (this.props.transparent) {
            dbclass += " transparent"
        }
        let outer_style;
        let inner_style;
        if (this.props.am_zoomed) {
            let usable_dimensions = this.getUsableDimensions();
            outer_style = {
                width: usable_dimensions.usable_width,
                height: usable_dimensions.usable_height - 10,
                position: "absolute",
                top: USUAL_TOOLBAR_HEIGHT + 10,
                left: SIDE_MARGIN
            };
            inner_style = {
                height: "100%"
            }
        }
        else if (this.state.resizing) {
            outer_style = {
            };
            inner_style = {
                width: this.state.startingWidth + this.state.dwidth,
                height: this.state.startingHeight + this.state.dheight,
                position: "relative"
            }
        }
        else if (this.props.fixed_size) {
            outer_style = {};
            inner_style = {
                width: this.props.fixed_width, height:
                this.props.fixed_height,
                position: "relative"
            }
        }
        else {
            inner_style = {};
            outer_style = {}
        }
        let draghandle_position_dict = {position: "absolute", bottom: 2, right: 1};
        let outer_class = "data-box-outer";
        if (this.props.name == null && !this.state.focusingName) {
            outer_class += " empty-name"
        }
        return (
            <React.Fragment>
                <div className={outer_class} style={outer_style} ref={this.outerRef}>
                    <EditableTag the_name={this.props.name}
                                 focusingMe={this.state.focusingName}
                                 boxWidth={this.state.boxWidth}
                                 funcs={this.props.funcs}
                                 am_sprite={this.props.kind == "sprite"}
                                 doneEditingName={this._doneEditingName}
                                 submitRef={this._submitNameRef}
                                 boxId={this.props.unique_id}/>
                    <div ref={this.boxRef} className={dbclass} style={inner_style} >
                        <CloseButton handleClick={this._closeMe}/>
                        {the_content}
                        <ZoomButton handleClick={this._zoomMe}/>
                        <DragHandle position_dict={draghandle_position_dict}
                            dragStart={this._startResize}
                            onDrag={this._onResize}
                            dragEnd={this._stopResize}
                            direction="both"
                            iconSize={15}/>
                    </div>
                    {!this.props.am_zoomed &&
                        <TypeLabel clickable={this.props.clickable_label}
                                   clickFunc={this.props.label_function}
                                   the_label={type_label}/>
                    }
                </div>
            </React.Fragment>
        )
    }
}

DataBox.propTypes = {
    name: PropTypes.string,
    kind: PropTypes.string,
    closed: PropTypes.bool,
    clickable_label: PropTypes.bool,
    label_function: PropTypes.func,
    unique_id: PropTypes.string,
    line_list: PropTypes.array,
    funcs: PropTypes.object,
    selected: PropTypes.bool,
    am_zoomed: PropTypes.bool,
    fixed_size: PropTypes.bool,
    fixed_width: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.number]),
    fixed_height: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.number])
};

DataBox.defaultProps = {
    kind: "databox",
    closed: false,
    clickable_label: false,
    am_zoomed: false,
    innerWidth: 0,
    innerHeight: 0
};

class JsBox extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.nameRef = null;
        this.boxRef = React.createRef();
        this.state.focusingName = false;
        this.state.boxWidth = null;
        this.cmobject = null;
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !propsAreEqual(nextState, this.state) || !propsAreEqual(nextProps, this.props)
    }

    _handleCodeChange(new_code) {
        this.props.funcs.handleCodeChange(this.props.unique_id, new_code)
    }

    _handleBlur() {
        this.props.funcs.storeFocus(this.props.unique_id, 0);
    }

    _runMe() {
        doExecution(this.props.the_code, this.props.unique_id, this.props.funcs.getBaseNode(), this.props.funcs)
    }

    _closeMe() {
        let have_focus = this.boxRef.current.contains(document.activeElement);
        this.props.funcs.changeNode(this.props.unique_id, "closed", true, ()=>{
            if (have_focus) {
                this.props.funcs.positionAfterBox(this.props.unique_id)
            }
        })
    }

    _openMe() {
        this.props.funcs.changeNode(this.props.unique_id, "closed", false)
    }

    _submitNameRef(the_ref) {
        this.nameRef = the_ref
    }

    _doneEditingName(callback=null) {
        this.setState({focusingName: false}, callback)
    }

    _setCMObject(cmobject) {
        this.cmobject = cmobject
    }

    componentDidMount() {
        if (this.boxRef) {
            if (this.state.boxWidth != this.boxRef.current.offsetWidth) {
                 this.setState({ boxWidth: this.boxRef.current.offsetWidth });
            }
        }
        this._setFocusIfRequired()
    }

    componentDidUpdate () {
        let self = this;
        if (this.props.focusName) {
            if (this.nameRef) {
                $(this.nameRef).focus();
                this.setState({focusingName: true},()=>{
                    self.props.funcs.changeNode(this.props.unique_id, "focusName", false);
                });
            }
        }
        if (!this.props.closed && this.boxRef) {
            if (this.state.boxWidth != this.boxRef.current.offsetWidth) {
                 this.setState({ boxWidth: this.boxRef.current.offsetWidth });
            }
        }
        this._setFocusIfRequired()
    }

    _setFocusIfRequired () {
        if (this.props.setFocus != null) {
            if (this.cmobject) {
                this.cmobject.focus();
                this.props.funcs.changeNode(this.props.unique_id, "setFocus", null);
            }
        }
    }

    _nameMe() {
        this.props.funcs.focusName(this.props.unique_id)
    }

    _upArrow() {
        let head = this.cmobject.getCursor();
        if (head.line == 0) {
            this._nameMe()
        }
        else {
            this.cmobject.setCursor({line:head.line - 1, ch:head.ch})
        }
    }

    _extraKeys() {
        let self = this;
        return {
                'Ctrl-Enter': ()=>self._runMe(),
                'Cmd-Enter': ()=>self._runMe(),
                'Ctrl-N': ()=>self._nameMe(),
                'ArrowUp': ()=>self._upArrow(),
                'Up': ()=>self._upArrow()
            }
    }

    render() {
        let dbclass;
        if (this.props.closed) {
            if ((this.props.name != null) || this.state.focusingName) {
                dbclass = "closed-data-box data-box-with-name doit-box"
            }
            else {
                dbclass = "closed-data-box doit-box"
            }
            if (this.props.selected) {
                dbclass = dbclass + " selected"
            }
            return (
                <div className="data-box-outer">
                    {(this.props.name || this.state.focusingName) &&
                        <EditableTag the_name={this.props.name}
                                     funcs={this.props.funcs}
                                     boxWidth={75}
                                     submitRef={this._submitNameRef}
                                     doneEditingName={this._doneEditingName}
                                     boxId={this.props.unique_id}/>
                    }
                    <Button type="button"
                            className={dbclass}
                            minimal={false}
                            ref={this.boxRef}
                            onMouseDown={(e)=>{e.preventDefault()}}
                            onClick={this._openMe}
                            icon={null}>
                        <div className="closed-button-inner"></div>
                    </Button>
                    <TypeLabel the_label="JSbox" clickable_label={false}/>
                </div>
            )
        }

        if ((this.props.name != null) || this.state.focusingName) {
            dbclass = "data-box js-box data-box-with-name"
        }
        else {
            dbclass = "data-box js-box"
        }
        if (this.props.selected) {
            dbclass = dbclass + " selected"
        }
        let outer_style;
        let inner_style;
        if (this.props.am_zoomed) {
            let usable_dimensions = this.getUsableDimensions();
            outer_style = {
                width: usable_dimensions.usable_width,
                height: usable_dimensions.usable_height - 10,
                position: "absolute",
                top: USUAL_TOOLBAR_HEIGHT + 10,
                left: SIDE_MARGIN
            };
            inner_style = {
                height: "100%"
            }
        }
        else {
            inner_style = {};
            outer_style = {}
        }

        return (
            <React.Fragment>
                <div className="data-box-outer" style={outer_style}>
                    <EditableTag the_name={this.props.name}
                                 focusingMe={this.state.focusingName}
                                 boxWidth={this.state.boxWidth}
                                 funcs={this.props.funcs}
                                 doneEditingName={this._doneEditingName}
                                 submitRef={this._submitNameRef}
                                 boxId={this.props.unique_id}/>
                        <div ref={this.boxRef} className={dbclass} style={inner_style} >
                            <CloseButton handleClick={this._closeMe}/>
                            <ReactCodemirror code_content={this.props.the_code}
                                             mode="javascript"
                                             handleChange={this._handleCodeChange}
                                             handleBlur={this._handleBlur}
                                             saveMe={null}
                                             setCMObject={this._setCMObject}
                                             readOnly={false}
                                             extraKeys={this._extraKeys()}
                                             first_line_number={null}
                            />
                        </div>
                        <TypeLabel the_label="JSbox" clickable_label={false}/>
                </div>
            </React.Fragment>
        )
    }
}

JsBox.propTypes = {
    name: PropTypes.string,
    the_code: PropTypes.string,
    closed: PropTypes.bool,
    unique_id: PropTypes.string,
    funcs: PropTypes.object,
    selected: PropTypes.bool,
};

JsBox.defaultProps = {
    closed: false,
    am_zoomed: false,
    innerWidth: 0,
    innerHeight: 0
};

class CloseButton extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return false
    }

    render () {
        return (
            <Button type="button"
                    className="close-button"
                      minimal={true}
                      small={true}
                      intent="none"
                      onMouseDown={(e)=>{e.preventDefault()}}
                      onClick={this.props.handleClick}
                      icon="small-cross">
            </Button>
        )
    }
}

CloseButton.propTypes = {
    handlClick: PropTypes.func
};

class TypeLabel extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return false
    }
    
    _handleClick() {
        this.props.clickFunc();
    }

    render() {
        if (this.props.clickable) {
            return (
                <button onClick={this._handleClick} className="type-label clickable">{this.props.the_label}</button>
            )
        }
        return (
            <span className="type-label">{this.props.the_label}</span>
        )
    }
}

TypeLabel.propTypes = {
    the_label: PropTypes.string,
    clickable: PropTypes.bool,
    clickFunc: PropTypes.func
};

TypeLabel.defaultProps = {
    clickable: false
};


class ZoomButton extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return false
    }

    render () {
        return (
            <Button type="button"
                    className="zoom-button"
                    minimal={true}
                    small={true}
                    intent="none"
                    onMouseDown={(e)=>{e.preventDefault()}}
                    onClick={this.props.handleClick}
                    icon="fullscreen">
            </Button>
        )
    }
}

ZoomButton.propTypes = {
    handlClick: PropTypes.func
};

class DataboxLine extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    // If I have shouldComponentUpdate here I run into focus problems
    // When a new box is created it doesn't clear the setFocus in the text node

    // shouldComponentUpdate(nextProps, nextState) {
    //     return !propsAreEqual(nextProps, this.props)
    // }

    _handleSelection(selectedKeys) {
        this.props.funcs.setSelected(selectedKeys);
    }

    render() {
        let the_content = this.props.node_list.map((the_node, index) => {
            if (the_node.kind == "text") {
                return (
                    <TextNode key={the_node.unique_id}
                               selected={the_node.selected}
                               className="editable"
                              funcs={this.props.funcs}
                              unique_id={the_node.unique_id}
                              setFocus={the_node.setFocus}
                              setEndSelection={the_node.setEndSelection}
                              the_text={the_node.the_text}/>
                )
            }
            else if (the_node.kind == "jsbox") {
                return (
                    <JsBox key={the_node.unique_id}
                           selected={the_node.selected}
                           name={the_node.name}
                           className="data-box-outer"
                           funcs={this.props.funcs}
                           unique_id={the_node.unique_id}
                           setFocus={the_node.setFocus}
                           closed={the_node.closed}
                           focusName={the_node.focusName}
                           the_code={the_node.the_code}/>
                )
            }

            else if (the_node.kind == "sprite") {
                this.props.funcs.setTurtleRef(the_node.unique_id, React.createRef());
                return (
                    <SpriteBox {...the_node}
                                key={the_node.unique_id}
                                ref={window.turtle_box_refs[the_node.unique_id]}
                                funcs={this.props.funcs}
                                showGraphics={this.props.showGraphics}/>
                )
            }
            else if (the_node.kind == "graphics" || the_node.kind == "color") {
                return (
                    <GraphicsBox {...the_node}
                                 key={the_node.unique_id}
                                 funcs={this.props.funcs}
                                 ref={window.turtle_box_refs[the_node.unique_id]}/>
                )
            }

            else  {
                return (
                    <DataBox key={the_node.unique_id}
                             kind={the_node.kind}
                             showCloset={the_node.showCloset}
                             closetLine={the_node.closetLine}
                             selected={the_node.selected}
                             className="data-box-outer"
                             fixed_size={the_node.fixed_size}
                             fixed_width={the_node.fixed_width}
                             fixed_height={the_node.fixed_height}
                             name={the_node.name}
                             funcs={this.props.funcs}
                             unique_id={the_node.unique_id}
                             closed={the_node.closed}
                             transparent={the_node.transparent}
                             am_zoomed={the_node.am_zoomed}
                             focusName={the_node.focusName}
                             clickable_label={false}
                             line_list={the_node.line_list}/>
                )
            }
        });
        let cname;
        if (this.props.amCloset) {
            cname = "data-line am-closet"
        }
        else {
            cname = "data-line"
        }
        return (
            <div className={cname}>
                    {the_content}
            </div>
        )
    }
}

DataboxLine.propTypes = {
    unique_id: PropTypes.string,
    node_list: PropTypes.array,
    funcs: PropTypes.object,
};

// This isn't currently used. it creates a turtle sprite using an image
class TurtleTurtle extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
    }

    render () {
        const base_scale = .125;
        return (<Sprite texture={loader.resources.turtle.texture}
                        x={this.props.x}
                        y={this.props.y}
                        scale={base_scale * this.props.sf}
                        angle={this.props.heading}
                        anchor={[0.5, 0.5]}/>
        )
    }
}