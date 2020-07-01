

import React from "react";
import ContentEditable from "react-contenteditable";
import { Provider, batch } from 'react-redux';
import _ from "lodash";

import {connect} from "react-redux";

import {doBinding, getCaretPosition, guid, selectedAcrossBoxes, _convertColorArg, _svgConvertColorArg,
    portChainToArray, addToPortChain, roundToPlaces} from "./utility/utilities.js";
import {ReactCodemirror} from "./react-codemirror.js";

import {_getln, makeSelectMyPropsAndGlobals, makeSelectMyProps, makeSelectColorProps, makeSelectMyPropsAndTextGlobals} from "./redux/selectors.js"

import {doExecution} from "./execution/eval_space.js";
import {ErrorBoundary} from "./error_boundary.js";

import {mapDispatchToProps} from "./redux/actions/dispatch_mapper.js";

import {SvgRect} from "./svg_shapes.js"
// noinspection ES6CheckImport
import { Sprite, Stage, withApp, Container, Text} from "react-pixi-fiber";
import * as PIXI from "pixi.js";

import {data_kinds} from "./shared_consts.js";

import {withName} from "./named_box.js";
import {Button} from "@blueprintjs/core";

export {DataBox, PortBox, JsBox, loader, GenericNode}

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



class SpriteBoxRaw extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.spriteRef = React.createRef();
        this.last_tick_processed = 0
    }

    // _listen_for_clicks () {
    //     let self = this;
    //     if (this.spriteRef && this.spriteRef.current) {
    //         this.spriteRef.current.removeListener("pointerdown", this._onMouseDown);
    //         this.spriteRef.current.addListener("pointerdown", this._onMouseDown);
    //     }
    // }

    // _onMouseDown(event) {
    //     _mouseClickOnSprite(this.props.unique_id, this.props.funcs.getBaseNode())
    // }

    // componentDidMount () {
    //     this._listen_for_clicks();
    // }
    // //
    // // componentDidUpdate () {
    // //     this._listen_for_clicks();
    // }

    _myNode() {
        return this.props.node_dict[this.props.unique_id]
    }

    _getMousePosition() {
        return this.props.getMousePosition();
    }

    _isColor(aboxorstring) {
        return typeof(aboxorstring) == "object" && aboxorstring.hasOwnProperty("kind") &&  aboxorstring.kind == "color"
    }


    render() {
        if (this.props.kind != "sprite") {
            return null
        }
        let sparams = this.props.sparams;
        let in_svg = this.props.in_svg;
        let the_sprite;
        let keyed_components = sparams.shape_components.map((comp, index) => {
                    let new_comp = comp;
                    new_comp.key = index;
                    return new_comp;
                })
        if (!in_svg) {
            the_sprite = (
                <Sprite x={sparams["xPosition"]}
                        y={sparams["yPosition"]}
                        interactive={true}
                        ref={this.spriteRef}
                        scale={sparams["spriteSize"]}
                        angle={-1 * sparams["heading"]}
                        anchor={[0.5, 0.5]}>
                    {keyed_components}
                </Sprite>
            );
        }
        else {
            let trans_string = `translate(${sparams["xPosition"]}, ${sparams["yPosition"]}) 
            rotate(${-1 * sparams["heading"]}) 
            scale(${sparams["spriteSize"]}, ${sparams["spriteSize"]})`

            the_sprite = (
                <g transform={trans_string} style={{overflow: "visible"}}>
                    {keyed_components}
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

function makeMapStateToPropsAndGlobals() {
    const selectMyPropsAndGlobals = makeSelectMyPropsAndGlobals()
    return (state, ownProps) => {
        return Object.assign(selectMyPropsAndGlobals(state, ownProps), ownProps)
    }
}

var SpriteBox = connect(
    makeMapStateToPropsAndGlobals(),
    mapDispatchToProps)(SpriteBoxRaw)

class GraphicsBoxRaw extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.graphicsRef = React.createRef();
        this.do_wrap = true;
        this.last_x = 0;
        this.last_y = 0;
        this.last_tick_processed = 0
    }

    // _onMouseMove(event) {
    //     if (this.graphicsRef && this.graphicsRef.current) {
    //         let newPosition = event.data.getLocalPosition(this.graphicsRef.current.parent);
    //         this.last_x = newPosition.x;
    //         this.last_y = newPosition.y;
    //     }
    //
    // }

        // _listen_for_clicks () {
    //     let self = this;
    //     if (this.graphicsRef && this.graphicsRef.current) {
    //         if (this.graphicsRef && this.graphicsRef.current) {
    //             this.graphicsRef.current.removeListener("pointerdown", this._onMouseDown);
    //             this.graphicsRef.current.addListener("pointerdown", this._onMouseDown);
    //             this.graphicsRef.current.removeListener("pointermove", this._onMouseMove);
    //             this.graphicsRef.current.addListener("pointermove", this._onMouseMove);
    //         }
    //     }
    // }

    // _onMouseDown(event) {
    //     _mouseClickOnGraphics(this.props.unique_id, this.props.node_dict["world"])
    // }

    // componentDidMount () {
    //     this._listen_for_clicks();
    // }
    //
    // componentDidUpdate () {
    //     this._listen_for_clicks();
    // }

    _addComponent(new_comp, callback=null) {
        this.props.addGraphicsComponent(this.props.unique_id, new_comp, callback);
    }

    _getMousePosition() {
        return {x: this.last_x, y: this.last_y}
    }

    _snapTexture() {
        return this.props.app.renderer.generateTexture(this.props.app.stage)
    }

    _getColorBoxColor() {
        return _convertColorArg(this.props.color_string)
    }

    render() {
        if (this.props.closed || !this.props.showGraphics) {
            return (
                <DataBoxRaw {...this.props} in_svg={false} addComponent={this._addComponent}/>
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
                    sprite_components = sprite_components.concat(<GraphicsBoxLine in_svg={false} key={lin_id} unique_id={lin_id}/>)
                }
                let bgcolor = _convertColorArg(this.props.bgColor)
                let offsetPoint = new PIXI.Point(gwidth / 2, gheight / 2);
                let scalePoint = [-1, 1];  // This reflects over y axis
                // I need the Provider hack below because of a react-pixi issue.
                let keyed_components = this.props.drawn_components.map((comp, index) => {
                    let new_comp = comp;
                    new_comp.key = index;
                    return new_comp;
                })
                return (
                    <Stage options={{width: gwidth, height:gheight, antialias: true}}>
                        <Container position={offsetPoint} angle={180} scale={scalePoint}>
                            <Provider store={window.store}>
                                <Sprite width={gwidth} height={gheight} key="bgsprite"
                                        texture={PIXI.Texture.WHITE}
                                        position={{x: -gwidth / 2, y: -gheight / 2}}
                                        ref={this.graphicsRef}
                                        interactive={true}
                                        tint={bgcolor} />
                                {sprite_components.length > 0 && sprite_components}
                                {(this.props.drawn_components.length > 0) && keyed_components}
                            </Provider>
                        </Container>
                    </Stage>
                )

            }

        }
    }
}


