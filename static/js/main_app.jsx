

import React from "react";
import * as ReactDOM from 'react-dom'
import PropTypes from 'prop-types';

import _ from 'lodash';

import "../css/boxer.scss";

import {doBinding, guid} from "./utilities.js";
import {DataBox} from "./nodes.js";
import {BoxerNavbar} from "./blueprint_navbar.js";
import {ProjectMenu, BoxMenu} from "./main_menus_react.js";
import {postAjax} from "./communication_react.js"

import {BoxerSocket} from "./boxer_socket.js"
import {KeyTrap} from "./key_trap";
import {getCaretPosition} from "./utilities";

let tsocket = null;

// Prevent capturing focus by the button.
$(document).on('mousedown', "button",
    function(event) {
        event.preventDefault();
    }
);

function _main_main() {
    console.log("entering start_post_load");
    tsocket = new BoxerSocket("boxer", 5000);

    let domContainer = document.querySelector('#main-root');
    if (window._world_name == "") {
        ReactDOM.render(<MainApp data={null}/>,
                domContainer)
    }
    else {
        postAjax("get_data", {}, got_data);
    }
    function got_data(result) {
        if (result.success) {
            ReactDOM.render(<MainApp data={result.data}/>,
                domContainer)
        }
    }
}

class MainApp extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.state = {};
        if (props.data == null) {
            this.state.base_node = this._newDataBoxNode()
            this.state.base_node.name = "world"
        }
        else {
            this.state.base_node = _.cloneDeep(props.data);
        }
        this.state.zoomed_node_id = this.state.base_node.unique_id;
        this.last_focus_id = null;
        this.last_focus_pos = null
    }

    _renumberNodes(node_list) {
        let counter = 0;
        for (let node of node_list) {
            node["position"] = counter;
            counter += 1
        }
    }


    _getMatchingNode(uid, node) {
        if (node.unique_id == uid) {
            return node
        }
        if ((node.kind == "text") || (node.line_list.length == 0)) {
            return false
        }
        for (let lin of node.line_list) {
            if (lin.unique_id == uid) {
                return lin
            }
            for (let nd of lin.node_list) {
                let match = this._getMatchingNode(uid, nd);
                if (match) {
                    return match
                }
            }
        }
        return false
    }

    _splitTextAtPosition(text_id, cursor_position, new_base) {

        let mnode = this._getMatchingNode(text_id, new_base);
        let parent_line = this._getMatchingNode(mnode.parent, new_base);
        let new_node;
        if (cursor_position == 0) {
            new_node = this._newTextNode("");
            new_node.unique_id = text_id;
            mnode.unique_id = guid();
            parent_line.node_list.splice(mnode.position, 0, new_node)

        }
        else if (cursor_position == mnode.the_text.length) {
            new_node = this._newTextNode("");
            parent_line.node_list.splice(mnode.position + 1, 0, new_node)
        }
        else {
            let text_split = [mnode.the_text.slice(0, cursor_position), mnode.the_text.slice(cursor_position,)];
            new_node = this._newTextNode(text_split[1]);
            mnode.the_text = text_split[0];
            parent_line.node_list.splice(mnode.position + 1, 0, new_node);
        }
        new_node.parent = parent_line.unique_id;
        this._renumberNodes(parent_line.node_list);
    }

    _insertLine(new_line, box_id, position, new_base=null, update=true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let parent_box = this._getMatchingNode(box_id, new_base);
        new_line.parent= box_id;
        parent_box.line_list.splice(position, 0, new_line);
        this._renumberNodes(parent_box.line_list);
        if (update) {
            this.setState({base_node: new_base})
        }

    }

    _splitLine(line_id, position, new_base=null, update=true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let the_line = this._getMatchingNode(line_id, new_base);
        let new_node_list = the_line.node_list.slice(position,);
        this._renumberNodes(new_node_list);

        let new_line = this._newLineNode(new_node_list);
        for (let nd of new_node_list) {
            nd.parent = new_line.unique_id
        }
        the_line.node_list = the_line.node_list.slice(0, position);
        this._insertLine(new_line, the_line.parent, the_line.position + 1, new_base, false);
        if (update) {
            this.setState({base_node: new_base})
        }
    }

    _insertNode(new_node, line_id, position, new_base=null, update=true, heal_line=true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let parent_line = this._getMatchingNode(line_id, new_base);
        new_node.parent= line_id;
        parent_line.node_list.splice(position, 0, new_node);
        if (heal_line) {
            this._healLine(parent_line);
        }

        if (update) {
            this.setState({base_node: new_base})
        }
    }

    _splitLineAtTextPosition(text_id, cursor_position, new_base=null, update=true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        this._splitTextAtPosition(text_id, cursor_position, new_base);
        let mnode = this._getMatchingNode(text_id, new_base);
        let pos = mnode.position;
        let linid = mnode.parent;
        let parent_line = this._getMatchingNode(linid, new_base);
        let parent_line_pos = parent_line.position;
        let dbox = this._getMatchingNode(parent_line.parent, new_base);
        this._splitLine(linid, pos + 1, new_base, false);
        dbox.line_list[parent_line_pos + 1].node_list[0].setFocus = 0;

        if (update) {
            this.setState({base_node: new_base})
        }
    }

    _insertDataBoxinText(text_id, cursor_position, new_base=null, update=true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        this._splitTextAtPosition(text_id, cursor_position, new_base, false);
        let mnode = this._getMatchingNode(text_id, new_base);
        let new_node = this._newDataBoxNode([]);
        new_node.line_list[0].node_list[0].setFocus = 0;
        this._insertNode(new_node, mnode.parent, mnode.position + 1, new_base, false);
        if (update) {
            this.setState({base_node: new_base})
        }
    }

    _insertDataBoxLastFocus() {
        this._insertDataBoxinText(this.last_focus_id, this.last_focus_pos)
    }

    _mergeTextNodes(n1, n2, node_list) {
        node_list[n1].the_text = node_list[n1].the_text + node_list[n2].the_text;
        node_list.splice(n2, 1)
    }

    _healLine(line_pointer) {
        let done = false;
        while (!done) {
            this._renumberNodes(line_pointer.node_list);
            done = true;
            for (let i = 0; i < line_pointer.node_list.length - 1; ++i) {
                if ((line_pointer.node_list[i].kind == "text") && (line_pointer.node_list[i + 1].kind == "text")) {
                    this._mergeTextNodes(i, i + 1, line_pointer.node_list);
                    done = false;
                    break
                }
            }
        }
        if (line_pointer.node_list[0].kind == "databox") {
            line_pointer.node_list.splice(0, 0, this._newTextNode(""));
            this._renumberNodes(line_pointer.node_list);
        }
        if (_.last(line_pointer.node_list).kind == "databox") {
            line_pointer.node_list.push(this._newTextNode(""));
            this._renumberNodes(line_pointer.node_list);
        }
        done = false;
        while (!done) {
            this._renumberNodes(line_pointer.node_list);
            done = true;
            for (let i = 0; i < line_pointer.node_list.length - 1; ++i) {
                if ((line_pointer.node_list[i].kind == "databox") && (line_pointer.node_list[i + 1].kind == "databox")) {
                    line_pointer.node_list.splice(i + 1, 0, this._newTextNode(""));
                    done = false;
                    break
                }
            }
        }
    }

    _removeNode(uid, new_base=null, update=true, callback) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let mnode = this._getMatchingNode(uid, new_base);
        let parent_line = this._getMatchingNode(mnode.parent, new_base);
        parent_line.node_list.splice(mnode.position, 1);
        this._healLine(parent_line);
        if (update) {
            this.setState({base_node: new_base}, callback)
        }
    }

    _mergeWithPrecedingLine(second_line, new_base=null, update=true, callback=null) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let dbox = this._getMatchingNode(second_line.parent, new_base);
        let first_line = dbox.line_list[second_line.position - 1];

        first_line.node_list = first_line.node_list.concat(second_line.node_list);
        this._healLine(first_line);
        dbox.line_list.splice(second_line.position, 1);
        this._renumberNodes(dbox.line_list);
        if (update) {
            this.setState({base_node: new_base}, callback)
        }
    }

    _deletePrecedingBox(text_id) {
        let mnode = this._getMatchingNode(text_id, this.state.base_node);
        let parent_line = this._getMatchingNode(mnode.parent, this.state.base_node);
        let focus_node;
        let focus_pos;
        let self = this;
        if (mnode.position == 0) {
            if (parent_line.position != 0) {
                let dbox = this._getMatchingNode(parent_line.parent, this.state.base_node);
                let first_line = dbox.line_list[parent_line.position - 1];
                let preceding_node = _.last(first_line.node_list);

                if (preceding_node.kind == "text") {
                    focus_node = preceding_node.unique_id;
                    focus_pos = preceding_node.the_text.length
                }
                else {
                    focus_node = text_id;
                    focus_pos = 0
                }
                this._mergeWithPrecedingLine(parent_line, null, true, positionCursor)
            }
        }
        else {
            let preceding_node = parent_line.node_list[mnode.position - 1];
            if ((mnode.position - 2) < 0) {
                focus_node = text_id;
                focus_pos = 0
            }
            else {
                let pre_preceding_node = parent_line.node_list[mnode.position - 2];
                if (pre_preceding_node.kind == "text") {
                    focus_node = pre_preceding_node.unique_id;
                    focus_pos = pre_preceding_node.the_text.length
                }
                else {
                    focus_node = text_id;
                    focus_pos = 0
                }
            }

            if (preceding_node.kind == "databox") {
                this._removeNode(preceding_node.unique_id, null, true, positionCursor)
            }
        }

        function positionCursor(){
            self._changeNode(focus_node, "setFocus", focus_pos)
        }
    }

    _newTextNode(the_text=null) {
        let uid = guid();
        let new_node = {
            kind: "text",
            key: uid,
            unique_id: uid,
            position: 0,
            the_text: the_text,
            parent: null,
            setFocus: null,
        };
        return new_node
    }

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
                        unique_id: uid};
        for (let node of node_list) {
            node.parent = uid
        }
        return new_line
    }

    _newDataBoxNode(line_list=[]) {
        let uid = guid();
        if (line_list.length == 0) {
            let node_list = [this._newTextNode(" ")];
            let new_line = this._newLineNode(node_list);
            line_list = [new_line]
        }
        for (let lnode of line_list) {
            lnode.parent = uid;
        }
        let new_box = {kind: "databox",
                        key: uid,
                        name: null,
                        parent: null,
                        focusName: false,
                        am_zoomed: false,
                        position: 0,
                        line_list: line_list,
                        closed: false,
                        unique_id: uid};
        return new_box
    }


    _handleTextChange(uid, new_html) {
        let re = /(.*)?<br>(.*)/;
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(uid, new_base);
        if (mnode) {
                mnode.the_text = new_html;
                this.setState({base_node: new_base})
        }
    }

    _changeNode(uid, param_name, new_val, callback=null) {
         let new_base = _.cloneDeep(this.state.base_node);
         let mnode = this._getMatchingNode(uid, new_base);
         if (mnode) {
             mnode[param_name] = new_val;
             this.setState({base_node: new_base}, callback)
         }
    }


    _initDataObject(nobj, parent, position) {
        if (!nobj.hasOwnProperty("unique_id")) {
            nobj.unique_id = guid();
            nobj.position = position
        }
        nobj.parent = parent;
        if (nobj.kind == "text") {
            nobj.setFocus = null
        }
        else if (nobj.kind == "databox") {
            let lcount = 0;
            if (!nobj.hasOwnProperty("close")) {
                nobj.closed = false;
            }
            nobj.am_zoomed = false;
            nobj.focusName = false;
            for (let lin of nobj.line_list) {
                if (!lin.hasOwnProperty("unique_id")) {
                    lin.unique_id = guid();
                    lin.position = lcount;
                }
                lin.parent = nobj.unique_id;
                let ncount = 0;
                this._healLine(lin);
                for (let node of lin.node_list) {
                    this._initDataObject(node, lin.unique_id, position=ncount);
                    ncount += 1
                }
                lcount += 1;

            }
        }
        return nobj
    }
    
    _getParentId(uid) {
        return this._getMatchingNode(uid, this.state.base_node).parent
    }

    _getNode(uid) {
        return this._getMatchingNode(uid, this.state.base_node)
    }

    _zoomBox(uid) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(uid, new_base);
        mnode.am_zoomed = true;
        this.setState({base_node: new_base, zoomed_node_id: mnode.unique_id})
    }
    _unzoomBox(uid) {
        let new_base = _.cloneDeep(this.state.base_node);
        let mnode = this._getMatchingNode(uid, new_base, new_base);
        if (mnode.parent == null) {
            return
        }
        mnode.am_zoomed = false;

        let found = false;
        while (!found) {
            let parent_id = mnode.parent;
            if (parent_id == null) {
                found = true
            }
            let parent_line = this._getMatchingNode(parent_id, new_base);
            mnode = this._getMatchingNode(parent_line.parent, new_base);
            if (mnode.am_zoomed) {
                found = true
            }
        }
        this.setState({base_node: new_base, zoomed_node_id: mnode.unique_id});
    }

    _storeFocus(uid, position) {
        this.last_focus_id = uid;
        this.last_focus_pos = position
    }

    _insertDataBoxFromKey() {
        this._insertDataBoxinText(document.activeElement.id, getCaretPosition(document.activeElement))
    }

    _focusName() {
        let line_id = this._getParentId(document.activeElement.id);
        let box_id = this._getParentId(line_id);
        let currentName = this._getNode(box_id).name;
        let self = this;
        if (currentName == null) {
            this._changeNode(box_id, "name", "", doFocus)
        }
        else {
            doFocus()
        }

        function doFocus() {
            self._changeNode(box_id, "focusName", true)
        }
    }

    render() {
        let funcs = {
                handleTextChange: this._handleTextChange,
                changeNode: this._changeNode,
                insertDataBox: this._insertDataBoxinText,
                deletePrecedingBox: this._deletePrecedingBox,
                splitLineAtTextPosition: this._splitLineAtTextPosition,
                getParentId: this._getParentId,
                getNode: this._getNode,
                zoomBox: this._zoomBox,
                focusName: this._focusName,
                unzoomBox: this._unzoomBox,
                storeFocus: this._storeFocus,
                insertDataBoxLastFocus: this._insertDataBoxLastFocus
            };
        let menus = (
            <React.Fragment>
                <ProjectMenu {...funcs} world_state={this.props.world_state}
                />
                <BoxMenu {...funcs}
                />
            </React.Fragment>
        );

        this.state.base_node.am_zoomed = true;
        let zoomed_node = this._getMatchingNode(this.state.zoomed_node_id, this.state.base_node);
        let key_bindings = [
            [["ctrl+]"], this._insertDataBoxFromKey],
            [["ctrl+n"], this._focusName]
        ];
        return (
            <React.Fragment>
                <BoxerNavbar is_authenticated={false}
                              user_name="testname"
                              menus={menus}
                />
                <DataBox name={zoomed_node.name}
                         funcs={funcs}
                         focusName={false}
                         am_zoomed={true}
                         closed={false}
                         unique_id={this.state.zoomed_node_id}
                         line_list={zoomed_node.line_list}/>
                 <KeyTrap global={true}  bindings={key_bindings} />
             </React.Fragment>
        )
    }
}

MainApp.propTypes = {
    data: PropTypes.object
};


_main_main();

