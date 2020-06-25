import React from "react";

import {createEntry, changeNode, changeNodePure, changeNodeMulti} from "./core_actions.js"
import {guid} from "../../utility/utilities.js"
import {batch} from "react-redux";
import {
    defaultBgColor,
    defaultFontFamily,
    defaultFontSize,
    defaultFontStyle,
    defaultPenWidth,
    defaultPenColorString
} from "../../shared_consts";
import {GraphicsNode} from "../../graphics_box_commands.js";
import {Triangle} from "../../pixi_shapes.js";
import {SvgTriangle} from "../../svg_shapes.js";
import {SpriteNode} from "../../sprite_commands.js";

export {newTextNode, newLineNode, newDataBoxNode, newSpriteBox, newDoitBoxNode, newClosetLine, createNode, nodeModels,
    textNodeDict, lineNodeDict, dataBoxNodeDict, colorNodeDict, graphicsNodeDict, doitBoxNodeDict, newValueBox, newShapeBox,
    portNodeDict, newPort, newColorBox, createTextLine, createTextDataBox, sprite_base_dict, sprite_main_params, sprite_closet_params}

function textNodeDict(the_text, uid) {
    return {
        kind: "text",
        key: uid,
        selected: false,
        unique_id: uid,
        position: 0,
        the_text: the_text,
        parent: null,
        setTextFocus: null,
    }
}

function newTextNode(the_text, uid) {
    return (dispatch, getState) => {
        let new_node = textNodeDict(the_text, uid)
        dispatch(createEntry(new_node))
    }
}


function createTextLine(the_text, linid) {
    return (dispatch, getState) => {
        batch(()=>{
            let ttext_id = guid();
            dispatch(newTextNode(the_text, ttext_id));
            dispatch(newLineNode([ttext_id], linid));
            dispatch(changeNode(ttext_id, "parent", linid))
        })
    }
}

function createTextDataBox(the_text, boxid) {
    return (dispatch, getState) => {
        batch(() => {
            let linid = guid();
            dispatch(createTextLine(the_text, linid))
            dispatch(newDataBoxNode([linid], false, boxid))
        })
    }
}

function newHtmlBoxNode(the_code, uid) {
    return (dispatch, getState) => {
        if (the_code == null) {
            the_code = ""
        }
        let new_node = {
            name: null,
            key: uid,
            kind: "htmlbox",
            selected: false,
            unique_id: uid,
            position: 0,
            the_code: the_code,
            parent: null,
            focusNameTag: false,
            closed: false,
            setTextFocus: null,
        };
        dispatch(createEntry(new_node))
    }
}

function newJsBoxNode(the_code, uid) {
    return (dispatch, getState) => {
        if (the_code == null) {
            the_code = ""
        }
        let new_node = {
            name: null,
            kind: "jsbox",
            key: uid,
            selected: false,
            unique_id: uid,
            position: 0,
            the_code: the_code,
            parent: null,
            focusNameTag: false,
            closed: false,
            setTextFocus: null,
        };
        dispatch(createEntry(new_node))
    }
}

function lineNodeDict(node_list, uid) {
    return {kind: "line",
            key: uid,
            parent: null,
            position: 0,
            node_list: node_list,
            amCloset: false,
            unique_id: uid
    }
}

function newLineNode(node_list=[], uid) {
    return (dispatch, getState) => {
        batch(() => {
            if (node_list.length == 0) {
                let new_id = guid();
                dispatch(newTextNode("", new_id));
                node_list = [new_id]
            }
            let new_line = lineNodeDict(node_list, uid);
            dispatch(createEntry(new_line))
        })
    }
}

function newClosetLine(ncloset_line_id) {
    return (dispatch, getState) => {
        batch(() => {
            let closet_box_id = guid();
            dispatch(newDataBoxNode([], true, closet_box_id));
            dispatch(changeNodeMulti(closet_box_id, {
                transparent: true,
                name: "closet"
            }));
            let node_list = [
                closet_box_id,
            ];
            dispatch(newLineNode(node_list, ncloset_line_id));
            dispatch(changeNode(ncloset_line_id, "amCloset", true));

        })
    }
}

