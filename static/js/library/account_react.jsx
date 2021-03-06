
import "../../css/tactic.scss";

import React from "react";
import * as ReactDOM from 'react-dom'

import { FormGroup, InputGroup, Button } from "@blueprintjs/core";

import {render_navbar} from "../blueprint_navbar.js";
import {doFlash} from "../utility/toaster.js"
import {postAjax} from "../utility/communication_react.js";

import {doBinding, guid} from "../utility/utilities.js";

window.page_id = guid();

function _account_main() {
    render_navbar("account");
    if (window._show_message) doFlash(window._message);
    let domContainer = document.querySelector('#root');
    ReactDOM.render(<AccountApp/>, domContainer)
}

const field_names = ["new_password", "confirm_new_password"];

class AccountApp extends React.Component {
    constructor(props) {
        super(props);
        doBinding(this);
        this.state = {
        };
        let fields = {};
        for (let field of field_names) {
            fields[field] = ""
        }
        this.state.fields = fields;
        let helper_text = {};
        for (let field of field_names) {
            helper_text[field] = null;
        }
        this.state.helper_text = helper_text
    }

    componentDidMount() {
        postAjax("get_account_info", {}, (data)=> {
                let new_fields = Object.assign({}, this.state.fields);
                let new_helper_text = Object.assign({}, this.state.helper_text);
                for (let field of data.field_list) {
                    new_fields[field.name] = field.val;
                    new_helper_text[field.name] = null
                }
                let new_state = {fields: new_fields, helper_text: new_helper_text};
                this.setState(new_state)
            }
        )
    }

    _onFieldChange(field, value) {
        let new_fields = Object.assign({}, this.state.fields);
        new_fields[field] = value;
        this.setState({fields: new_fields})
    }

     _submit_account_info() {
        let pwd = this.state.fields.new_password;
        let pwd2 = this.state.fields.confirm_new_password;

        if ((pwd == "") || (pwd == "" )) {
            let new_helper_text = Object.assign({}, this.state.helper_text);
            new_helper_text.confirm_new_password = "Passwords cannot be empty";
            this.setState({helper_text: new_helper_text});
            return
        }
        if (pwd != pwd2) {
            let new_helper_text = Object.assign({}, this.state.helper_text);
            new_helper_text.confirm_new_password = "Passwords don't match";
            this.setState({helper_text: new_helper_text});
            return
        }
        let data = {};
        for (let field in this.state.fields) {
            if ((field != "new_password") && (field != "confirm_new_password")) {
                data[field] = this.state.fields[field]
            }
        }

        data.password = pwd;

        postAjax("update_account_info", data, function (result) {
            if (result.success) {
                doFlash({"message": "Account successfully updated", "alert_type": "alert-success"});
            }
            else {
                data.alert_type = "alert-warning";
                doFlash(data);
            }
        })
    }

    render () {
        let field_items = Object.keys(this.state.fields).map((field_name)=>(
            <FormGroup key={field_name}
                          inline={true}
                          style={{padding: 10}}
                              label={field_name}
                              helperText={this.state.helper_text[field_name]}>
                            <InputGroup type="text"
                                           onChange={(event)=>this._onFieldChange(field_name, event.target.value)}
                                           style={{width: 250}}
                                           large={true}
                                           fill={false}
                                           placeholder={field_name}
                                           value={this.state.fields[field_name]}
                                           />
                </FormGroup>
        ));
        let outer_style = {textAlign:"center",
            marginLeft: 50,
            marginTop: 50,
            height: "100%"};
        return (

            <React.Fragment>
                <div className="d-flex flex-column" style={outer_style}>
                    <form onSubmit={e => {
                              e.preventDefault();
                              this._submit_account_info();
                            }}>
                        {field_items}
                     <div className="d-flex flex-row">
                        <Button icon="log-in" large={true} text="Submit" onClick={this._submit_account_info}/>
                     </div>
                    </form>
                </div>
            </React.Fragment>
        )
    }
}

_account_main();