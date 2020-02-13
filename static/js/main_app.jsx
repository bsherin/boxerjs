

import React from "react";
import * as ReactDOM from 'react-dom'
import PropTypes from 'prop-types';
import io from 'socket.io-client';
import _ from 'lodash';

import "../css/boxer.scss";

import {doBinding, guid} from "./utilities.js";
import {DataBox} from "./nodes.js";

// update
function postAjax(target, data, callback) {
    if (target[0] == "/") {
        target = target.slice(1)
    }
    $.ajax({
        url: $SCRIPT_ROOT + "/" + target,
        contentType: 'application/json',
        type: 'POST',
        async: true,
        data: JSON.stringify(data),
        dataType: 'json',
        success: callback
    });
}

let tsocket = null;

function _main_main() {
    console.log("entering start_post_load");
    tsocket = new BoxerSocket("boxer", 5000);
    postAjax("get_data", {}, got_data);
    let domContainer = document.querySelector('#main-root');
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
        let nobj = _.cloneDeep(props.data);
        this.state.base_node = this._initDataObject(nobj, null, 0)
    }

    _renumberNodes(node_list) {
        let counter = 0;
        for (let node of node_list) {
            node["position"] = counter;
            counter += 1
        }
    }

    _insertNode(new_node, line_id, position, new_base=null, update=true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let parent_line = this._getMatchingNode(line_id, new_base);
        new_node.parent= line_id;
        parent_line.node_list.splice(position, 0, new_node);
        this._renumberNodes(parent_line.node_list);
        if (update) {
            this.setState({base_node: new_base})
        }
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

    _splitText(text_id, separator, new_base=null, update=true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let mnode = this._getMatchingNode(text_id, new_base);
        let text_split = mnode.the_text.split(separator);
        let new_node = this._newTextNode(text_split[1]);
        mnode.the_text = text_split[0];
        this._insertNode(new_node, mnode.parent, mnode.position + 1, new_base, false);
        if (update) {
            this.setState({base_node: new_base})
        }
    }

    _splitTextAtPosition(text_id, cursor_position, new_base=null, update=true) {
        if (new_base == null) {
            new_base = _.cloneDeep(this.state.base_node);
        }
        let mnode = this._getMatchingNode(text_id, new_base);
        if ((cursor_position == 0) || (cursor_position == mnode.the_text.length)) {
            return
        }
        let text_split = [mnode.the_text.slice(0, cursor_position), mnode.the_text.slice(cursor_position,)];
        let new_node = this._newTextNode(text_split[1]);
        mnode.the_text = text_split[0];
        this._insertNode(new_node, mnode.parent, mnode.position + 1, new_base, false);
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
        let new_node = this._newDataBoxNode();
        this._insertNode(new_node, mnode.parent, mnode.position + 1, new_base, false)
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
        this._insertLine(new_line, the_line.parent, position + 1, new_base, false)
        if (update) {
            this.setState({base_node: new_base})
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
            parent: null
        };
        return new_node
    }

    _newLineNode(node_list=[]) {
        let uid = guid();
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
        let node_list = [this._newTextNode(" ")];

        let uid = guid();
        let lnode = this._newLineNode(node_list);
        lnode.parent = uid;
        let new_line = {kind: "databox",
                        key: uid,
                        parent: null,
                        position: 0,
                        line_list: [lnode],
                        closed: false,
                        unique_id: uid};
        return new_line
    }


    _handleTextChange(uid, new_html) {
        let re = /(.*)?<br>(.*)/;
        let new_base = _.cloneDeep(this.state.base_node);
        let split_node = re.test(new_html);
        let mnode = this._getMatchingNode(uid, new_base);
        if (mnode) {

            if (split_node) {
                let pos = mnode.position;
                let linid = mnode.parent;
                mnode.the_text = new_html;
                this._splitText(uid, "<br>", new_base, false);
                this._splitLine(linid, pos + 1, new_base, false);
                this.setState({base_node: new_base})
            }
            else {
                mnode.the_text = new_html;
                this.setState({base_node: new_base})
            }
        }
    }

    _changeNode(uid, param_name, new_val) {
         let new_base = _.cloneDeep(this.state.base_node);
         let mnode = this._getMatchingNode(uid, new_base);
         if (mnode) {
             mnode[param_name] = new_val;
             this.setState({base_node: new_base})
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

    _initDataObject(nobj, parent, position) {
        if (!nobj.hasOwnProperty("unique_id")) {
            nobj.unique_id = guid();
            nobj.position = position
        }
        nobj.parent = parent;
        if (nobj.kind == "databox") {
            let lcount = 0;
            if (!nobj.hasOwnProperty("close")) {
                nobj.closed = false;
            }
            for (let lin of nobj.line_list) {
                if (!lin.hasOwnProperty("unique_id")) {
                    lin.unique_id = guid();
                    lin.position = lcount;
                }
                lin.parent = nobj.unique_id;
                let ncount = 0;
                for (let node of lin.node_list) {
                    this._initDataObject(node, lin.unique_id, position=ncount);
                    ncount += 1
                }
                lcount += 1;
            }
        }
        return nobj
    }

    render() {
        return (
            <DataBox name="world"
                     handleTextChange={this._handleTextChange}
                     changeNode={this._changeNode}
                     insertDataBox={this._insertDataBoxinText}
                     closed={false}
                     unique_id={this.state.base_node.unique_id}
                     line_list={this.state.base_node.line_list}/>
        )
    }
}

MainApp.propTypes = {
    data: PropTypes.object
};


class BoxerSocket {

    constructor (name_space, retry_interval) {

        this.name_space = name_space;
        this.recInterval = null;
        this.retry_interval = retry_interval;
        this.connectme();
        this.initialize_socket_stuff();
        this.watchForDisconnect();
    }

    connectme() {
        var protocol = window.location.protocol;
        this.socket = io.connect(`${protocol}//${document.domain}:${location.port}/${this.name_space}`);
    }

    initialize_socket_stuff() {
        this.socket.emit('join', {"room": "boxer_world"});
    }

    watchForDisconnect() {
        let self = this;
        this.socket.on("disconnect", function () {
            doFlash({"message": "lost server connection"});
            self.socket.close();
            self.recInterval = setInterval(function () {
                self.attemptReconnect();
            }, self.retry_interval)
        });
    }
    attemptReconnect() {
        if (this.socket.connected) {
            clearInterval(this.recInterval);
            this.initialize_socket_stuff();
            this.watchForDisconnect();
            doFlash({"message": "reconnected to server"})
        }
        else {
            this.connectme()
        }
    }
}

_main_main();