function makeMapStateToPropsGraphics() {
    const selectMyPropsAndGlobals = makeSelectMyPropsAndGlobals();
    const selectMyColorProps = makeSelectColorProps();
    return (state, ownProps) => {
        if (state.node_dict[ownProps["unique_id"]].kind == "color") {
            return Object.assign(selectMyColorProps(state, ownProps), ownProps)
        }
        else {
            return Object.assign(selectMyPropsAndGlobals(state, ownProps), ownProps)
        }

    }
}

const GraphicsBox = connect(
    makeMapStateToPropsGraphics(),
    mapDispatchToProps)(withApp(withName(GraphicsBoxRaw)));


class GraphicsBoxLineRaw extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.last_tick_processed = 0
    }


    render () {
        let sprite_components = []
        for (let nd_id of this.props.node_list) {
            let new_comp = (
                <SpriteBox unique_id={nd_id}
                           in_svg={this.props.in_svg}
                           key={nd_id}
                           app={this.props.app}
                           showGraphics={true}/>
            );
            if (new_comp) {
                sprite_components.push(new_comp)
            }
        }
        return sprite_components
    }
}

function makeMapStateToProps() {
    const selectMyProps = makeSelectMyProps()
    return (state, ownProps) => {
        return Object.assign(selectMyProps(state, ownProps), ownProps)
    }
}


const GraphicsBoxLine = connect(
    makeMapStateToProps(),
    mapDispatchToProps)(GraphicsBoxLineRaw);


