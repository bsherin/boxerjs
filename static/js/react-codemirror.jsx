
import React from "react";
import PropTypes from 'prop-types';

export {ReactCodemirror}

class ReactCodemirror extends React.Component {

    constructor(props) {
        super(props);
        if (this.props.code_container_ref) {
            this.code_container_ref = this.props.code_container_ref
        }
        else {
            this.code_container_ref = React.createRef();
        }

        this.handleChange = this.handleChange.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.mousetrap = new Mousetrap();
    }

    createCMArea(codearea, first_line_number = 1) {
        let showLineNumbers;
        if (first_line_number == null) {
            showLineNumbers = false
        }
        else {
            showLineNumbers = true
        }
        let cmobject = CodeMirror(codearea, {
            lineNumbers: showLineNumbers,
            matchBrackets: true,
            highlightSelectionMatches: true,
            autoCloseBrackets: true,
            indentUnit: 4,
            mode: this.props.mode,
            readOnly: this.props.readOnly
        });
        if (first_line_number != 1) {
            cmobject.setOption("firstLineNumber", first_line_number)
        }

        let all_extra_keys = Object.assign(this.props.extraKeys, {
            Tab: function (cm) {
                    let spaces = new Array(5).join(" ");
                    cm.replaceSelection(spaces);
                },
                "Ctrl-Space": "autocomplete"
            }
        );

        cmobject.setOption("extraKeys", all_extra_keys);
        cmobject.setSize(null, "100%");
        cmobject.on("change", this.handleChange);
        cmobject.on("blur", this.handleBlur);
        return cmobject
    }
    
    handleChange(cm, changeObject) {
        this.props.handleChange(cm.getDoc().getValue())
    }

    handleBlur(cm, event) {
        this.props.handleBlur();
    }

    componentDidMount() {
        this.cmobject = this.createCMArea(this.code_container_ref.current, this.props.first_line_number);
        this.cmobject.setValue(this.props.code_content);
        this.create_keymap();
        if (this.props.setCMObject != null) {
            this.props.setCMObject(this.cmobject)
        }
    }

    componentDidUpdate() {
        if (this.props.sync_to_prop) {
            this.cmobject.setValue(this.props.code_content)
        }
        if (this.props.first_line_number != 1) {
            this.cmobject.setOption("firstLineNumber", this.props.first_line_number);
        }
        this.cmobject.refresh()
    }


    searchCM() {
        CodeMirror.commands.find(this.cmobject)
    }

    clearSelections() {
        CodeMirror.commands.clearSearch(this.cmobject);
        CodeMirror.commands.singleSelection(this.cmobject);
    }

    create_keymap() {
        let self = this;
        CodeMirror.keyMap["default"]["Esc"] = function () {self.clearSelections()};
        let is_mac = CodeMirror.keyMap["default"].hasOwnProperty("Cmd-S");

        this.mousetrap.bind(['escape'], function (e) {
            self.clearSelections();
            e.preventDefault()
        });

        if (is_mac) {

            this.mousetrap.bind(['command+l'], function (e) {
                // self.loadModule();
                e.preventDefault()
            });
            this.mousetrap.bind(['command+f'], function (e) {
                self.searchCM();
                e.preventDefault()
            });
        }
        else {

            this.mousetrap.bind(['ctrl+l'], function (e) {
                // self.loadModule();
                e.preventDefault()
            });
            this.mousetrap.bind(['ctrl+f'], function (e) {
                self.searchCM();
                e.preventDefault()
            });
        }
    }

    render() {
        let ccstyle = {
            "height": this.props.code_container_height,
            "width": this.props.code_container_width,
            lineHeight: "21px",
            overflow: "auto"
        };
        return (
            <div id="code-container" style={ccstyle} ref={this.code_container_ref}>

            </div>
        )

    }
}


ReactCodemirror.propTypes = {
    handleChange: PropTypes.func,
    handleBlur: PropTypes.func,
    code_content: PropTypes.string,
    sync_to_prop: PropTypes.bool,
    mode: PropTypes.string,
    saveMe: PropTypes.func,
    readOnly: PropTypes.bool,
    first_line_number: PropTypes.number,
    extraKeys: PropTypes.object,
    setCMObject: PropTypes.func,
    code_container_ref: PropTypes.object,
    code_container_width: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number]),
    code_container_height: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number])
};

ReactCodemirror.defaultProps = {
    first_line_number: 1,
    code_container_height: "100%",
    sync_to_prop: false,
    mode: "python",
    readOnly: false,
    extraKeys: {},
    setCMObject: null,
    code_container_ref: null,
    code_container_width: "100%"
};