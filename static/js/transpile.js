
import _ from "lodash";


import {boxer_statements, operators, isOperator, isBoxerStatement} from "./boxer_lang_definitions.js"
import {container_kinds, data_kinds} from "./shared_consts.js";

import {guid} from "./utilities.js";

import {cloneLineToStore, cloneNodeToStore} from "./actions/composite_actions";
import {changeNode, changeNodeMulti} from "./actions/core_actions.js";
import {newDoitBoxNode, newDataBoxNode, newPort, newTextNode, newLineNode} from "./actions/node_creator_actions.js";
import {insertVirtualNode} from "./vnd_mutators.js";

export {_createLocalizedFunctionCall, _convertFunctionNode, getPortTarget,
    findNamedBoxesInScope, dataBoxToValue, boxObjectToValue, findNamedNode}

var vndict = ()=>{return window.vstore.getState().node_dict}

// This is the first thing called to begin processing of either a single line executed
// from the interface or a tell statement
// It creates a temporary doit node, wrapped around the line of code, then inserts it
// as a virtual doit node in the hierarchy.
function _createLocalizedFunctionCall(the_code_line, box_id, ports=null, use_virtual_source=false) {
    let line_source;
    if (use_virtual_source) {
        line_source = vndict();
    }
    else {
        line_source = window.store.getState().node_dict;
    }
    let local_code_line_id = guid();
    window.vstore.dispatch(cloneLineToStore(the_code_line.unique_id, line_source, local_code_line_id));
    let _tempDoitNodeId = guid();
    window.vstore.dispatch(newDoitBoxNode([local_code_line_id], _tempDoitNodeId))
    window.vstore.dispatch(changeNodeMulti(_tempDoitNodeId, {name: "_tempFunc", virtual: true, ports: ports}));
    window.vstore.dispatch(insertVirtualNode(_tempDoitNodeId, box_id));
    return _tempDoitNodeId
}

class TranspileError extends Error {
    constructor(doit_name = "Transpile Error", body = "", ...params) {
        super(...params)
        this.title = `Error transpiling doit box '${doit_name}'`;
        this.body = body;
    }
}

// This takes a doit node, and transpiles it to javascript
// Then the result javascript is attached to the node in raw_func
// This is called from getBoxValue, when it tries to execute the doitBox but doesn't find raw_func already there.
function _convertFunctionNode(doitNode) {
    try {

        let [_named_nodes, current_turtle_id] = findNamedBoxesInScope(doitNode, vndict());

        // Identify the types of the named boxes found
        // Get the arguments needed for each doit and jsbox
        let context = preprocessNamedBoxes(_named_nodes, vndict());
        context.doitId = doitNode.unique_id;

        // Get the input names for the box we're converting
        let arglist = context.doit_boxes[doitNode.name].args;
        let input_names = [];
        for (let arg of arglist) {
            input_names.push(arg[0])
        }
        let converted_body;
        context.local_var_nodes = {}
        doitNode.input_names = input_names;
        context.input_names = input_names;

        // Insert virtual data boxes for each input
        // This makes them easy to refer to
        let inserted_lines = 0;
        for (let input_name of input_names) {
            let new_node_id = guid();
            window.vstore.dispatch(newDataBoxNode([], false, new_node_id));
            window.vstore.dispatch(changeNode(new_node_id, "name", input_name));
            window.vstore.dispatch(insertVirtualNode(new_node_id, doitNode.unique_id));
            context.local_var_nodes[input_name] = inserted_node.unique_id;
        }

        // Add virtual ports corresponding to ports attached to this doit node
        // This is a mechanism for getting input arguments into tells
        if (doitNode.hasOwnProperty("ports") && doitNode.ports) {
            for (let portname in doitNode.ports) {
                let new_port_id = guid();
                window.vstore.dispatch(newPort(doitNode.ports[portname], new_port_id));
                window.vstore.dispatch(changeNode(new_port_id, "name", portname));
                window.vstore.dispatch(insertVirtualNode(new_port_id, doitNode.unique_id))
                context.data_boxes[portname] = inserted_port
            }
        }

        // Find all called doit boxes and copy them locally
        // Then recursively call this function to convert them
        let called_doits = findCalledDoits(doitNode, vndict(), context);
        let called_doit_string = "";
        context.copied_doits = {};

        for (let called_doit of called_doits) {
            if (called_doit.node.parent == doitNode.unique_id) {
                continue
            }
            let new_doit_id = guid();
            window.vstore.dispatch(cloneNodeToStore(called_doit.node.unique_id, vndict(), new_doit_id))
            window.vstore.dispatch(insertVirtualNode(new_doit_id, doitNode.unique_id));
            // inserted_lines += 1;
            context.copied_doits[called_doit.node.name] = {
                node: vnode,
                args: called_doit.args
            };
        }

        // process remaining lines in doit box we're converting
        // skip new lines added at the end as well as the input line, if there is one.
        // (In the current version, inserted_lines will always be zero.)
        let line_list = doitNode.line_list;
        let endat = line_list.length - inserted_lines;
        if (arglist.length > 0) {
            converted_body = convertStatementList(line_list.slice(1, endat),
                context, true)
        } else {
            converted_body = convertStatementList(line_list.slice(0, endat),
                context, true)
        }

        // Start building the javascript string
        let name_string = `async function (`;
        let first = true;
        for (let arg of doitNode.input_names) {
            if (!first) {
                name_string = name_string + ", ";
            }
            first = false;
            name_string = name_string + arg
        }
        name_string += ")";

        // We need lines to put the input values into the virtual nodes created when the box is run
        let assign_input_string = "";
        for (let arg of doitNode.input_names) {
            let assign_string = `await change("${arg}", ${arg}, "${context.doitId}")\n` ;
            assign_input_string += assign_string
        }

        doitNode.raw_func = `${name_string} {
                let my_node_id = "${doitNode.unique_id}";
                let current_turtle_id = "${current_turtle_id}";
                ${assign_input_string}
                ${converted_body}
            }
        `;
        return
    }
    catch(error) {
        throw new TranspileError(doitNode.name, `${error}`);
        //window.addErrorDrawerEntry({title: title, content: `<pre>${error}\n${error.stack}</pre>`})

    }
}