class SvgGraphicsBoxRaw extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.graphicsRef = React.createRef();
        this.last_x = 0;
        this.last_y = 0;
        this.last_tick_processed = 0
    }

    _getMousePosition() {
        return {x: this.last_x, y: this.last_y}
    }

    render() {
        if (this.props.closed || !this.props.showGraphics) {
            return (
                <DataBoxRaw {...this.props}
                            addComponent={this._addComponent}
                            in_svg={true}/>
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
                sprite_components = sprite_components.concat(<GraphicsBoxLine in_svg={true} key={lin_id} unique_id={lin_id}/>)
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

var SvgGraphicsBox = connect(
    makeMapStateToPropsGraphics(),
    mapDispatchToProps)(withName(SvgGraphicsBoxRaw));


class TextNodeRaw extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.iRef = null;
        this.last_tick_processed = 0
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
        this.props.updateTextNode(this.props.unique_id, txt)
        if (this.props.in_sprite_value) {
            this.props.changeSpriteValueBox(this.props.value_parent, txt)
        }
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
        this.props.storeFocus(this.props.unique_id, pos, this.props.port_chain)
    }

    async _runMe() {

        let result = await doExecution(this.props.parent);
        if (result == null) {
            return
        }
        let new_node_id = guid();
        let new_line_id = guid();
        let new_databox_id = guid();

        if (typeof(result) != "object") {
            batch(()=>{
                this.props.createTextDataBox(String(result), new_databox_id);
                this.props.insertNode(new_databox_id, this.props.parent, -1);
                this.props.healStructure(this.props.parent);
                this.props.positionAfterBox(new_databox_id, this.props.port_chain)
            })

        }
        else {
            let new_id = guid();
            batch(()=> {
                this.props.cloneNodeToStore(result.vid, window.vstore.getState().node_dict, new_id, true);

                if (data_kinds.includes(window.store.getState().node_dict[new_id].kind)) {
                    this.props.changeNode(new_id, "name", null);
                }
                // repairCopiedDrawnComponents(target_dict[vid], true, target_dict);
                this.props.insertNode(new_id, this.props.parent, -1);
                this.props.healStructure(this.props.parent);
                this.props.positionAfterBox(new_id, this.props.port_chain)
            })
        }
        this.props.healStructure(this.props.parent)
    }

   _handleKeyDown(event) {
        if (["Control", "Shift", "Meta"].includes(event.key)) {
            return
        }
        if (event.key == "Backspace") {
            if (this.props.boxer_selected) {
                event.preventDefault();
                this.props.deleteBoxerSelection();
                return;
            }
            let caret_pos = getCaretPosition(this.iRef);
            if (caret_pos == 0){
                event.preventDefault();
                this.props.deletePrecedingBox(this.props.unique_id, !currentlyDeleting, this.props.port_chain);
            }
            else {
                let the_text = window.getSelection().toString();
                if (the_text) {
                    this.props.copySelected()
                }
                else {
                    this.props.addTextToClipboard(this.props.the_text.charAt(caret_pos - 1), !currentlyDeleting);
                }
            }
            currentlyDeleting = true;
            return
        }
        currentlyDeleting = false;
        switch (event.key) {
            case "F9":
                event.preventDefault();
                this.props.toggleCloset(this.props.unique_id);
                return
            case "k":
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    let caret_pos = getCaretPosition(this.iRef);
                    this.props.deleteToLineEnd(this.props.unique_id, caret_pos, this.props.port_chain);
                }
                return
            case "|":
                event.preventDefault();
                this.props.focusName(this.props.unique_id, this.props.port_chain)
                return
            case "{":
                event.preventDefault();
                this.props.insertBoxInText("databox", this.props.unique_id, getCaretPosition(document.activeElement),
                         this.props.last_focus_port_chain)
                return
            case "[":
                event.preventDefault();
                this.props.insertBoxInText("doitbox", this.props.unique_id, getCaretPosition(document.activeElement),
                         this.props.last_focus_port_chain)
                return

            case "Enter":
                event.preventDefault();
                if (event.ctrlKey || event.metaKey) {
                    this._runMe();
                }
                else {
                    currentlyDeleting = false;
                    this.props.splitLineAtTextPosition(this.props.unique_id, getCaretPosition(this.iRef), this.props.port_chain);
                }
                return
        }

        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case ".":
                    window.user_aborted = true;
                    event.preventDefault();
                    return
                case "v":
                    event.preventDefault();
                    this.props.insertClipboard(this.props.unique_id, getCaretPosition(document.activeElement),
                        this.props.last_focus_port_chain);
                    return
                case "c":
                    event.preventDefault();
                    this.props.copySelected();
                    return
                case "x":
                    event.preventDefault();
                    this.props.cutSelected();
                    return
                case "z":
                    event.preventDefault();
                    // needs doint
                    return
                case "s":
                    event.preventDefault();
                    this.props.saveProject()

            }
        }

        if (event.shiftKey  || event.altKey) {
            return
        }
        switch (event.key) {
            case "Escape":
                event.preventDefault();
                this.props.clearSelected();
                return

            case "ArrowDown":
                this.props.arrowDown(this.props.unique_id, this.props.port_chain);
                event.preventDefault();
                return

            case "ArrowLeft":
                if ((getCaretPosition(this.iRef) == 0) && (this.props.position != 0)) {
                    this.props.focusLeft(this.props.unique_id, this.props.position, this.props.port_chain);
                    event.preventDefault();
                }
                return
            case "ArrowRight":
                if ((getCaretPosition(this.iRef) == this.props.the_text.length)) {
                    this.props.focusRight(this.props.unique_id, this.props.position, this.props.port_chain);
                    event.preventDefault();
                }
                return
            case "ArrowUp":
                this.props.arrowUp(this.props.unique_id, this.props.am_in_port,
                    this.props.port_chain);
                event.preventDefault();
                return
            case "]":
                this.props.doBracket(this.props.unique_id, this.props.port_chain);
                event.preventDefault();
                return
        }
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
                    self.props.selectSpan(start_id, end_id);
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
        if (this.props.setTextFocus != null && _.isEqual(this.props.setTextFocus[0], this.props.port_chain)) {
            if (this.iRef) {
                $(this.iRef).focus();
                if (this.props.setTextFocus[1] != 0) {
                    this._positionCursor(this.props.setTextFocus[1])
                }
                this.props.changeNode(this.props.unique_id, "setTextFocus", null);
            }
        }
    }

    _handleDoubleClick() {
        console.log("got double click")
    }

    render() {
        let cname;
        if (this.props.selected) {
            cname = "editable selected"
        }
        else {
            cname = "editable"
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
                                 html={this.props.display_text ? this.props.display_text : this.props.the_text}
                                 />
             </React.Fragment>

        )
    }
}