function dataBoxNodeDict(line_list, uid) {
    return {kind: "databox",
            key: uid,
            name: null,
            parent: null,
            fixed_size: false,
            fixed_width: null,
            fixed_height: null,
            focusName: false,
            am_zoomed: false,
            transparent: false,
            position: 0,
            selected: false,
            line_list: line_list,
            closed: false,
            showCloset: false,
            closetLine: null,
            unique_id: uid
    };
}

function newDataBoxNode(line_list=[], amClosetBox=false, uid) {
    return (dispatch, getState) => {
        batch(() => {
            if (line_list.length == 0) {
                let text_id = guid();
                dispatch(newTextNode("", text_id));
                let node_list = [text_id]
                let line_id = guid();
                dispatch(newLineNode(node_list, line_id))
                line_list = [line_id]
            }
            for (let lnodeid of line_list) {
                dispatch(changeNode(lnodeid, "parent", uid))
            }
            let new_box = dataBoxNodeDict(line_list, uid)
            dispatch(createEntry(new_box));

        })
    }
}

function doitBoxNodeDict(line_list, uid) {
    return { kind: "doitbox",
            key: uid,
            name: null,
            parent: null,
            fixed_size: false,
            fixed_width: null,
            fixed_height: null,
            focusName: false,
            am_zoomed: false,
            transparent: false,
            position: 0,
            selected: false,
            line_list: line_list,
            closed: false,
            showCloset: false,
            closetLine: null,
            unique_id: uid
    }
}

function newDoitBoxNode(line_list=[], uid) {
    return (dispatch, getState) => {
        batch(() => {
            if (line_list.length == 0) {
                let text_id = guid();
                dispatch(newTextNode("", text_id));
                let node_list = [text_id]
                let line_id = guid();
                dispatch(newLineNode(node_list, line_id))
                line_list = [line_id]
            }
            for (let lnodeid of line_list) {
                dispatch(changeNode(lnodeid, "parent", uid))
            }
            let new_box = doitBoxNodeDict(line_list, uid);
            dispatch(createEntry(new_box));

        })
    }
}

function portNodeDict(target=null, uid) {
    return {
    kind: "port",
        key: uid,
        target: target,
        name: null,
        parent: null,
        fixed_size: false,
        fixed_width: null,
        fixed_height: null,
        focusNameTag: false,
        am_zoomed: false,
        position: 0,
        selected: false,
        closed: false,
        unique_id: uid
    }
}

function newPort(target=null, uid) {
    return (dispatch, getState) => {
        let new_box = portNodeDict(target, uid);
        dispatch(createEntry(new_box));
    }
}

function graphicsNodeDict(uid, specific_kind, line_list) {
    return {
        kind: specific_kind,
        key: uid,
        name: null,
        parent: null,
        fixed_size: false,
        fixed_width: null,
        fixed_height: null,
        focusNameTag: false,
        am_zoomed: false,
        transparent: false,
        selected: false,
        line_list: line_list,
        closed: false,
        drawn_components: [],
        showCloset: false,
        closetLine: null,
        unique_id: uid,
        bgColor: defaultBgColor,
        graphics_fixed_width: 303,
        graphics_fixed_height: 303,
        showGraphics: true
    }
}

function newGraphicsBox(line_list=[], specific_kind, uid) {
    return (dispatch, getState) => {
        batch(() => {
            if (line_list.length == 0) {
                let text_id = guid();
                dispatch(newTextNode("", text_id));
                let node_list = [text_id]
                let line_id = guid();
                dispatch(newLineNode(node_list, line_id))
                line_list = [line_id]
            }
            for (let lnodeid of line_list) {
                dispatch(changeNode(lnodeid, "parent", uid))
            }

            let new_node_params = graphicsNodeDict(uid, specific_kind, line_list)
            let new_node;
            let newgnode = new GraphicsNode(new_node_params)
            dispatch(createEntry(newgnode));
        })
    }
}

function colorNodeDict(uid, line_list) {
    return {
        kind: "color",
        key: uid,
        name: null,
        parent: null,
        fixed_size: false,
        fixed_width: null,
        fixed_height: null,
        focusNameTag: false,
        am_zoomed: false,
        transparent: false,
        selected: false,
        line_list: line_list,
        closed: false,
        drawn_components: [],
        showCloset: false,
        closetLine: null,
        unique_id: uid,
        graphics_fixed_width: 25,
        graphics_fixed_height: 25,
        showGraphics: true,
    }
}