// finds all of the named boxes starting from startBoxNode
// It also finds the turtle
// StartBoxNode itself is included
// It first looks inside startBoxNode using getContainedNames
// Then it searches outward
function findNamedBoxesInScope(startBoxNode, node_dict, name_list=null, current_turtle_id=null) {
    let named_nodes = [];
    if (!name_list) {
        name_list = []
    }
    if (container_kinds.includes(startBoxNode.kind) || startBoxNode.kind == "port") {
        let [sub_names, sub_nodes, new_current_turtle_id] = getContainedNames(startBoxNode, node_dict, name_list, current_turtle_id);
        name_list = name_list.concat(sub_names);
        named_nodes = named_nodes.concat(sub_nodes);
        current_turtle_id = new_current_turtle_id
    }

    if (startBoxNode.parent == null) {
        return [named_nodes, current_turtle_id]
    }
    let parentLine = node_dict[startBoxNode.parent];
    if (!parentLine) {
        return [named_nodes, current_turtle_id]
    }
    let parentBox = node_dict[parentLine.parent];
    let [new_named_nodes, new_current_turtle_id] = findNamedBoxesInScope(parentBox, node_dict, name_list, current_turtle_id);
    named_nodes = named_nodes.concat(new_named_nodes);
    current_turtle_id = new_current_turtle_id;
    return [named_nodes, current_turtle_id]
}

