

import React from "react";
import * as ReactDOM from 'react-dom'
import PropTypes from 'prop-types';
import io from 'socket.io-client';

import ContentEditable from 'react-contenteditable'
import ReactDOMServer from 'react-dom/server';

import "../css/boxer.scss";

import {doBinding, isString} from "./utilities.js";

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
        doBinding(this)
    }

    render() {
        return (
            <DataBox data_object={this.props.data}/>
        )
    }
}

MainApp.propTypes = {
    data: PropTypes.object
};

class DataBox extends React.Component {
    constructor (props) {
        super(props);
        doBinding(this);
        this.name = this.props.data_object.name;
        this.content = this.props.data_object.content;
        this.state = {};
        this.state.the_content = this._computeContent()
    }

    _computeContent() {
        let the_content = this.props.data_object.content.map((item, index) => {
            if (isString(item)) {
                return (
                    // <div key={index} style={{display: "inline-block"}}>{item}</div>
                    <ContentEditable className="editable"
                                     tagName="div"
                                     key={index}
                                     disabled={false}
                                     onChange={this._handleChange}
                                     html={item}
                                     />

                )
            }
            else {
                return (
                    <DataBox key={index} data_object={item}/>
                )
            }
        });
        return the_content
    }

    _handleChange(evt) {
        let the_html = evt.target.value;
        console.log(the_html)
    }

    render() {

        return (
            // <ContentEditable className="data-box"
            //       tagName="div"
            //       html={the_html} // innerHTML of the editable div
            //       disabled={false} // use true to disable edition
            //       onChange={this._handleChange} // handle innerHTML change
            //       onBlur={this.sanitize}
            //     />
            <div className="data-box">
                {this.state.the_content}
            </div>
        )
    }
}

DataBox.propTypes = {
    data_object: PropTypes.array
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

