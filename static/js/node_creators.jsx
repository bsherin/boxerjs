import React from "react";

import {guid} from "./utility/utilities.js";
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
     _newTextNode(the_text="", target_dict={}) {
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
        let new_dict = this._createEntryAndReturn(new_node, target_dict)
        return [uid, new_dict]
    },

    _newClosetLine(target_dict={}) {
         let closet_box_id;
        [closet_box_id, target_dict] = this._newDataBoxNode([], true, target_dict);
        let closet_box = target_dict[closet_box_id];
        target_dict = this._changeNodeMultiAndReturn(closet_box_id, {transparent: true, name: "closet"}, target_dict)
        let n1_id, n2_id;
        [n1_id, target_dict] = this._newTextNode("", target_dict);
        [n2_id, target_dict] = this._newTextNode("", target_dict);

        let node_list = [
            n1_id,
            closet_box_id,
            n2_id
        ];
        let ncloset_line_id;
        [ncloset_line_id, target_dict] = this._newLineNode(node_list, target_dict);
        target_dict = this.changeNodeAndReturn(ncloset_line_id, "amCloset", true, target_dict);
        return [ncloset_line_id, target_dict]
    },

    _newErrorNode(first_part, body, target_dict={}) {
         let body_list = body.split("\n")
         let ttext_id, tline_id, bline_id;
         let line_ids = [];
         [ttext_id, target_dict] = this._newTextNode(first_part, target_dict);
         [tline_id, target_dict] = this._newLineNode([ttext_id], target_dict);
         line_ids.push(tline_id)
         for (let btext of body_list) {
             let btext_id, bline_id;
            [btext_id, target_dict] = this._newTextNode(body, target_dict);
            [bline_id, target_dict] = this._newLineNode([btext_id], target_dict);
            line_ids.push(bline_id)
         }

         return this._newDataBoxNode(line_ids, false, target_dict)
    },


     _newLineNode(node_list=[], target_dict={}) {
        let uid = guid();
        if (node_list.length == 0) {
            let new_id;
            [new_id, target_dict] = this._newTextNode("", target_dict)
            node_list = [new_id]
        }
        let new_line = {kind: "line",
                        key: uid,
                        parent: null,
                        position: 0,
                        node_list: node_list,
                        amCloset: false,
                        unique_id: uid};
        for (let nodeid of node_list) {
            target_dict = this.changeNodeAndReturn(nodeid, "parent", uid, target_dict)
        }
        target_dict = this._createEntryAndReturn(new_line, target_dict)
        target_dict = this._renumberNodes(uid, target_dict)

        return [uid, target_dict]
    },

    _newDoitBoxNode(line_list=[], target_dict={}) {
        let uid = guid();
        if (line_list.length == 0) {
            let ntext_id;
            [ntext_id, target_dict] = this._newTextNode("", target_dict)
            let node_list = [ntext_id];
            let new_line_id;
            [new_line_id, target_dict] = this._newLineNode(node_list, target_dict);
            line_list = [new_line_id]
        }
        for (let lnodeid of line_list) {
            target_dict = this.changeNodeAndReturn(lnodeid, "parent", uid, target_dict)
        }

        let new_box = {kind: "doitbox",
                        key: uid,
                        name: null,
                        parent: null,
                        fixed_size: false,
                        fixed_width: null,
                        fixed_height: null,
                        focusNameTag: false,
                        am_zoomed: false,
                        position: 0,
                        selected: false,
                        line_list: line_list,
                        closed: false,
                        showCloset: false,
                        closetLine: null,
                        unique_id: uid};
        target_dict = this._createEntryAndReturn(new_box, target_dict)
        target_dict = this._renumberLines(uid, target_dict);
        return [uid, target_dict]
    },

    _newDataBoxNode(line_list=[], amClosetBox=false, new_dict={}) {
        let uid = guid();
        let text_id, line_id;
        if (line_list.length == 0) {
            [text_id, new_dict] = this._newTextNode("", new_dict)
            let node_list = [text_id];
            [line_id, new_dict] = this._newLineNode(node_list, new_dict);
            line_list = [line_id]
        }
        for (let lnodeid of line_list) {
            new_dict = this.changeNodeAndReturn(lnodeid, "parent", uid, new_dict)
        }
        let new_box = {
            kind: "databox",
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
            closetLine: null,
            unique_id: uid};
        new_dict = this._createEntryAndReturn(new_box, new_dict)
        new_dict = this._renumberLines(uid, new_dict)
        return [uid, new_dict]
    },

    _newPort(target=null, target_dict={}) {
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
            focusNameTag: false,
            am_zoomed: false,
            position: 0,
            selected: false,
            closed: false,
            unique_id: uid};
        let new_dict = this._createEntryAndReturn(new_box, target_dict)
        return [uid, new_dict]
    },
    _newSvgGraphicsBox(line_list=[], target_dict={}) {
        let uid = guid();
        if (line_list.length == 0) {
            let ntext_id, new_line_id;
            [ntext_id, target_dict] = this._newTextNode("", target_dict)
            let node_list = [ntext_id];
            [new_line_id, target_dict] = this._newLineNode(node_list, target_dict);
            line_list = [new_line_id]
        }
        for (let lnodeid of line_list) {
            target_dict = this.changeNodeAndReturn(lnodeid, "parent", uid, target_dict);
        }

        let new_node_params = {
            kind: "svggraphics",
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
            showGraphics: true,
        };
        let new_node;
        let newgnode = new GraphicsNode(new_node_params)
        target_dict = this._createEntryAndReturn(newgnode, target_dict)
        target_dict = this._renumberLines(uid, target_dict)
        return [uid, target_dict]
    },

    _newGraphicsBox(line_list=[], target_dict={}) {
        let uid = guid();
        if (line_list.length == 0) {
            let ntext_id, new_line_id;
            [ntext_id, target_dict] = this._newTextNode(" ", target_dict)
            let node_list = [ntext_id];
            [new_line_id, target_dict] = this._newLineNode(node_list, target_dict);
            line_list = [new_line_id]
        }
        for (let lnodeid of line_list) {
            target_dict = this.changeNodeAndReturn(lnodeid, "parent", uid, target_dict);
        }

        let new_node_params = {
            kind: "graphics",
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
            showGraphics: true,
        };
        let new_node;
        let newgnode = new GraphicsNode(new_node_params)
        target_dict = this._createEntryAndReturn(newgnode, target_dict)
        target_dict = this._renumberLines(uid, target_dict)
        return [uid, target_dict]
    },

    _newColorBox(color_string=null, target_dict={}) {
        let uid = guid();
        if (!color_string) {
            color_string = "0 0 0"
        }
        let ntext_id, new_line_id;
        [ntext_id, target_dict] = this._newTextNode(color_string, target_dict)
        let node_list = [ntext_id];
        [new_line_id, target_dict] = this._newLineNode(node_list, target_dict);
        let line_list = [new_line_id]
        for (let lnodeid of line_list) {
            target_dict = this.changeNodeAndReturn(lnodeid, "parent", uid, target_dict);
        }

        let new_node_params = {
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
        };
        let newgnode = new GraphicsNode(new_node_params)
        target_dict = this._createEntryAndReturn(newgnode, target_dict)
        target_dict = this._renumberLines(uid, target_dict);
        return [uid, target_dict]
    },
    _newValueBox(name, value, target_dict={}) {
         let ntextid, nlineid, vboxid;
         [ntextid, target_dict] = this._newTextNode(String(value), target_dict)
        let node_list = [ntextid];
        [nlineid, target_dict] = this._newLineNode(node_list, target_dict);
        let line_list = [nlineid];
        [vboxid, target_dict] = this._newDataBoxNode(line_list, false, target_dict);
        target_dict = this.changeNodeAndReturn(vboxid, "name", String(name), target_dict);
        return [vboxid, target_dict]
    },

    _newTurtleShape(target_dict={}) {
        const tw = 11;
        const th = 15;
        const turtleColor = 0x008000;
        let shape_boxid;
        [shape_boxid, target_dict] = this._newGraphicsBox([], target_dict);
        let tshape = <Triangle tw={tw} th={th} tcolor={turtleColor}/>;
        target_dict = this._changeNodeMultiAndReturn(shape_boxid,
            {name: "shape", graphics_fixed_width: 50, graphics_fixed_height: 50, drawn_components: [tshape]},
            target_dict)

        return [shape_boxid, target_dict]
    },

    _newSvgTurtleShape(target_dict={}) {
        const tw = 11;
        const th = 15;
        const turtleColor = 0x008000;
        let shape_boxid;
        [shape_boxid, target_dict] = this._newSvgGraphicsBox(target_dict);
        let tshape = <SvgTriangle width={tw} height={th} fill={turtleColor}/>;
        target_dict = this._changeNodeMultiAndReturn(shape_boxid,
            {name: "shape", graphics_fixed_width: 50, graphics_fixed_height: 50, drawn_components: [tshape]},
            target_dict)

        return [shape_boxid, target_dict]
    },

    _newSpriteBox(use_svg=false, target_dict={}) {
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

        let tid, vid;
        [tid, target_dict] = this._newTextNode(" ", target_dict)
        let main_node_list = [tid];
        for (let param of main_params) {
            [tid, target_dict] = this._newTextNode(" ", target_dict);
            [vid, target_dict] = this._newValueBox(param, param_dict[param], target_dict);
            main_node_list.push(vid);
            main_node_list.push(tid)
        }

        let tshape;
        if (use_svg) {
            [tshape, target_dict] = this._newSvgTurtleShape(target_dict)
        }
        else {
            [tshape, target_dict] = this._newTurtleShape(target_dict)
        }
        main_node_list.push(tshape);
        [tid, target_dict] = this._newTextNode(" ", target_dict);
        main_node_list.push(tid)

        let main_lineid;
        [main_lineid, target_dict] = this._newLineNode(main_node_list, target_dict);

        [tid, target_dict] = this._newTextNode(" ", target_dict)
        let closet_node_list = [tid];
        for (let param of closet_params) {
            [tid, target_dict] = this._newTextNode(" ", target_dict);
            [vid, target_dict] = this._newValueBox(param, param_dict[param], target_dict);
            closet_node_list.push(vid);
            closet_node_list.push(tid)
        }
        [tid, target_dict] = this._newTextNode(" ", target_dict);
        closet_node_list.push(tid)

        let penColorBoxid;
        [penColorBoxid, target_dict] = this._newColorBox("0 0 0", target_dict);
        target_dict = this.changeNodeAndReturn(penColorBoxid, "name", "penColor", target_dict)
        closet_node_list.push(penColorBoxid);

        let closet_lineid
        [closet_lineid, target_dict] = this._newLineNode(closet_node_list, target_dict);
        target_dict = this.changeNodeAndReturn(closet_lineid, "amCloset", true, target_dict)
        target_dict = this._renumberNodes(closet_lineid, target_dict);

        let line_list = [main_lineid];
        for (let lnodeid of line_list) {
            target_dict = this.changeNodeAndReturn(lnodeid, "parent", uid, target_dict)
            target_dict = this._renumberNodes(lnodeid, target_dict)
        }
        target_dict = this.changeNodeAndReturn(closet_lineid, "parent", uid, target_dict)


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
            unique_id: uid

        };

        let newsnode = new SpriteNode(new_node_params)
        target_dict = this._createEntryAndReturn(newsnode, target_dict)
        target_dict = this._renumberLines(uid, target_dict)
        return [uid, target_dict]
    },

    _newTurtleBox(target_dict={}) {
        let spriteid;
        [spriteid, target_dict] = this._newSpriteBox(false, target_dict);
        target_dict = this.changeNodeAndReturn(spriteid, "transparent", true, target_dict);
        let node_list = [spriteid];
        let new_lineid;
        [new_lineid, target_dict] = this._newLineNode(node_list, target_dict);
        let line_list = [new_lineid];
        target_dict = this._healLine(new_lineid, false, target_dict);

        let new_nodeid;
        [new_nodeid, target_dict] = this._newGraphicsBox(line_list, target_dict);
        for (let lnodeid of target_dict[new_nodeid].line_list) {
            target_dict[lnodeid].parent = new_nodeid;
        }
        target_dict = this.changeNodeAndReturn(new_nodeid, "transparent", true, target_dict);
        return [new_nodeid, target_dict]
    },

    _newSvgTurtleBox(target_dict={}) {
        let spriteid;
        [spriteid, target_dict] = this._newSpriteBox(true, target_dict);
        target_dict = this.changeNodeAndReturn(spriteid, "transparent", true, target_dict);
        let node_list = [spriteid];
        let new_lineid;
        [new_lineid, target_dict] = this._newLineNode(node_list, target_dict);
        let line_list = [new_lineid];
        target_dict = this._healLine(new_lineid, false, target_dict);
        let new_nodeid;
        [new_nodeid, target_dict] = this._newSvgGraphicsBox(line_list, target_dict);
        for (let lnodeid of target_dict[new_nodeid].line_list) {
            target_dict[lnodeid].parent = new_nodeid;
        }
        target_dict = this.changeNodeAndReturn(new_nodeid, "transparent", true, target_dict);
        return [new_nodeid, target_dict]
    },

    _newHtmlBoxNode(the_code=null, target_dict={}){
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
            focusNameTag: false,
            closed: false,
            setFocus: null,
        };
        target_dict = this._createEntryAndReturn(new_node, target_dict)
        return [uid, target_dict]
    },

    _newJsBoxNode(the_code=null, target_dict={}){
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
            focusNameTag: false,
            closed: false,
            setFocus: null,
        };
        target_dict = this._createEntryAndReturn(new_node, target_dict)
        return [uid, target_dict]
    },

    _nodeCreators() {
        return {
            jsbox: (new_id)=>{return this._newJsBoxNode(null, new_id)},
            htmlbox: (new_id)=>{return this._newHtmlBoxNode(null, new_id)},
            text: (new_id)=>{return this._newTextNode("", new_id)},
            doitbox: (new_id)=>{return this._newDoitBoxNode([], new_id)},
            databox: (new_id)=>{return this._newDataBoxNode([], false, new_id)},
            sprite: (new_id)=>{return this._newSpriteBox(false, new_id)},
            graphics: (new_id)=>{return this._newGraphicsBox([], new_id)},
            svggraphics: (new_id)=>{return this._newSvgGraphicsBox([], new_id)},
            line: (new_id)=>{return this._newLineNode([], new_id)},
            color: (new_id)=>{return this._newColorBox(null, new_id)},
            port: (new_id)=>{return this._newPort(null, new_id)},
            turtlebox: this._newTurtleBox,
            svgturtlebox: this._newSvgTurtleBox
        }
    },

    _nodeModels() {
        return {
            jsbox: (new_id)=>{return this._newJsBoxNode(null, new_id)},
            htmlbox: (new_id)=>{return this._newHtmlBoxNode(null, new_id)},
            text: (new_id)=>{return this._newTextNode("", new_id)},
            doitbox: (new_id)=>{return this._newDoitBoxNode([], new_id)},
            databox: (new_id)=>{return this._newDataBoxNode([], false, new_id)},
            sprite: (new_id)=>{return this._newSpriteBox(false, new_id)},
            graphics: (new_id)=>{return this._newGraphicsBox([], new_id)},
            svggraphics: (new_id)=>{return this._newSvgGraphicsBox([], new_id)},
            line: (new_id)=>{return this._newLineNode([], new_id)},
            color: (new_id)=>{return this._newColorBox(null, new_id)},
            port: (new_id)=>{return this._newPort(null, new_id)},
        }
    }

}