// This finds all of the named boxes that exist within a given named scope, including itself
// it is called from findNamedBoxesInScope
// It builds lists of the names and nodes found, including a port name and port node
// If theNode is a port then it looks for named nodes inside the port, but ignores the name of the targeted box.
// If it discovers a transparent box then it is called recursively.
function getContainedNames(theNode, node_dict, name_list, current_turtle_id) {

    let new_names = [];
    let new_nodes = [];
    if (theNode.name) {
        if (!current_turtle_id && (theNode.kind == "sprite")) {
                current_turtle_id = theNode.unique_id;
        }
        if ((theNode.kind != "text") && theNode.name) {
            if (!name_list.includes(theNode.name)) {
                new_names.push(theNode.name);
                new_nodes.push(theNode)
            }
        }
    }
    if (theNode.kind == "port") {
        theNode = getPortTarget(theNode, node_dict)
    }

    if (theNode.closetLine) {
        processContainedLine(node_dict[theNode.closetLine])
    }

    if (container_kinds.includes(theNode.kind)) {
        for (let lin_id of theNode.line_list) {
            processContainedLine(node_dict[lin_id])
        }
    }

    function processContainedLine(lin) {
        for (let node_id of lin.node_list) {
            let node = node_dict[node_id];
            if (!current_turtle_id && (node.kind == "sprite")) {
                current_turtle_id = node.unique_id;
            }
            if ((node.kind != "text") && node.name) {
                if (!name_list.includes(node.name) && !new_names.includes(node.name)) {
                    new_names.push(node.name);
                    new_nodes.push(node)
                }
            }
            if (node.kind == "port") {
                node = getPortTarget(node, node_dict)
            }
            if (node && container_kinds.includes(node.kind) && node.transparent) {
                let [sub_names, sub_nodes, new_current_turtle_id] = getContainedNames(node, node_dict, name_list.concat(new_names), current_turtle_id);
                new_names = new_names.concat(sub_names);
                new_nodes = new_nodes.concat(sub_nodes);
                current_turtle_id = new_current_turtle_id
            }

        }
    }
    return [new_names, new_nodes, current_turtle_id]
}


// Finds doit boxes that are called
// The names are adjusted if we have a port to a doit box
function findCalledDoits(doitNode, nd, context, called_doits = []) {
    for (let line_id of doitNode.line_list){
        let line = nd[line_id];
        let tline = tokenizeLine(line_id, nd);
        for (let token of tline) {
            if (typeof(token) == "object") {
                if (token.name == null && token.kind == "doitbox") {
                    called_doits = called_doits.concat(findCalledDoits(token, nd, context, called_doits))
                }
            }
            else {
                if (["tell", "ask"].includes(token))
                    break;
                if (Object.keys(context.doit_boxes).includes(token)) {
                    let called_doit = _.cloneDeep(context.doit_boxes[token]);
                    called_doit.node.name = token;  // In port case these won't be the same
                    called_doits = called_doits.concat(called_doit)
                }
            }
        }
    }
    return called_doits
}

// This handles named boxes that are discovered inside a doit box
// building three dictionaries, indexed by name, data_boxes, doit_boxes, js_boxes
// All data kinds are treated the same way
// If we get a port, then we index by the port name, but put the node context as thevalue
function preprocessNamedBoxes(namedNodes, virtualNodeDict) {
    let doit_boxes = {};
    let data_boxes = {};
    let js_boxes = {};
    for (let node of namedNodes) {
        let name = node.name;
        if (node.kind == "port") {
            node = getPortTarget(node, virtualNodeDict)
        }
        if (data_kinds.includes(node.kind)) {
            data_boxes[name] = node;
        }
        else if (node.kind == "doitbox") {
            let first_tokenized = tokenizeLine(node.line_list[0], virtualNodeDict);
            let arglist;
            if (first_tokenized[0] == "input") {
                arglist = first_tokenized.slice(1,);
            }
            else {
                arglist = []
            }
            let args = [];
            for (let arg of arglist) {
                args.push([arg, "expression"])
            }
            doit_boxes[name] = {
                node: node,
                args: args
            }
        }
        else {  // Assume with have a jsbox
            let re = /(\w+?)\((.*)\)/g;
            let m = re.exec(node.name);
            let fname = m[1];
            let re2 = /(\w+)/g;
            let var_string = m[2];
            let arg_list = m[2].match(re2);
            let args = [];
            for (let arg of arg_list) {
                args.push([arg, "expression"])
            }
            js_boxes[name] = {
                node:node,
                args: args,
            }
        }
    }
    return {
        doit_boxes: doit_boxes,
        data_boxes: data_boxes,
        js_boxes: js_boxes,
    }
}

// Loop over a list of lines converting them
function convertStatementList(line_list, context, return_last_line=false) {
    let nd = window.virtualNodeDict;
    let converted_string = "";
    let counter = 0;
    for (let line_id of line_list) {
        let line = nd[line_id];
        if (line.amCloset) continue;
        let token_list = tokenizeLine(line_id, nd);
        counter += 1;
        let is_last_line = return_last_line && counter == line_list.length;
        converted_string += convertStatementLine(token_list, context, is_last_line) + ";\n"
    }
    return converted_string
}