function newColorBox(color_string=null, uid) {
    return (dispatch, getState) => {
        batch(() => {
            if (!color_string) {
                color_string = "0 0 0"
            }

            let text_id = guid();
            dispatch(newTextNode(color_string, text_id));
            let node_list = [text_id]
            let line_id = guid();
            dispatch(newLineNode(node_list, line_id))
            let line_list = [line_id]

            let new_node_params = colorNodeDict(uid, line_list);
            let newgnode = new GraphicsNode(new_node_params)
            dispatch(createEntry(newgnode));
        })
    }
}

function newValueBox(name, value, vboxid, in_sprite_value=false) {
    return (dispatch, getState) => {
        batch(() => {
            let ntextid = guid();
            let nlineid = guid();
            dispatch(newTextNode(String(value), ntextid));

            let node_list = [ntextid];
            dispatch(newLineNode(node_list, nlineid));
            let line_list = [nlineid];
            dispatch(newDataBoxNode(line_list, false, vboxid));
            dispatch(changeNode(vboxid, "name", name));
            dispatch(changeNodeMulti(ntextid, {"value_parent": vboxid,
                "value_name": name, "in_sprite_value": in_sprite_value}));
        })
    }
}

function newShapeBox(shape_boxid, graphics_kind, shape_components) {
    return (dispatch, getState) => {
        batch(() => {
            dispatch(newGraphicsBox([], graphics_kind, shape_boxid));
            dispatch(changeNodeMulti(shape_boxid,
                {name: "shape", graphics_fixed_width: 50, graphics_fixed_height: 50, drawn_components: shape_components}))
        })
    }
}

function newTurtleShape(shape_boxid) {
    return (dispatch, getState) => {
        batch(() => {
            const tw = 11;
            const th = 15;
            const turtleColor = 0x008000;
            dispatch(newGraphicsBox([], "graphics", shape_boxid));
            let tshape = <Triangle tw={tw} th={th} tcolor={turtleColor}/>;
            dispatch(changeNodeMulti(shape_boxid,
                {name: "shape", graphics_fixed_width: 50, graphics_fixed_height: 50, drawn_components: [tshape]}))
        })
    }
}

function newSvgTurtleShape(shape_boxid) {
    return (dispatch, getState) => {
        batch(() => {
            const tw = 11;
            const th = 15;
            const turtleColor = "green";
            dispatch(newGraphicsBox([], "svggraphics", shape_boxid));
            let tshape = <SvgTriangle width={tw} height={th} fill={turtleColor}/>;
            dispatch(changeNodeMulti(shape_boxid,
                {name: "shape", graphics_fixed_width: 50, graphics_fixed_height: 50, drawn_components: [tshape]}))
        })
    }
}

let sprite_base_dict = {
    "xPosition": 0,
    "yPosition": 0,
    pen: true,
    shown: true,
    heading: 0,
    "spriteSize": 1,
    "penColor": defaultPenColorString,
    "penWidth": defaultPenWidth,
    "fontFamily": defaultFontFamily,
    "fontSize": defaultFontSize,
    "fontStyle": defaultFontStyle,
    "use_svg": false
}

const sprite_main_params = ["xPosition", "yPosition", "pen", "shown", "heading"];
const sprite_closet_params = ["spriteSize", "penWidth", "fontFamily", "fontSize", "fontStyle"];

