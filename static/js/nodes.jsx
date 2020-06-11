import React from "react";
import ContentEditable from "react-contenteditable";
import PropTypes from "prop-types";

import {doBinding, getCaretPosition, guid, selectedAcrossBoxes, propsAreEqual, _convertColorArg, _svgConvertColorArg} from "./utilities.js";
import {ReactCodemirror} from "./react-codemirror.js";

import {doExecution, repairCopiedDrawnComponents, _mouseClickOnSprite, _mouseClickOnGraphics} from "./eval_space.js";

import {SvgRect} from "./svg_shapes.js"
// noinspection ES6CheckImport
import { Sprite, Stage, withApp, Container, Text} from "react-pixi-fiber";
import * as PIXI from "pixi.js";

import {data_kinds} from "./shared_consts.js";

import {withName, NamedBox_propTypes, NamedBox_defaultProps} from "./named_box.js";
import {Button} from "@blueprintjs/core";

export {DataBox, PortBox, JsBox, loader}

let currentlyDeleting = false;

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


class SpriteBox extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.spriteRef = React.createRef();
    }

    _listen_for_clicks () {
        let self = this;
        if (this.spriteRef && this.spriteRef.current) {
            this.spriteRef.current.removeListener("pointerdown", this._onMouseDown);
            this.spriteRef.current.addListener("pointerdown", this._onMouseDown);
        }
    }

    _onMouseDown(event) {
        _mouseClickOnSprite(this.props.unique_id, this.props.funcs.getBaseNode())
    }

    componentDidMount () {
        this._listen_for_clicks();
    }

    componentDidUpdate () {
        this._listen_for_clicks();
    }

    // shouldComponentUpdate(nextProps, nextState, nextContext) {
    //     return !propsAreEqual(nextProps, this.props, ["funcs"])
    // }

    _myNode() {
        return this.props.funcs.getNode(this.props.unique_id)
    }


    _getMousePosition() {
        return this.props.getMousePosition();
    }


    _isColor(aboxorstring) {
        return typeof(aboxorstring) == "object" && aboxorstring.hasOwnProperty("kind") &&  aboxorstring.kind == "color"
    }


    render() {
        let mnode = this._myNode()
        let sparams = mnode.getAllParams();
        let in_svg = mnode.useSvg();
        let the_sprite;
        if (!in_svg) {
            the_sprite = (
                <Sprite x={sparams["xPosition"]}
                        y={sparams["yPosition"]}
                        interactive={true}
                        ref={this.spriteRef}
                        scale={sparams["spriteSize"]}
                        angle={-1 * sparams["heading"]}
                        anchor={[0.5, 0.5]}>
                    {sparams.shape_components}
                </Sprite>
            );
        }
        else {
            let trans_string = `translate(${sparams["xPosition"]}, ${sparams["yPosition"]}) 
            rotate(${-1 * sparams["heading"]}) 
            scale(${sparams["spriteSize"]}, ${sparams["spriteSize"]})`
            the_sprite = (
                <g transform={trans_string} style={{overflow: "visible"}}>
                    {sparams.shape_components}
                </g>
                // <circle cx={sparams["xPosition"]} cy={sparams["yPosition"]} strokeWidth={1} r={5} stroke="green" fill="yellow"/>
            )
        }

        if (this.props.showGraphics) {
            if (sparams.shown) {
                return the_sprite
            }
            return null
        }
        else {
            return (
                <DataBox {...this.props}/>
            )
        }

    }
}


SpriteBox.propTypes = {
    in_svg: PropTypes.bool
}

SpriteBox.defaultProps = {
    in_svg: false
}