// convert a tokenized statement
function convertStatementLine(token_list, context, is_last_line=false) {
    if (token_list.length == 0){
        return ""
    }
    let consuming_line = _.cloneDeep(token_list);
    let first_token = consuming_line[0];

    // If the first token is an object, then it cant be the start of a statement or function call
    if ((typeof(first_token) == "object")) {
        if (!first_token.name) { // A raw doit box on the last line
            let lresult = consumeAndConvertNextArgument(consuming_line, context)[0] + ";"
            if (is_last_line) {
                lresult = "\nreturn " + lresult
            }
            return lresult
        }
        return ""
    }

    // If we're here, then we have the start of a statement
    // Figure out how many arguments we need.
    // Tells are treated specially
    let statement_type = getNameType(first_token, context, is_last_line);
    let args;
    if (statement_type == "user_doit") {
        args = context.doit_boxes[first_token].args
    }
    else if (statement_type == "copied_doit") {
        args = context.copied_doits[first_token].args
    }
    else if (statement_type == "user_js") {
        args = context.js_boxes[first_token].args
    }
    else if (statement_type == "boxer_statement"){
        args = boxer_statements[first_token].args
    }
    else if (statement_type == "boxer_tell") {
        let inserted_node_id = convertTell(token_list, context);
        let inserted_node = vndict()[inserted_node_id];
        let call_string = ` await getBoxValue("${inserted_node.name}", "${inserted_node.unique_id}")()`;
        if (is_last_line) {
            call_string = "\nreturn " + call_string;
        }
        return call_string

    }
    else {
        // We've got something that's not recognizable as a statement or function call
        // If it's the last line, we return it, on the assumption that it's a variable name.
        // Otherwise there's nothing we can do with it that will have any effect.
        if (is_last_line) {
            return "\nreturn " + consumeAndConvertNextArgument(token_list, context)[0] + ";"
        }
        else {
            return ""
        }
    }

    // Consume as many arguments we have figured out that we need.
    consuming_line = consuming_line.slice(1, );
    let consume_result;
    let converted_args = [];
    for (let arg of args) {
        if (consuming_line.length == 0) {
            if (isOptional(arg)) {
                break;
            }
            else {
                throw `Not enough arguments for '${first_token}'`
            }
        }
        // Some boxer statements take statement lists as arguments. They are treated specially.
        if (arg[1] != "statement_list") {
            let is_raw = arg[1] == "raw_string"
            consume_result = consumeAndConvertNextArgument(consuming_line, context, is_raw);
            consuming_line = consuming_line.slice(consume_result[1]);
            converted_args.push(consume_result[0])
        }
        else {
            consume_result = consumeAndConvertNextStatementList(consuming_line, context);
            consuming_line = consuming_line.slice(consume_result[1]);
            converted_args.push(consume_result[0])
        }
    }

    // Produce the javascript string for the statement
    let result_string;
    if (statement_type == "user_doit" || statement_type == "user_js" || statement_type == "copied_doit") {
        let arg_string = "";
        let first = true;
        for (let arg of converted_args) {
            if (!first) {
                arg_string = arg_string + ", ";
            }
            first = false;
            arg_string = arg_string + arg
        }
        result_string = ` await getBoxValue("${first_token}", "${context.doitId}")(${arg_string})\n`;

    }
    else {
        result_string = boxer_statements[first_token].converter(converted_args) + "\n"
    }
    if (consuming_line.length > 0) {
        result_string += "\n" + convertStatementLine(consuming_line, context)
    }
    else if (is_last_line) {
        if (statement_type != "boxer_statement" || boxer_statements[first_token].allow_return) {
            result_string = "\nreturn " + result_string + ";"
        }
    }
    return result_string
}

function findNamedNode(name, starting_id) {
    let start_node = vndict()[starting_id];
    let [named_nodes, tid] = findNamedBoxesInScope(start_node, vndict());
    for (let node of named_nodes) {
        if (node.name == name) {
            return node
        }
    }
    return null
}

