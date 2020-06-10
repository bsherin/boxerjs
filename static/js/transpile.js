
import _ from "lodash";
import {boxer_statements, operators, isOperator, isBoxerStatement} from "./boxer_lang_definitions.js"
import {guid} from "./utilities.js";
import {container_kinds, data_kinds, graphics_kinds} from "./shared_consts.js";
import {_getMatchingNode} from "./mutators.js";

export {insertVirtualNode, _createLocalizedFunctionCall, _convertFunctionNode, getPortTarget, makeChildrenNonVirtual,
    findNamedBoxesInScope, dataBoxToValue, boxObjectToValue, findNamedNode}


// This is the first thing called to begin processing of either a single line executed
// from the interface or a tell statement
// It creates a temporary doit node, wrapped around the line of code, then inserts it
// as a virtual doit node in the hierarchy.
function _createLocalizedFunctionCall(the_code_line, box_id, ports=null) {
    let temp_dict = {};
    let local_code_line_id, _tempDoitNodeId;
    [local_code_line_id, window.virtualNodeDict] = window.cloneNode(the_code_line.unique_id, null, window.virtualNodeDict, true);
    [_tempDoitNodeId, window.virtualNodeDict] = window.newDoitNode([local_code_line_id], window.virtualNodeDict);
    window.virtualNodeDict[_tempDoitNodeId].name = "_tempFunc";
    window.virtualNodeDict[_tempDoitNodeId].virtual = true
    let _inserted_start_node = insertVirtualNode(_tempDoitNodeId, box_id);
    _inserted_start_node.ports = ports
    return _inserted_start_node
}

// This takes a doit node, and transpiles it to javascript
// Then the result javascript is attached to the node in raw_func
// This is called from getBoxValue, when it tries to execute the doitBox but doesn't find raw_func already there.
function _convertFunctionNode(doitNode) {
    try {

        let [_named_nodes, current_turtle_id] = findNamedBoxesInScope(doitNode, window.virtualNodeDict);

        // Identify the types of the named boxes found
        // Get the arguments needed for each doit and jsbox
        let context = preprocessNamedBoxes(_named_nodes, window.virtualNodeDict);
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
            let new_node;
            [new_node_id, window.virtualNodeDict] = window.newDataBoxNode([], false, window.virtualNodeDict);
            let inserted_node = window.virtualNodeDict[new_node_id];
            inserted_node.name = input_name;
            insertVirtualNode(new_node_id, doitNode.unique_id);
            context.local_var_nodes[input_name] = inserted_node.unique_id;
        }

        // Add virtual ports corresponding to ports attached to this doit node
        // This is a mechanism for getting input arguments into tells
        if (doitNode.hasOwnProperty("ports") && doitNode.ports) {
            for (let portname in doitNode.ports) {
                let new_port_id = window.newPort(doitNode.ports[portname], window.virtualNodeDict);
                let inserted_port = window.virtualNodeDict[new_port_id]
                inserted_port.name = portname
                insertVirtualNode(new_port_id, doitNode.unique_id)
                context.data_boxes[portname] = inserted_port
            }
        }

        // Find all called doit boxes and copy them locally
        // Then recursively call this function to convert them
        let called_doits = findCalledDoits(doitNode, window.virtualNodeDict, context);
        let called_doit_string = "";
        context.copied_doits = {};

        for (let called_doit of called_doits) {
            if (called_doit.node.parent == doitNode.unique_id) {
                continue
            }
            let vnode = called_doit.node;
            insertVirtualNode(vnode.unique_id, doitNode);
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
        let title = `Error transpiling doit box '${doitNode.name}'`;
        window.addErrorDrawerEntry({title: title, content: `<pre>${error}\n${error.stack}</pre>`})

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
                node = getPortTarget(node, base_node)
            }
            if (container_kinds.includes(node.kind) && node.transparent) {
                let [sub_names, sub_nodes, new_current_turtle_id] = getContainedNames(node, node_dict, name_list.concat(new_names), current_turtle_id);
                new_names = new_names.concat(sub_names);
                new_nodes = new_nodes.concat(sub_nodes);
                current_turtle_id = new_current_turtle_id
            }

        }
    }
    return [new_names, new_nodes, current_turtle_id]
}


function insertVirtualNode(nodeToInsertId, boxToInsertInId) {
    let boxToInsertIn = window.virtualNodeDict[boxToInsertInId];
    let cline_id;
    if (!boxToInsertIn.closetLine) {
        [cline_id, window.virtualNodeDict] = window.newClosetLine(window.virtualNodeDict);
        window.virtualNodeDict[cline_id].parent = boxToInsertInId;
        boxToInsertIn.closetLine = cline_id;
    }
    else {
        cline_id = boxToInsertIn.closetLine;
    }
    window.virtualNodeDict[nodeToInsertId].parent = window.virtualNodeDict[cline_id].unique_id;
    window.virtualNodeDict[cline_id].node_list.push(nodeToInsertId);
    window.virtualNodeDict = window.healLine(cline_id, false, window.virtualNodeDict)

    makeChildrenVirtual(nodeToInsertId);

    return window.virtualNodeDict[nodeToInsertId]
}