function makeMapStateToPropsForText() {
    const selectMyProps = makeSelectMyPropsAndTextGlobals();
    return (state, ownProps) => {
        return Object.assign(selectMyProps(state, ownProps), ownProps)
    }
}

let TextNode = connect(
    makeMapStateToPropsForText(),
    mapDispatchToProps
    )(TextNodeRaw)

class PortBoxRaw extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        this.last_tick_processed = 0
    }

    render() {
        let tnode;
        let inner_content;
        
        if (portChainToArray(this.props.port_chain).includes(this.props.unique_id) ) {
            inner_content = <div>Ad infinitum...</div>;

        }
        else {
            let new_port_chain = addToPortChain(this.props.port_chain, this.props.unique_id);
            if (this.props.target == null) {
                inner_content = <div>You can now target this port</div>;
            }
            else {
                inner_content = <GenericNode key={this.props.target}
                                             am_in_port={this.props.unique_id}
                                             from_port={this.props.unique_id}
                                             port_chain={new_port_chain}
                                             unique_id={this.props.target}
                                             port_is_zoomed={this.props.am_zoomed}
                    />
            }
        }

        return (
            <ErrorBoundary>
                {inner_content}
            </ErrorBoundary>
        )
    }
}

var PortBox = connect(
    makeMapStateToPropsAndGlobals(),
    mapDispatchToProps
    )(withName(PortBoxRaw));