// For a tell statement, we essentially start the whole thing over again
// We wrap the the statement list in a doit box and insert it in the
// hierarchy in the right location.
function convertTell(token_list, context) {

    // If the target is a port, this case should already be handled correctly in
    // the context built earlier. There's nothing special to do
    let startBox = findNamedNode(token_list[1], context.doitId);
    let box_id = startBox.unique_id;
    let node_id, the_node;
    if (typeof(token_list[2]) == "object") {
        the_node = token_list[2]
        node_id = the_node.unique_id;
    }
    else {
        let node_id = guid();
        window.vstore.dispatch(newTextNode(token_list[2], node_id));
    }
    let the_code_line_id = guid();
    window.vstore.dispatch(newLineNode([node_id], the_code_line_id));
    let the_code_line = vndict()[the_code_line_id];
    let _inserted_start_node_id = _createLocalizedFunctionCall(the_code_line, box_id, context.local_var_nodes, true);

    return _inserted_start_node_id
}

// Identifies the first argument in the given token list and converts it to a javascript string
// It can be a single token, such as a number or variable name, or a box
// It can be multiple tokens, such as a function call
// It can also be multiple tokens consisting of tokens separated by operators.
function consumeAndConvertNextArgument(consuming_line, context, is_raw=false) {
    let first_node = consuming_line[0];
    let first_token;
    let tokens_consumed = 1;
    let new_consuming_line = _.cloneDeep(consuming_line);
    let nd = vndict();

    // If the first token is an object, then it is treated as the next argument in its entirety
    if (typeof(first_node) == "object") {
        if (first_node.kind == "port") {
            first_node = getPortTarget(first_node, nd)
        }
        if (first_node.kind == "doitbox") {
            let fstring = convertStatementList(first_node.line_list, context, true);
            first_token = `await (async ()=>{${fstring}})()\n`
        }
        // If we have a one line databox, then we can attempt to extract the contents as a string or number
        else if (first_node.kind == "databox" && first_node.line_list.length == 1) {
            let first_line = nd[first_node.line_list[0]];
            if (first_line.node_list.length == 1) {
                let the_text = nd[first_line.node_list[0]].the_text.trim();
                if (!the_text) {
                    first_token = '""';
                }
                else if (isNaN(the_text)) {
                    first_token = `"${the_text}"`
                }
                else {
                    first_token =`${the_text}`
                }
            }
            else {
                first_token = JSON.stringify({vid: first_node.unique_id});
            }
        }
        else {
            first_token = JSON.stringify({vid: first_node.unique_id});
        }
        new_consuming_line = new_consuming_line.slice(1,)

    }
    else {
        // if the token is a number, then we convert it just by taking the number as a string.
        if (!isNaN(first_node)) {
            first_token = first_node;
            new_consuming_line = new_consuming_line.slice(1,);
        }
        // If it's not a number, figure out what it is
        else {
            let args;
            let ntype = getNameType(first_node, context);
            // check if variable name
            // If it is, then we call getBoxValue to get the value.
            if (ntype == "user_data" || ntype == "input_name") {
                if (is_raw) {
                    first_token = first_node;
                }
                else{
                    first_token = `getBoxValue("${first_node}", "${context.doitId}")`;
                }

                new_consuming_line = new_consuming_line.slice(1,);
            }
            // If not a variable name, it must be the name of a statement or function call
            else {
                // Figure out how many arguments it needs.
                if (ntype == "user_doit") {
                    args = context.doit_boxes[first_node].args
                } else if (ntype == "boxer_statement") {
                    args = boxer_statements[first_node].args
                }
                else if (ntype == "user_js") {
                    args = context.js_boxes[first_node].args
                }
                new_consuming_line = new_consuming_line.slice(1,);
                let converted_args = [];
                // Consume the required argument
                for (let arg in args) {
                    if (new_consuming_line.length == 0) {
                        if (isOptional(arg))  // Right now this is only the if statement
                            break;
                        else {
                            throw `Not enough arguments for ${first_node}`
                        }
                    }
                    let consume_result = consumeAndConvertNextArgument(new_consuming_line, context);
                    new_consuming_line = new_consuming_line.slice(consume_result[1]);
                    tokens_consumed += consume_result[1];
                    converted_args.push(consume_result[0])
                }
                // Convert the statment to javascript
                if (ntype == "user_doit" || ntype == "user_js" || ntype == "copied_doit") {
                    let arg_string = "";
                    let first = true;
                    for (let arg of converted_args) {
                        if (!first) {
                            arg_string = arg_string + ", ";
                        }
                        first = false;
                        arg_string = arg_string + arg
                    }
                    first_token = ` await getBoxValue("${first_node}", "${context.doitId}")(${arg_string})`;

                }
                else {
                    first_token = boxer_statements[first_node].converter(converted_args)
                }
            }
        }
    }

    // There will be more to do if the next token is an operator
    // If there is, we conver the operator, and then find the next argument
    let result_string = first_token;
    if (new_consuming_line.length > 0) {
        let next_token = new_consuming_line[0];
        if (typeof(next_token) == "string") {
            next_token = next_token.trim();
            if (isOperator(next_token)) {
                result_string += " " + operators[next_token] + " ";
                tokens_consumed += 1;
                if (new_consuming_line.length <= 1) {
                    throw `Not enough arguments for operator '${next_token}'`
                }
                let cresult = consumeAndConvertNextArgument(new_consuming_line.slice(1, ), context);
                tokens_consumed += cresult[1];
                result_string += cresult[0];
            }
        }
    }

    return [result_string, tokens_consumed]
}