function makeChildrenVirtual(node_id) {
    let node = window.virtualNodeDict[node_id];
    if (container_kinds.includes(node.kind)) {
        for (let line_id of node.line_list) {
            let the_line = window.virtualNodeDict[line_id];
            the_line.virtual = true;
            for (let lnode_id of the_line.node_list) {
                window.virtualNodeDict[lnode_id].virtual = true;
                makeChildrenVirtual(lnode_id)
            }
        }
        if (node.closetLine) {
            node.closetLine.virtual = true;
            for (let lnode_id of node.closetLine.node_list) {
                window.virtualNodeDict[lnode_id].virtual= true;
                makeChildrenVirtual(lnode_id)
            }
        }
    }
}

function makeChildrenNonVirtual(lin_id, nd) {
    let the_line = nd[lin_id];
    for (let nd_id in the_line.node_list) {
        let anode = temp_dict[nd_id];
        if (container_kinds.includes(anode.kind)) {
            for (let line_id of anode.line_list) {
                aline = nd[line_id];
                aline.virtual = false;
            }
            if (anode.closetLine) {
                nd[anode.closetLine].virtual = false;
                makeChildrenNonVirtual(anode.closetLine, nd)
            }
        }
    }

}


// Finds doit boxes that are called
// The names are adjusted if we have a portal to a doit box
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
                    called_doit.node.name = token;  // In portal case these won't be the same
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
        let inserted_node = convertTell(token_list, context)
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
    let start_node = window.virtualNodeDict[starting_id];
    let [named_nodes, tid] = findNamedBoxesInScope(start_node, window.virtualNodeDict);
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
        [node_id, window.virtualNodeDict] = window.newTextNode(token_list[2], window.virtualNodeDict);
        the_node = window.virtualNodeDict[node_id]
    }
    let the_code_line_id, the_code_line;
    [the_code_line_id, window.virtualNodeDict] = window.newLineNode([node_id]);
    the_code_line = window.virtualNodeDict[the_code_line_id];
    let _inserted_start_node = _createLocalizedFunctionCall(the_code_line, box_id, context.local_var_nodes);

    return _inserted_start_node
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
    let nd = window.virtualNodeDict;

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
                first_token = JSON.stringify(first_node);
            }
        }
        else {
            first_token = JSON.stringify(first_node);
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

// This is for consuming a statement list that appear as an argument
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

// function jsBoxToString(jsbox, alt_name) {
//     let var_name;
//     if (alt_name == null) {
//         var_name = jsbox.name
//     }
//     else {
//         var_name = alt_name
//     }
//     return `
//     async function ${var_name} {${jsbox.the_code}}
//     `
// }
//
// // not used
// function boxObjectToString(dbox, alt_name=null) {
//     let var_name;
//     if (alt_name == null) {
//         var_name = dbox.name
//     }
//     else {
//         var_name = alt_name
//     }
//     let dbstring = JSON.stringify(dbox);
//     return `var ${var_name} = ${dbstring}`
// }

function boxObjectToValue(dbox) {
    let dbstring = JSON.stringify(dbox);
    let cdbstring = null;
    eval("cdbstring = " + dbstring)
    return cdbstring
}

function dataBoxToValue(dbox) {
    let nd = window.virtualNodeDict;
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


// // this doesn't seem to be used
// function dataBoxToString(dbox, alt_name=null) {
//     let var_name;
//     if (alt_name == null) {
//         var_name = dbox.name
//     }
//     else {
//         var_name = alt_name
//     }
//     if (dbox.line_list.length == 1){
//         let the_line = dbox.line_list[0];
//         if (the_line.node_list.length == 1) {
//             let the_text = the_line.node_list[0].the_text.trim();
//             if (!the_text) {
//                 return `var ${var_name} = null`
//             }
//             if (isNaN(the_text)) {
//                 return `var ${var_name} = "${the_text}"`
//             }
//             else {
//                 return `var ${var_name} = ${the_text}`
//             }
//         }
//         else {
//             return boxObjectToString(dbox, var_name)
//         }
//     }
//     else {
//         return boxObjectToString(dbox, var_name)
//     }
// }


function getPortTarget(portNode, node_dict) {
    if (portNode.target == null) return null;
    let targetNode = node_dict(portNode.target);
    return targetNode
}

function extractArgs(doitBoxNode) {
    let first_tokenized = tokenizeLine(doitBoxNode.line_list[0], window.virtualNodeDict);
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