function newSpriteBox(use_svg=false, uid) {
    return (dispatch, getState) => {
        batch(() => {
            let param_dict = sprite_base_dict;
            param_dict["use_uvg"] = use_svg;
            let param_box_ids = {};
            const tw = 11;
            const th = 15;
            if (use_svg) {
                param_dict.shape_components = [<SvgTriangle width={tw} height={th} fill="green"/>];
            }
            else {
                param_dict.shape_components = [<Triangle tw={tw} th={th} tcolor={0x008000}/>];
            }

            let main_node_list = [];
            for (let param of sprite_main_params) {
                let vid = guid();
                dispatch(newValueBox(param, param_dict[param], vid, true));
                main_node_list.push(vid);
                dispatch(changeNodePure(vid, "sprite_parent", uid));
                param_box_ids[param] = vid
            }

            let tshape_id = guid();

            let graphics_kind = use_svg ? "svggraphics" : "graphics";
            dispatch(newShapeBox(tshape_id, graphics_kind, param_dict.shape_components))
            dispatch(changeNodePure(tshape_id, "sprite_parent", uid));

            main_node_list.push(tshape_id);
            param_box_ids["shape_components"] = tshape_id

            let main_lineid = guid();
            dispatch(newLineNode(main_node_list, main_lineid));
            let line_list = [main_lineid];

            let closet_node_list = [];
            for (let param of sprite_closet_params) {
                let vid = guid();
                dispatch(newValueBox(param, param_dict[param], vid));
                closet_node_list.push(vid);
                dispatch(changeNodePure(vid, "sprite_parent", uid));
                param_box_ids[param] = vid
            }

            let penColorBoxid = guid();
            dispatch(newColorBox(defaultPenColorString, penColorBoxid));
            dispatch(changeNode(penColorBoxid, "name", "penColor", penColorBoxid));
            closet_node_list.push(penColorBoxid);

            param_box_ids["penColor"] = penColorBoxid;
            dispatch(changeNodePure(penColorBoxid, "sprite_parent", uid));

            let closet_lineid = guid();
            dispatch(newLineNode(closet_node_list, closet_lineid));
            dispatch(changeNodePure(closet_lineid, "amCloset", true));

            let new_node_params = {
                kind: "sprite",
                key: uid,
                name: null,
                parent: null,
                fixed_size: false,
                fixed_width: null,
                fixed_height: null,
                focusNameTag: false,
                am_zoomed: false,
                transparent: false,
                position: 0,
                selected: false,
                line_list: line_list,
                closed: false,
                showCloset: false,
                closetLine: closet_lineid,
                unique_id: uid,
                sparams: param_dict,
                param_box_ids: param_box_ids
            }

            let newsnode = new SpriteNode(new_node_params);
            dispatch(createEntry(newsnode))
        })
    }
}


function newTurtleBox(use_svg, uid) {
    return (dispatch, getState) => {
        batch(() => {
            let spriteid = guid();
            dispatch(newSpriteBox(use_svg, spriteid));
            dispatch(changeNode(spriteid, "transparent", true));
            let node_list = [spriteid];
            let new_lineid = guid();
            dispatch(newLineNode(node_list, new_lineid));
            let line_list = [new_lineid];

            let skind = use_svg ? "svggraphics" : "graphics";
            dispatch(newGraphicsBox(line_list, skind, uid));
            dispatch(changeNode(uid, "transparent", true));
        })
    }
}


function createNode(kind, new_id, use_svg) {
    return (dispatch, getState) => {
        switch (kind) {
            case "jsbox":
                dispatch(newJsBoxNode(null, new_id))
                return
            case "htmlbox":
                dispatch(newHtmlBoxNode(null, new_id))
                return
            case "doitbox":
                dispatch(newDoitBoxNode([], new_id))
                return
            case "databox":
                dispatch(newDataBoxNode([], false, new_id))
                return
            case "sprite":
                dispatch(newSpriteBox(use_svg, new_id))
                return
            case "graphics":
                dispatch(newGraphicsBox([],  "graphics", new_id))
                return
            case "svggraphics":
                dispatch(newGraphicsBox([], "svggraphics",  new_id))
                return
            case "color":
                dispatch(newColorBox(null, new_id))
                return
            case "port":
                dispatch(newPort(null, new_id))
                return
            case "turtlebox":
                dispatch(newTurtleBox(false, new_id))
                return
            case "svgturtlebox":
                dispatch(newTurtleBox(true, new_id))
                return
        }

    }
}


function nodeModels() {
    return {
        jsbox: (new_id)=>{return this._newJsBoxNode(null, new_id)},
        htmlbox: (new_id)=>{return this._newHtmlBoxNode(null, new_id)},
        text: (new_id)=>{return this._newTextNode("", new_id)},
        doitbox: (new_id)=>{return this._newDoitBoxNode([], new_id)},
        databox: (new_id)=>{return this._newDataBoxNode([], false, new_id)},
        sprite: (new_id)=>{return this._newSpriteBox(false, new_id)},
        graphics: (new_id)=>{return this._newGraphicsBox([], new_id)},
        svggraphics: (new_id)=>{return this._newGraphicsBox([], new_id)},
        line: (new_id)=>{return this._newLineNode([], new_id)},
        color: (new_id)=>{return this._newColorBox(null, new_id)},
        port: (new_id)=>{return this._newPort(null, new_id)},
    }
}