// This is for consuming a statement list that appears as an argument
// To a boxer statement that expects a statement list
function consumeAndConvertNextStatementList(consuming_line, context) {
    let first_node = consuming_line[0];
    let first_token;
    let tokens_consumed = 1;
    let new_consuming_line = _.cloneDeep(consuming_line);
    let result_string;

    // The token is a doit box, so we convert the doit box to a string
    if (typeof(first_node) == "object") {
        result_string = convertStatementList(first_node.line_list, context);
        return [result_string, 1]
    }
    // otherwise its a single inline statement that we convert
    else {
        result_string = convertStatementLine(consuming_line, context);
        return [result_string, consuming_line.length]
    }
}


function boxObjectToValue(dbox) {
    let dbstring = JSON.stringify({vid: dbox.unique_id});
    let cdbstring = null;
    eval("cdbstring = " + dbstring)
    return cdbstring
}

function dataBoxToValue(dbox) {
    let nd = vndict();
    if (dbox.line_list.length == 1){
        let the_line = nd[dbox.line_list[0]];
        if (the_line.node_list.length == 1) {
            let the_text = nd[the_line.node_list[0]].the_text.trim();
            if (!the_text) {
                return null
            }
            if (isNaN(the_text)) {
                return the_text
            }
            else {
                return eval(the_text)
            }
        }
        else {
            return boxObjectToValue(dbox)
        }
    }
    else {
        return boxObjectToValue(dbox)
    }
}


function getPortTarget(portNode, node_dict) {
    if (portNode.target == null) return null;
    let targetNode = node_dict[portNode.target];
    return targetNode
}

function extractArgs(doitBoxNode) {
    let first_tokenized = tokenizeLine(doitBoxNode.line_list[0], vndict());
    let arglist;
    if (first_tokenized[0] == "input") {
        arglist = first_tokenized.slice(1,);
    }
    else {
        arglist = []
    }
    let args = [];
    for (let arg of arglist) {
        args.push([arg, "expression"])
    }
    return args
}
let eval_in_place_string = `async function eval_in_place(estring) {
        return eval(estring)
    }
`;

function tokenizeLine(line_id, nd) {
    let line = nd[line_id];
    let token_list = [];
    for (let node_id of line.node_list) {
        let node = nd[node_id]
        if (node.kind == "text") {
            let ttext = node.the_text.trim();
            if (ttext.length != 0) {
                token_list = token_list.concat(ttext.split(" "))
            }
        }
        else {
            token_list.push(node)
        }
    }
    let pruned_list = [];
    for (let token of token_list) {
        if (token != "") {
            pruned_list.push(token)
        }
    }
    return pruned_list
}

function getNameType(token, context, allow_other=false) {
    if (Object.keys(context.doit_boxes).includes(token)) {
        return "user_doit"
    }
    else if (Object.keys(context.copied_doits).includes(token)) {
        return "copied_doit"
    }
    else if (isBoxerStatement(token)) {
        return "boxer_statement"
    }
    else if (Object.keys(context.data_boxes).includes(token)) {
        return "user_data"
    }
    else if (Object.keys(context.js_boxes).includes(token)) {
        return "user_js"
    }
    else if (["tell", "ask"].includes(token)) {
        return "boxer_tell"
    }
    else if (context.input_names.includes(token)) {
        return "input_name"
    }
    else if (allow_other) {
        return "other"
    }
    else {
        throw `Got unknown name '${token}'`;
    }
}

function isOptional(arg) {
    return arg.length == 3 && arg[2] == "optional"
}