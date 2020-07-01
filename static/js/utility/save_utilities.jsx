import React from "react";

import {_getContainingGraphicsBox} from "../redux/selectors";
import {container_kinds} from "../shared_consts";
import {shape_classes} from "../pixi_shapes";
import {svg_shape_classes} from "../svg_shapes";
import {SpriteNode} from "../sprite_commands";
import {GraphicsNode} from "../graphics_box_commands";


const node_classes = {
    "sprite": SpriteNode,
    "graphics": GraphicsNode,
    "svggraphics": GraphicsNode
}

export {_dehydrateComponents, _rehydrateComponents, convertLegacySave}

function _dehydrateComponents(ndict) {
    for (let nd_id in ndict) {
        let nd = ndict[nd_id];
         if (nd.kind == "graphics") {
            nd.component_specs = [];
            for (let comp of nd.drawn_components) {
                let new_spec = {type: comp.type, props: comp.props};
                nd.component_specs.push(new_spec)
            }
            nd.drawn_components = [];
        }
        else if (nd.kind == "svggraphics"){
            nd.component_specs = [];
            for (let comp of nd.drawn_components) {
                let new_spec = {type: comp.type.type_name, props: comp.props};
                nd.component_specs.push(new_spec)
            }
            nd.drawn_components = [];
        }
        else if (nd.kind == "sprite") {
            let cgb = _getContainingGraphicsBox(nd.unique_id, ndict)
             let use_svg = cgb && cgb.kind == "svggraphics"
             nd.component_specs = []
             for (let comp of nd.sparams.shape_components) {
                 let new_spec;
                 if (use_svg) {
                     new_spec = {type: comp.type.type_name, props: comp.props};
                 }
                 else {
                    new_spec = {type: comp.type, props: comp.props};
                 }

                nd.component_specs.push(new_spec)
            }
            nd.sparams.shape_components = [];
         }
    }
}

function convertLegacySave(base_node) {
    base_node.unique_id = "world";

    return convertNode(base_node, {})

    function convertNode(the_node, ndict) {
        if (container_kinds.includes(the_node.kind)) {
            let llist = [];
            for (let line of the_node.line_list) {
                llist.push(line.unique_id)
                ndict = convertNode(line, ndict)
            }
            the_node.line_list = llist;
            if (the_node.closetLine) {
                let saved_id = the_node.closetLine.unique_id;
                ndict = convertNode(the_node.closetLine, ndict);
                the_node.closetLine = saved_id;
            }

        } else if (the_node.kind == "line") {
            let nlist = [];
            for (let nd of the_node.node_list) {
                nlist.push(nd.unique_id);
                ndict = convertNode(nd, ndict)
            }
            the_node.node_list = nlist
        }
        ndict[the_node.unique_id] = the_node
        return ndict
    }
}

function _rehydrateComponents(ndict) {
    for (let nd_id in ndict) {
        let nd = ndict[nd_id];
        if (node_classes.hasOwnProperty(nd.kind)) {
            ndict[nd_id] = new node_classes[nd.kind](nd)
            nd = ndict[nd_id]
        }
        if (nd.kind == "graphics") {
            nd["drawn_components"] = [];
            if (nd.hasOwnProperty("component_specs")) {
                for (let comp of nd.component_specs) {
                    let Dcomp = shape_classes[comp.type];
                    let new_comp = <Dcomp {...comp.props}/>;
                    nd.drawn_components.push(new_comp)
                }
                nd.component_specs = [];
            }
        }
        else if (nd.kind == "svggraphics") {
            nd["drawn_components"] = [];
            if (nd.hasOwnProperty("component_specs")) {
                for (let comp of nd.component_specs) {
                    let Dcomp = svg_shape_classes[comp.type];
                    let new_comp = <Dcomp {...comp.props}/>;
                    nd.drawn_components.push(new_comp)
                }
                nd.component_specs = [];
            }
        }
        else if (nd.kind == "sprite") {
            if (!nd.hasOwnProperty("sparams")) {
                nd.sparams = {}
            }
            else {
                nd.sparams["shape_components"] = [];
                let cgb = _getContainingGraphicsBox(nd.unique_id, ndict)
                let use_svg = cgb && cgb.kind == "svggraphics"
                if (nd.hasOwnProperty("component_specs")) {
                    for (let comp of nd.component_specs) {
                        let Dcomp;
                        if (use_svg) {
                            Dcomp = svg_shape_classes[comp.type];
                        }
                        else {
                            Dcomp = shape_classes[comp.type];
                        }

                        let new_comp = <Dcomp {...comp.props}/>;
                        nd.sparams.shape_components.push(new_comp)
                    }
                    nd.component_specs = [];
                }
            }

        }
    }
}