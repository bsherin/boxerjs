import React from "react";

import {guid} from "./utilities.js";
import {
    defaultBgColor,
    defaultFontFamily,
    defaultFontSize,
    defaultFontStyle,
    defaultPenColor,
    defaultPenWidth
} from "./shared_consts.js";
import {GraphicsNode} from "./graphics_box_commands.js";
import {Triangle} from "./pixi_shapes.js";
import {SvgTriangle} from "./svg_shapes.js";
import {SpriteNode} from "./sprite_commands.js";

export {nodeCreatorMixin}

let nodeCreatorMixin = {
     _newTextNode(the_text=null) {
        let uid = guid();
        let new_node = {
            kind: "text",
            key: uid,
            selected: false,
            unique_id: uid,
            position: 0,
            the_text: the_text,
            parent: null,
            setFocus: null,
        };
        return new_node
    },

    _newClosetLine() {
        let closet_box = this._newDataBoxNode([], true);
        closet_box.transparent = true;
        closet_box.name = "closet";
        let node_list = [
            this._newTextNode(""),
            closet_box,
            this._newTextNode("")
        ];
        let ncloset = this._newLineNode(node_list);
        ncloset.amCloset = true;
        return ncloset
    },

    _newLineNode(node_list=[]) {
        let uid = guid();
        if (node_list.length == 0) {
            node_list.push(this._newTextNode(""))
        }
        let new_line = {kind: "line",
                        key: uid,
                        parent: null,
                        position: 0,
                        node_list: node_list,
                        amCloset: false,
                        unique_id: uid};
        for (let node of node_list) {
            node.parent = uid
        }
        this._renumberNodes(new_line.node_list)
        return new_line
    },

    _newDoitBoxNode(line_list=[]) {
        let uid = guid();
        if (line_list.length == 0) {
            let node_list = [this._newTextNode(" ")];
            let new_line = this._newLineNode(node_list);
            line_list = [new_line]
        }
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        this._renumberNodes(line_list);
        let new_box = {kind: "doitbox",
                        key: uid,
                        name: null,
                        parent: null,
                        fixed_size: false,
                        fixed_width: null,
                        fixed_height: null,
                        focusName: false,
                        am_zoomed: false,
                        position: 0,
                        selected: false,
                        line_list: line_list,
                        closed: false,
                        showCloset: false,
                        closetLine: null,
                        unique_id: uid};
        return new_box
    },

    _newDataBoxNode(line_list=[], amClosetBox=false) {
        let uid = guid();
        if (line_list.length == 0) {
            let node_list = [this._newTextNode(" ")];
            let new_line = this._newLineNode(node_list);
            line_list = [new_line]
        }
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        this._renumberNodes(line_list);
        let new_box = {
            kind: "databox",
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
            unique_id: uid};
        return new_box
    },

    _newPort(target=null) {
        let uid = guid();
        let new_box = {
            kind: "port",
            key: uid,
            target: target,
            name: null,
            parent: null,
            fixed_size: false,
            fixed_width: null,
            fixed_height: null,
            focusName: false,
            am_zoomed: false,
            position: 0,
            selected: false,
            closed: false,
            unique_id: uid};
        return new_box
    },

    _newSvgGraphicsBox(line_list=[]) {
        let uid = guid();
        if (line_list.length == 0) {
            let node_list = [this._newTextNode(" ")];
            let new_line = this._newLineNode(node_list);
            line_list = [new_line]
        }
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        this._renumberNodes(line_list);
        let new_node_params = {
            kind: "svggraphics",
            key: uid,
            name: null,
            parent: null,
            fixed_size: false,
            fixed_width: null,
            fixed_height: null,
            focusName: false,
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
            showGraphics: true,
        };
        return new GraphicsNode(new_node_params)
    },

    _newGraphicsBox(line_list=[]) {
        let uid = guid();
        if (line_list.length == 0) {
            let node_list = [this._newTextNode(" ")];
            let new_line = this._newLineNode(node_list);
            line_list = [new_line]
        }
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        this._renumberNodes(line_list);
        let new_node_params= {
            kind: "graphics",
            key: uid,
            name: null,
            parent: null,
            fixed_size: false,
            fixed_width: null,
            fixed_height: null,
            focusName: false,
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
            showGraphics: true,
        };
        return new GraphicsNode(new_node_params)
    },

    _newColorBox(color_string=null) {
        let uid = guid();
        if (!color_string) {
            color_string = "0 0 0"
        }
        let node_list = [this._newTextNode(color_string)];
        let new_line = this._newLineNode(node_list);
        let line_list = [new_line];
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        this._renumberNodes(line_list);
        let new_node = {
            kind: "color",
            key: uid,
            name: null,
            parent: null,
            fixed_size: false,
            fixed_width: null,
            fixed_height: null,
            focusName: false,
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
        };
        return new_node
    },
    _newValueBox(name, value) {
        let node_list = [this._newTextNode(String(value))];
        let new_line = this._newLineNode(node_list);
        let line_list = [new_line];
        let vbox = this._newDataBoxNode(line_list);
        vbox.name = String(name);
        return vbox
    },

    _newTurtleShape() {
        const tw = 11;
        const th = 15;
        const turtleColor = 0x008000;
        let shape_box = this._newGraphicsBox();
        shape_box.name = "shape";
        shape_box.graphics_fixed_width = 50;
        shape_box.graphics_fixed_height = 50;
        let tshape = <Triangle tw={tw} th={th} tcolor={turtleColor}/>;
        shape_box.drawn_components = [tshape];
        return shape_box
    },

    _newSvgTurtleShape() {
        const tw = 11;
        const th = 15;
        const turtleColor = "#008000";
        let shape_box = this._newSvgGraphicsBox();
        shape_box.name = "shape";
        shape_box.graphics_fixed_width = 50;
        shape_box.graphics_fixed_height = 50;
        let tshape = <SvgTriangle width={tw} height={th} fill={turtleColor}/>;
        shape_box.drawn_components = [tshape];
        return shape_box
    },

    _newSpriteBox(use_svg=false) {
        let uid = guid();
        let param_dict = {
            "xPosition": 0,
            "yPosition": 0,
            pen: true,
            shown: true,
            heading: 0,
            "spriteSize": 1,
            "penColor": defaultPenColor,
            "penWidth": defaultPenWidth,
            "fontFamily": defaultFontFamily,
            "fontSize": defaultFontSize,
            "fontStyle": defaultFontStyle
        };

        let main_params = ["xPosition", "yPosition", "pen", "shown", "heading"];
        let closet_params = ["spriteSize", "penWidth", "fontFamily", "fontSize", "fontStyle"];

        let main_node_list = [this._newTextNode(" ")];
        for (let param of main_params) {
            main_node_list.push(this._newValueBox(param, param_dict[param]));
            main_node_list.push(this._newTextNode(" "))
        }
        if (use_svg) {
            main_node_list.push(this._newSvgTurtleShape());
        }
        else {
            main_node_list.push(this._newTurtleShape());
        }

        let main_line = this._newLineNode(main_node_list);

        let closet_node_list = [this._newTextNode(" ")];
        for (let param of closet_params) {
            closet_node_list.push(this._newValueBox(param, param_dict[param]));
            closet_node_list.push(this._newTextNode(" "))
        }
        let penColorBox = this._newColorBox("0 0 0");
        penColorBox.name = "penColor";
        closet_node_list.push(penColorBox);

        let closet_line = this._newLineNode(closet_node_list);
        closet_line.amCloset = true

        let line_list = [main_line];
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        closet_line.parent = uid;

        this._renumberNodes(line_list);
        let new_node_params = {
            kind: "sprite",
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
            closetLine: closet_line,
            unique_id: uid

        };
        return new SpriteNode(new_node_params)
    },

    _newTurtleBox() {
        let uid = guid();
        let sprite = this._newSpriteBox();
        sprite.transparent = true;
        let node_list = [sprite];
        let new_line = this._newLineNode(node_list);
        let line_list = [new_line];
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        let new_node = this._newGraphicsBox(line_list);
        new_node.transparent = true;
        return new_node
    },

    _newSvgTurtleBox() {
        let uid = guid();
        let sprite = this._newSpriteBox(true);
        sprite.transparent = true;
        let node_list = [sprite];
        let new_line = this._newLineNode(node_list);
        let line_list = [new_line];
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        let new_node = this._newSvgGraphicsBox(line_list);
        new_node.transparent = true;
        return new_node
    },

    _newHtmlBoxNode(the_code=null){
        let uid = guid();
        if (the_code == null) {
            the_code = ""
        }
        let new_node = {
            kind: "htmlbox",
            name: null,
            key: uid,
            selected: false,
            unique_id: uid,
            position: 0,
            the_code: the_code,
            parent: null,
            focusName: false,
            closed: false,
            setFocus: null,
        };
        return new_node
    },

    _newJsBoxNode(the_code=null){
        let uid = guid();
        if (the_code == null) {
            the_code = ""
        }
        let new_node = {
            kind: "jsbox",
            name: null,
            key: uid,
            selected: false,
            unique_id: uid,
            position: 0,
            the_code: the_code,
            parent: null,
            focusName: false,
            closed: false,
            setFocus: null,
        };
        return new_node
    },

    _nodeCreators() {
        return {
            jsbox: this._newJsBoxNode,
            htmlbox: this._newHtmlBoxNode,
            text: this._newTextNode,
            doitbox: this._newDoitBoxNode,
            databox: this._newDataBoxNode,
            sprite: this._newSpriteBox,
            graphics: this._newGraphicsBox,
            svggraphics: this._newSvgGraphicsBox,
            line: this._newLineNode,
            color: this._newColorBox,
            port: this._newPort,
            turtlebox: this._newTurtleBox,
            svgturtlebox: this._newSvgTurtleBox
        }
    },

    _healers() {
        return {
            jsbox: null,
            text: null,
            htmlbox: null,
            doitbox: this._newDoitBoxNode,
            databox: this._newDataBoxNode,
            sprite: this._newSpriteBox,
            graphics: this._newGraphicsBox,
            svggraphics: this._newSvgGraphicsBox,
            color: this._newColorBox,
            port: this._newPort,
            line: this._healLine
        }
    }
}