class DataBoxRaw extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.last_tick_processed = 0
    }

    render() {
        let dbclass;
        if (this.props.closed) {
            return null;
        }

        let the_content = this.props.line_list.map((the_line_id, index) => {
            return (
                <DataboxLine key={the_line_id}
                             port_chain={this.props.port_chain}
                             unique_id={the_line_id}/>
            )
        });

        if (this.props.showCloset) {
            let clinenode = (
                <DataboxLine key={this.props.closetLine}
                             port_chain={this.props.port_chain}
                             unique_id={this.props.closetLine}
                             />
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


let DataBox = connect(
    makeMapStateToPropsAndGlobals(),
    mapDispatchToProps,
)(withName(DataBoxRaw))


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
        this.last_tick_processed = 0
    }

    _handleCodeChange(new_code) {
        this.props.changeNode(this.props.unique_id, "the_code", new_code)
    }

    _handleBlur() {
        this.props.storeFocus(this.props.unique_id, 0, this.props.port_chain);
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
        if (this.props.setTextFocus != null && this.props.setTextFocus[0] == this.props.port_chain) {
            if (this.cmobject) {
                this.cmobject.focus();
                this.props.changeNode(this.props.unique_id, "setTextFocus", null);
            }
        }
    }

    _nameMe() {
        this.props.focusName(this.props.unique_id, this.props.port_chain)
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

var HtmlBox = connect(
    makeMapStateToPropsAndGlobals(),
    mapDispatchToProps,
)(withName(HtmlBoxRaw));

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
        this.last_tick_processed = 0
    }

    _handleCodeChange(new_code) {
        this.props.changeNode(this.props.unique_id, "the_code", new_code)
    }

    _handleBlur() {
        this.props.storeFocus(this.props.unique_id, 0, this.props.port_chain);
    }

    _runMe() {
        doExecution(this.props.the_code, this.props.unique_id, this.props.node_dict)
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
        if (this.props.setTextFocus != null && this.props.setTextFocus[0] == this.props.port_chain) {
            if (this.cmobject) {
                this.cmobject.focus();
                this.props.changeNode(this.props.unique_id, "setTextFocus", null);
            }
        }
    }

    _nameMe() {
        this.props.focusName(this.props.unique_id, this.props.port_chain)
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

var JsBox = connect(
    makeMapStateToPropsAndGlobals(),
    mapDispatchToProps
)(withName(JsBoxRaw));

class DataboxLineRaw extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.last_tick_processed = 0
    }


    render() {
        let the_content = this.props.node_list.map((the_node_id, index) => {
            return (
                <ErrorBoundary key={the_node_id}>
                    <GenericNode am_in_port={false}
                                 from_port={false}
                                 port_chain={this.props.port_chain}
                                 unique_id={the_node_id}
                    />
                </ErrorBoundary>
            )
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

let DataboxLine = connect(
    makeMapStateToProps(),
    mapDispatchToProps,
)(DataboxLineRaw)


class GenericNodeRaw extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.last_tick_processed = 0
    }

    render () {
        if (!this.props.found) {
            if (this.props.from_port) {
                return (<Button onClick={()=>{this.props.retargetPort(this.props.from_port)}}>Target is missing</Button>)
            }
            else {
                return <div>Missing element</div>
            }
        }
        switch (this.props.kind) {
            case "text":
                return (
                    <TextNode key={this.props.unique_id}
                              port_chain={this.props.port_chain}
                              unique_id={this.props.unique_id}/>
                )
            case "jsbox":
                return (
                    <JsBox key={this.props.unique_id}
                           am_in_port={this.props.am_in_port}
                           port_chain={this.props.port_chain}
                           unique_id={this.props.unique_id}/>
                )
            case "htmlbox":
                return (
                    <HtmlBox key={this.props.unique_id}
                           am_in_port={this.props.am_in_port}
                           port_chain={this.props.port_chain}
                           unique_id={this.props.unique_id}/>
                )

            case "sprite":
                return (
                    <SpriteBox key={this.props.unique_id}
                           am_in_port={false}
                           port_chain={this.props.port_chain}
                           unique_id={this.props.unique_id}/>
                )

            case "graphics":
            case "color":
                return (
                    <GraphicsBox key={this.props.unique_id}
                           am_in_port={this.props.am_in_port}
                           port_chain={this.props.port_chain}
                           unique_id={this.props.unique_id}/>
                )

            case "svggraphics":
                return (
                    <SvgGraphicsBox key={this.props.unique_id}
                           am_in_port={this.props.am_in_port}
                           port_chain={this.props.port_chain}
                           unique_id={this.props.unique_id}/>
                )
            case "port":
                return (<PortBox key={this.props.unique_id}
                                 am_in_port={this.props.am_in_port}
                                 port_chain={this.props.port_chain}
                                unique_id={this.props.unique_id}/>
                )
            default:
                return (<DataBox key={this.props.unique_id}
                           am_in_port={this.props.am_in_port}
                           port_chain={this.props.port_chain}
                           unique_id={this.props.unique_id}/>
                )
        }
    }
}


let GenericNode = connect(
    makeMapStateToPropsAndGlobals(),
    mapDispatchToProps)(GenericNodeRaw)


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