class GraphicsBoxRaw extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.graphicsRef = React.createRef();
        this.do_wrap = true;
        this.last_x = 0;
        this.last_y = 0;
    }

    _listen_for_clicks () {
        let self = this;
        if (this.graphicsRef && this.graphicsRef.current) {
            if (this.graphicsRef && this.graphicsRef.current) {
                this.graphicsRef.current.removeListener("pointerdown", this._onMouseDown);
                this.graphicsRef.current.addListener("pointerdown", this._onMouseDown);
                this.graphicsRef.current.removeListener("pointermove", this._onMouseMove);
                this.graphicsRef.current.addListener("pointermove", this._onMouseMove);
            }
        }
    }

    _onMouseMove(event) {
        if (this.graphicsRef && this.graphicsRef.current) {
            let newPosition = event.data.getLocalPosition(this.graphicsRef.current.parent);
            this.last_x = newPosition.x;
            this.last_y = newPosition.y;
        }

    }

    _onMouseDown(event) {
        _mouseClickOnGraphics(this.props.unique_id, this.props.funcs.getBaseNode())
    }

    componentDidMount () {
        this._listen_for_clicks();
    }

    componentDidUpdate () {
        this._listen_for_clicks();
    }

    _addComponent(new_comp, callback=null) {
        this.props.funcs.addGraphicsComponent(this.props.unique_id, new_comp, callback);
        //this.setState({drawnComponents: [...this.state.drawnComponents, new_comp]})
    }

    _getMousePosition() {
        return {x: this.last_x, y: this.last_y}
    }

    _snapTexture() {
        return this.props.app.renderer.generateTexture(this.props.app.stage)
    }

    _getColorBoxColor() {
        let color_string = this.props.funcs.getNode(this.props.funcs.getln(this.props.unique_id, 0, 0)).the_text
        return _convertColorArg(color_string)
    }

    render() {
        if (this.props.closed || !this.props.showGraphics) {
            return (
                <DataBoxRaw {...this.props} in_svg={false} addComponent={this._addComponent}
                                         do_wrap={this.do_wrap}
                                         setWrap={this._setWrap}
                                         setBgColor={this._setBgColor}
                                         clearComponents={this._clearComponents}/>
            )
        }
        else {
            let gwidth = this.props.graphics_fixed_width;
            let gheight = this.props.graphics_fixed_height;

            if (this.props.kind == "color") {
                let converted_bgcolor = this._getColorBoxColor();
                return (
                    <Stage options={{width: gwidth, height: gheight, antialias: true}}>
                        <Sprite width={gwidth} height={gheight} key="bgsprite"
                                texture={PIXI.Texture.WHITE}
                                tint={converted_bgcolor} />
                    </Stage>
                );
            }
            else {
                let sprite_components = [];
                let acindex = 0;
                let temp_ll = [...this.props.line_list];
                if (this.props.closetLine) {
                    temp_ll.push(this.props.closetLine)
                }
                for (let lin_id of temp_ll) {
                    for (let nd_id of this.props.funcs.getNode(lin_id).node_list) {
                        let nd = this.props.funcs.getNode(nd_id)
                        if (nd.kind == "sprite") {
                            let new_comp = (
                                <SpriteBox {...nd}
                                           in_svg={false}
                                           key={nd.unique_id}
                                           app={this.props.app}
                                           funcs={this.props.funcs}
                                           graphics_fixed_width={gwidth}
                                           graphics_fixed_height={gheight}
                                           do_wrap={this.do_wrap}
                                           setWrap={this._setWrap}
                                           getMousePosition={this._getMousePosition}
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
                let bgcolor = _convertColorArg(this.props.bgColor)
                let offsetPoint = new PIXI.Point(gwidth / 2, gheight / 2);
                let scalePoint = [-1, 1];  // This reflects over y axis
                return (
                    <Stage options={{width: gwidth, height:gheight, antialias: true}}>
                        <Container position={offsetPoint} angle={180} scale={scalePoint}>
                            <Sprite width={gwidth} height={gheight} key="bgsprite"
                                    texture={PIXI.Texture.WHITE}
                                    position={{x: -gwidth / 2, y: -gheight / 2}}
                                    ref={this.graphicsRef}
                                    interactive={true}
                                    tint={bgcolor} />
                            {sprite_components.length > 0 && sprite_components}
                            {(this.props.drawn_components.length > 0) && this.props.drawn_components}
                        </Container>
                    </Stage>
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

const GraphicsBox = withApp(withName(GraphicsBoxRaw));

class SvgGraphicsBoxRaw extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.graphicsRef = React.createRef();
        this.last_x = 0;
        this.last_y = 0;
    }


    _getMousePosition() {
        return {x: this.last_x, y: this.last_y}
    }


    render() {
        if (this.props.closed || !this.props.showGraphics) {
            return (
                <DataBoxRaw {...this.props}
                            addComponent={this._addComponent}
                            in_svg={true}
                            do_wrap={this.do_wrap}
                            setWrap={this._setWrap}
                            setBgColor={this._setBgColor}
                            clearComponents={this._clearComponents}/>
            )
        }
        else {
            let gwidth = this.props.graphics_fixed_width;
            let gheight = this.props.graphics_fixed_height;
            let sprite_components = [];
            let acindex = 0;
            let temp_ll = [...this.props.line_list];
            if (this.props.closetLine) {
                temp_ll.push(this.props.closetLine)
            }
            for (let lin_id of temp_ll) {
                for (let nd_id of this.props.funcs.getNode(lin_id).node_list) {
                    let nd = this.props.funcs.getNode(nd_id)
                    if (nd.kind == "sprite") {
                        let new_comp = (
                            <SpriteBox {...nd}
                                       in_svg={true}
                                       key={nd.unique_id}
                                       app={this.props.app}
                                       funcs={this.props.funcs}
                                       graphics_fixed_width={gwidth}
                                       graphics_fixed_height={gheight}
                                       do_wrap={this.do_wrap}
                                       setWrap={this._setWrap}
                                       getMousePosition={this._getMousePosition}
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
            let bgcolor = _svgConvertColorArg(this.props.bgColor)
            let trans_string = `scale(1, -1) translate( ${gwidth / 2}, ${gheight / 2} )`
            return (
                <React.Fragment>
                    <svg key={guid()} width={gwidth} height={gheight} transform={trans_string} style={{overflow: "visible"}}>
                        <SvgRect width={gwidth} height={gheight} key="bgrect"
                                 x={-gwidth / 2}
                                 y= {-gheight / 2}
                                 fill={bgcolor} />
                        {sprite_components.length > 0 && sprite_components}
                        {(this.props.drawn_components.length > 0) && this.props.drawn_components}
                    </svg>
                </React.Fragment>
            )
        }
    }
}

var SvgGraphicsBox = withName(SvgGraphicsBoxRaw)

SvgGraphicsBox.propTypes = {
    unique_id: PropTypes.string,
    graphics_fixed_width: PropTypes.number,
    graphics_fixed_height: PropTypes.number,
    showGraphics: PropTypes.bool,
    funcs: PropTypes.object,
    app: PropTypes.object
};



class TextNode extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.iRef = null;
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (window.freeze && window._running > 0){
                return false
            }
        return !propsAreEqual(nextProps, this.props, ["funcs"]) || this.props.setFocus
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
        this.props.funcs.storeFocus(this.props.unique_id, pos, this.props.portal_root)
    }

    async _runMe() {
        let parent_line = this._myLine();

        let result = await doExecution(parent_line, parent_line.parent, this.props.funcs.getNodeDict());
        if (result == null) {
            return
        }
        let new_node_id, new_line_id, new_databox_id, new_dict;
        if (typeof(result) != "object") {
            let new_node, new_line, new_databox, new_dict;
            [new_node_id, new_dict] = this.props.funcs.newTextNode(String(result), this.props.funcs.getNodeDict());
            [new_line_id, new_dict] = this.props.funcs.newLineNode([new_node_id], new_dict);
            [new_databox_id, new_dict] = this.props.funcs.newDataBox([new_line_id], false, new_dict);
            this.props.funcs.insertNode(new_databox_id, parent_line.unique_id, parent_line.node_list.length, null, new_dict)
        }
        else {
            let vid, target_dict;
            [vid, target_dict] = this.props.funcs.cloneNode(result.vid, window.virtualNodeDict,
                this.props.funcs.getNodeDict(), true)

            if (data_kinds.includes(target_dict[vid].kind)) {
                target_dict[vid].name = null;
            }
            // repairCopiedDrawnComponents(target_dict[vid], true, target_dict);
            this.props.funcs.insertNode(vid, parent_line.unique_id, parent_line.node_list.length, null, target_dict)
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
        if (event.key == "|") {
            event.preventDefault();
            if (this.props.am_in_portal) {
                this.props.funcs.focusName(null, this.props.am_in_portal)
            }
            else {
                this.props.funcs.focusName(this.props.unique_id, null, this.props.portal_root)
            }
        }
        if (event.key == "Enter") {
            event.preventDefault();
            if (event.ctrlKey || event.metaKey) {
                this._runMe();
            }
            else {
                currentlyDeleting = false;
                this.props.funcs.splitLineAtTextPosition(this.props.unique_id, getCaretPosition(this.iRef), this.props.portal_root);
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
                this.props.funcs.deletePrecedingBox(this.props.unique_id, !currentlyDeleting, this.props.portal_root);
            }
            else {
                let the_text = window.getSelection().toString();
                if (the_text) {
                    this.props.funcs.copySelected()
                }
                else {
                    this.props.funcs.addTextToClipboardStart(this.props.the_text.charAt(caret_pos - 1), !currentlyDeleting);
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
                let firstTextNodeId =
                    this.props.funcs.getNode(this.props.funcs.getNode(myDataBox.line_list[0]).node_list[0]).unique_id;
                this.props.funcs.setFocus(firstTextNodeId, this.props.portal_root, 0);
            }
            if (my_line.position < (myDataBox.line_list.length - 1)) {
                let firstTextNodeId = this.props.funcs.getNode(this.props.funcs.getNode(myDataBox.line_list[my_line.position + 1]).node_list[0]).unique_id;
                this.props.funcs.setFocus(firstTextNodeId, this.props.portal_root, 0);
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
                let candidate = this.props.funcs.getNode(this.props.funcs.getNode(myLine.node_list[pos]).unique_id);
                if (candidate.kind == "text") {
                    this.props.funcs.changeNode(candidate.unique_id, "setFocus",
                        [this.props.portal_root, candidate.the_text.length]);
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
                let candidate = this.props.funcs.getNode(this.props.funcs.getNode(myLine.node_list[pos]).unique_id);
                if (candidate.kind == "text") {
                    this.props.funcs.setFocus(candidate.unique_id, this.props.portal_root, 0);
                    return
                }
            }
        }

        currentlyDeleting = false;

        if (event.key =="]") {
            event.preventDefault();
            if (this.props.am_in_portal) {
                this.props.funcs.positionAfterBox(this.props.portal_root, this.props.portal_parent);
            }
            else {
                this.props.funcs.positionAfterBox(this._myLine().parent, this.props.portal_root);
            }
            return
        }
        if (event.key == "ArrowUp") {
            event.preventDefault();
            let my_line = this._myLine();
            let myDataBox = this._myBox();
            if (my_line.amCloset || (my_line.position == 0 && !myDataBox.showCloset)) {
                if (this.props.am_in_portal) {
                    this.props.funcs.focusName(null, this.props.am_in_portal, this.props.portal_parent)
                }
                else {
                    this.props.funcs.focusName(null, null, this.props.portal_root)
                }
            }
            else if (my_line.position == 0) {
                let firstTextNodeId =
                    this.props.funcs.getNode(this.props.funcs.getNode(myDataBox.closetLine).node_list[0]).unique_id;
                this.props.funcs.setFocus(firstTextNodeId, this.props.portal_root, 0);
            }
            else {
                let firstTextNodeId =
                    this.props.funcs.getNode(this.props.funcs.getNode(myDataBox.line_list[my_line.position - 1]).node_list[0]).unique_id;
                this.props.funcs.setFocus(firstTextNodeId, this.props.portal_root, 0);
            }
        }

    }

    _myNode() {
        return this.props.funcs.getNode(this.props.unique_id)
    }

    _myLineId() {
        return this._myNode().parent;
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
        if (this.props.setFocus != null && this.props.setFocus[0] == this.props.portal_root) {
            if (this.iRef) {
                $(this.iRef).focus();
                if (this.props.setFocus[1] != 0) {
                    this._positionCursor(this.props.setFocus[1])
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
                                 onFocus={this._onBlur}
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
        PropTypes.array]),
    unique_id: PropTypes.string,
    selected: PropTypes.bool,
    funcs: PropTypes.object,
    am_in_portal: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.string])
};

TextNode.defaultProps = {
    setFocus: false,
    am_in_portal: false
};

class PortBoxRaw extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
    }

    render() {
        let tnode;
        let inner_content;
        if (this.props.target == null) {
            inner_content = <div>You can now target this port</div>;
        }
        else {
            tnode = this.props.funcs.getNode(this.props.target);
            if (!tnode) {
                inner_content = <Button onClick={()=>{this.props.funcs.retargetPort(this.props.unique_id)}}>Target is missing</Button>;
            }
            else {
                tnode.closed = this.props.closed;
                if (tnode.kind == "databox" || tnode.kind == "doitbox" || tnode.closed) {
                    inner_content = <DataBox portal_root={this.props.unique_id}
                                              {...tnode} am_in_portal={this.props.unique_id}
                                              portal_parent={this.props.portal_root}
                                              portal_is_zoomed={this.props.am_zoomed}
                                              clickable_label={false} funcs={this.props.funcs}
                    />
                }
                else if (tnode.kind == "sprite") {
                    inner_content = <SpriteBox portal_root={this.props.unique_id}
                                              am_in_portal={this.props.unique_id}
                                              portal_parent={this.props.portal_root}
                                              portal_is_zoomed={this.props.am_zoomed}
                                              {...tnode} funcs={this.props.funcs}/>
                }
                else if (tnode.kind == "graphics" || tnode.kind == "color") {
                    inner_content = <GraphicsBox portal_root={this.props.unique_id}
                                              portal_parent={this.props.portal_root}
                                              am_in_portal={this.props.unique_id}
                                              portal_is_zoomed={this.props.am_zoomed}
                                              {...tnode} funcs={this.props.funcs}/>
                }
                else if (tnode.kind == "svggraphics") {
                    inner_content = <SvgGraphicsBox portal_root={this.props.unique_id}
                                              portal_parent={this.props.portal_root}
                                              am_in_portal={this.props.unique_id}
                                              portal_is_zoomed={this.props.am_zoomed}
                                              {...tnode} funcs={this.props.funcs}/>
                }
                else if (tnode.kind == "htmlbox") {
                    inner_content = <HtmlBox portal_root={this.props.unique_id}
                                              portal_parent={this.props.portal_root}
                                              am_in_portal={this.props.unique_id}
                                              portal_is_zoomed={this.props.am_zoomed}
                                              clickable_label={false}
                                              {...tnode} funcs={this.props.funcs}/>
                }
            }
        }

        return (
            <React.Fragment>
                {inner_content}
            </React.Fragment>
        )
    }
}

var PortBox = withName(PortBoxRaw)

class DataBoxRaw extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    // shouldComponentUpdate(nextProps, nextState) {
    //     if (window.freeze && window._running > 0){
    //             return false
    //         }
    //     return !propsAreEqual(nextState, this.state) || !propsAreEqual(nextProps, this.props) || this.props.kind == "port"
    //         || this.props.funcs.containsPort(this.props.unique_id)
    // }

    render() {
        let dbclass;
        if (this.props.closed) {
            return null;
        }

        let the_content = this.props.line_list.map((the_line_id, index) => {
            let the_line = this.props.funcs.getNodeDict()[the_line_id];
            return (
                <DataboxLine key={the_line.unique_id}
                             am_in_portal={this.props.am_in_portal}
                             portal_parent={this.props.portal_parent}
                             portal_root={this.props.portal_root}
                             unique_id={the_line.unique_id}
                             amCloset={the_line.amCloset}
                             funcs={this.props.funcs}
                             do_wrap={this.props.do_wrap}
                             setWrap={this.props.setWrap}
                             setBgColor={this.props.setBgColor}
                             clearComponents={this.props.clearComponents}
                             showGraphics={this.props.showGraphics}
                             node_list={the_line.node_list}/>
            )
        });

        if (this.props.showCloset) {
            let cline = this.props.funcs.getNodeDict()[this.props.closetLine];
            let clinenode = (
                <DataboxLine key={cline.unique_id}
                             am_in_portal={this.props.am_in_portal}
                             portal_parent={this.props.portal_parent}
                             portal_root={this.props.portal_root}
                             unique_id={cline.unique_id}
                             amCloset={cline.amCloset}
                             funcs={this.props.funcs}
                             do_wrap={this.props.do_wrap}
                             setWrap={this.props.setWrap}
                             setBgColor={this.props.setBgColor}
                             clearComponents={this.props.clearComponents}
                             showGraphics={this.props.showGraphics}
                             node_list={cline.node_list}/>
            );
            the_content.unshift(clinenode)
        }
        //return <NamedBox {...this.props} type_label={type_label} wrapped_content={the_content}/>
        return (
            <React.Fragment>
                {the_content}
        </React.Fragment>)
    }
}

var DataBox = withName(DataBoxRaw)

DataBox.propTypes = Object.assign({
    am_in_portal: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.string]),
    portal_parent: PropTypes.string,
    portal_root: PropTypes.string,
    unique_id: PropTypes.string,
    amCloset: PropTypes.bool,
    funcs: PropTypes.object,
    do_wrap: PropTypes.bool,
    setWrap: PropTypes.func,
    setBgColor: PropTypes.func,
    clearComponents: PropTypes.func,
    showGraphics: PropTypes.bool
}, NamedBox_propTypes);

DataBox.defaultProps = Object.assign(NamedBox_defaultProps,{
    do_wrap: null,
    setWrap: null,
    setBgColor: null,
     clearComponents: null,
    showGraphics: false
});

class HtmlBoxRaw extends React.Component {
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


    _handleCodeChange(new_code) {
        this.props.funcs.handleCodeChange(this.props.unique_id, new_code)
    }

    _handleBlur() {
        this.props.funcs.storeFocus(this.props.unique_id, 0, this.props.portal_root);
    }


    _setCMObject(cmobject) {
        this.cmobject = cmobject
    }

    componentDidMount() {
        this._setFocusIfRequired()
    }

    componentDidUpdate () {
        this._setFocusIfRequired()
    }

    _setFocusIfRequired () {
        if (this.props.setFocus != null && this.props.setFocus[0] == this.props.portal_root) {
            if (this.cmobject) {
                this.cmobject.focus();
                this.props.funcs.changeNode(this.props.unique_id, "setFocus", null);
            }
        }
    }

    _upArrow() {
        // let head = this.cmobject.getCursor();
        // if (head.line == 0) {
        //     this._nameMe()
        // }
        // else {
        //     this.cmobject.setCursor({line:head.line - 1, ch:head.ch})
        // }
    }

    _extraKeys() {
        let self = this;
        return {
                'Ctrl-N': ()=>self._nameMe(),
                'ArrowUp': ()=>self._upArrow(),
                'Up': ()=>self._upArrow()
            }
    }

    render() {
        let dbclass;
        if (this.props.closed) {
            return null
        }
        if (this.props.showConverted) {
            let converted_dict = {__html: this.props.the_code};
            return (
                <div dangerouslySetInnerHTML={converted_dict}></div>
            )
        }
        else {
            return (
                <React.Fragment>
                    <ReactCodemirror code_content={this.props.the_code}
                                     mode={{name: "xml", htmlMode: true}}
                                     handleChange={this._handleCodeChange}
                                     handleBlur={this._handleBlur}
                                     saveMe={null}
                                     setCMObject={this._setCMObject}
                                     readOnly={false}
                                     extraKeys={this._extraKeys()}
                                     first_line_number={null}
                    />
                </React.Fragment>
            )
        }

    }
}

var HtmlBox = withName(HtmlBoxRaw)

HtmlBox.propTypes = {
    name: PropTypes.string,
    the_code: PropTypes.string,
    showConverted: PropTypes.bool,
    closed: PropTypes.bool,
    unique_id: PropTypes.string,
    funcs: PropTypes.object,
    selected: PropTypes.bool,
};

HtmlBox.defaultProps = {
    closed: false,
    am_zoomed: false,
    innerWidth: 0,
    innerHeight: 0
};

class JsBoxRaw extends React.Component {
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


    _handleCodeChange(new_code) {
        this.props.funcs.handleCodeChange(this.props.unique_id, new_code)
    }

    _handleBlur() {
        this.props.funcs.storeFocus(this.props.unique_id, 0, this.props.portal_root);
    }

    _runMe() {
        doExecution(this.props.the_code, this.props.unique_id, this.props.funcs.getBaseNode(), this.props.funcs)
    }

    _setCMObject(cmobject) {
        this.cmobject = cmobject
    }

    componentDidMount() {
        this._setFocusIfRequired()
    }

    componentDidUpdate () {
        this._setFocusIfRequired()
    }

    _setFocusIfRequired () {
        if (this.props.setFocus != null && this.props.setFocus[0] == this.props.portal_root) {
            if (this.cmobject) {
                this.cmobject.focus();
                this.props.funcs.changeNode(this.props.unique_id, "setFocus", null);
            }
        }
    }

    _upArrow() {
        // let head = this.cmobject.getCursor();
        // if (head.line == 0) {
        //     this._nameMe()
        // }
        // else {
        //     this.cmobject.setCursor({line:head.line - 1, ch:head.ch})
        // }
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
            return null
        }

        return (
            <React.Fragment>
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
            </React.Fragment>
        )
    }
}

var JsBox = withName(JsBoxRaw)

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

class DataboxLine extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
    }

    // If I have shouldComponentUpdate here I run into focus problems
    // When a new box is created it doesn't clear the setFocus in the text node

    // shouldComponentUpdate(nextProps, nextState) {
    //     if (window.freeze && window._running > 0){
    //             return false
    //         }
    //     return true
        // let pequal = propsAreEqual(nextProps, this.props);
        // let sequal = propsAreEqual(nextState, this.state);
        // return !pequal || !sequal
    // }

    _handleSelection(selectedKeys) {
        this.props.funcs.setSelected(selectedKeys);
    }

    render() {
        let the_content = this.props.node_list.map((the_node_id, index) => {
            let the_node = this.props.funcs.getNode(the_node_id);
            if (the_node.kind == "text") {
                return (
                    <TextNode key={the_node.unique_id}
                              am_in_portal={this.props.am_in_portal}
                              portal_parent={this.props.portal_parent}
                              portal_root={this.props.portal_root}
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
                    <JsBox portal_root={this.props.portal_root}
                           {...the_node}
                           key={the_node.unique_id}
                           funcs={this.props.funcs}/>
                )
            }
            else if (the_node.kind == "htmlbox") {
                return (
                    <HtmlBox portal_root={this.props.portal_root}
                             {...the_node}
                             key={the_node.unique_id}
                             funcs={this.props.funcs}/>
                )
            }


            else if (the_node.kind == "sprite") {
                return (
                    <SpriteBox portal_root={this.props.portal_root}
                               {...the_node}
                               key={the_node.unique_id}
                               funcs={this.props.funcs}
                               do_wrap={this.props.do_wrap}
                               setWrap={this.props.setWrap}
                               setBgColor={this.props.setBgColor}
                               clearComponents={this.props.clearComponents}
                               showGraphics={this.props.showGraphics}/>
                )
            }
            else if (the_node.kind == "graphics" || the_node.kind == "color") {
                return (
                    <GraphicsBox portal_root={this.props.portal_root}
                                 {...the_node}
                                 key={the_node.unique_id}
                                 funcs={this.props.funcs}/>
                )
            }
            else if (the_node.kind == "svggraphics") {
                return (
                    <SvgGraphicsBox portal_root={this.props.portal_root}
                                    {...the_node}
                                    key={the_node.unique_id}
                                    funcs={this.props.funcs}/>
                )
            }
            else if (the_node.kind == "port") {
                let type_label;
                if (!the_node.target) {
                    type_label = "Data"
                }
                else {
                    let target_node = this.props.funcs.getNodeDict()[the_node.target];
                    if (data_kinds.includes(target_node.kind)) {
                        type_label = "Data"
                    }
                    else if (target_node.kind == "jsbox") {
                        type_label = "JSBox"
                    }
                    else {
                        type_label = "Doit"
                    }
                }
                return (<PortBox portal_root={this.props.portal_root}
                                 {...the_node}
                                 key={the_node.unique_id}
                                  type_label={type_label}
                                 funcs={this.props.funcs}/>
                )
            }
            else  {
                return (
                    <DataBox portal_root={this.props.portal_root}
                             key={the_node.unique_id}
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
    do_wrap: PropTypes.bool,
    setWrap: PropTypes.func,
    setBgColor: PropTypes.func,
    clearComponents: PropTypes.func,
    showGraphics: PropTypes.bool
};

DataboxLine.defaultProps = {
    do_wrap: null,
    setWrap: null,
    setBgColor: null,
    clearComponents: null,
    showGraphics: false
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