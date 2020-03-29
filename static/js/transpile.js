
import _ from "lodash";
import {boxer_statements, operators, isOperator, isBoxerStatement} from "./boxer_lang_definitions.js"
import {guid} from "./utilities.js";
import {container_kinds, data_kinds, graphics_kinds} from "./shared_consts.js";

export {_convertNamedDoit, insertVirtualNode, _createLocalizedFunctionCall,
    _getMatchingNode, findNamedBoxesInScope}

// This is the first thing called to begin processing of either a single line executed
// from the interface or it can be called to process a tell statement
// It first reates a temporary doit node, wrapped around the line of code, then inserts it
// as a virtual doit node in the hierarchy.
// Then it converts this virtual doit node using _convertNamedDoit
function _createLocalizedFunctionCall(the_code_line, box_id, base_node, root=true) {
    let local_the_code_line = _.cloneDeep(the_code_line);
    let _tempDoitNode = window.newDoitNode([local_the_code_line]);
    _tempDoitNode.name = "_tempFunc";
    let _virtualNodeTree = _.cloneDeep(base_node);
    let _start_node = _getMatchingNode(box_id, _virtualNodeTree);
    let _inserted_start_node = insertVirtualNode(_tempDoitNode, _start_node, _virtualNodeTree);
    let _tempFuncString = _convertNamedDoit(_inserted_start_node, _virtualNodeTree);
    let fname;
    if (root) {
        fname = "_outerFunc";
    }
    else {
        fname = "_tellFunc" + String(window.tell_function_counter);
        window.tell_function_counter += 1;
    }
    let [_named_nodes, current_turtle_id] = findNamedBoxesInScope(_start_node, _virtualNodeTree);
    let global_declarations_string = "";
    for (let _node of _named_nodes) {
        if (_node.name == "world") continue;
        let alt_name = null;
        if (_node.kind == "port") {
            alt_name = _node.name;
            _node = getPortTarget(_node, _virtualNodeTree);
            if (!_node) continue;
        }
        if (_node.kind == "databox") {
            global_declarations_string += "\n" + dataBoxToString(_node, alt_name)
        }
        else if (_node.kind == "jsbox") {
            global_declarations_string += "\n" + jsBoxToString(_node, alt_name)
        }
        else if (_node.kind != "doitbox") {
            global_declarations_string += "\n" + boxObjectToString(_node, alt_name)
        }
    }
    if (current_turtle_id) {
        global_declarations_string += `\n let current_turtle_id = "${current_turtle_id}"`
    }

    window.virtualNodeTrees[fname] = _virtualNodeTree;
    let func_defn = `
    async function ${fname}() {
        let _context_name = "${fname}";
        ${global_declarations_string}
        ${_tempFuncString}
        return await _tempFunc()
    }
    `;
    window.context_functions[fname] = func_defn;
    return fname
}

// finds all of the named boxes starting from startBoxNode
// StartBoxNode itself is included
// It first looks inside startBoxNode using getContainedNames
// Then it searches outward
function findNamedBoxesInScope(startBoxNode, base_node, name_list=null, current_turtle_id=null) {
    let named_nodes = [];
    if (!name_list) {
        name_list = []
    }
    if (container_kinds.includes(startBoxNode.kind) || startBoxNode.kind == "port") {
        let [sub_names, sub_nodes, new_current_turtle_id] = getContainedNames(startBoxNode, base_node, name_list, current_turtle_id);
        name_list = name_list.concat(sub_names);
        named_nodes = named_nodes.concat(sub_nodes);
        current_turtle_id = new_current_turtle_id
    }

    if (startBoxNode.parent == null) {
        return [named_nodes, current_turtle_id]
    }
    let parentLine = _getMatchingNode(startBoxNode.parent, base_node);
    if (!parentLine) {
        return [named_nodes, current_turtle_id]
    }
    let parentBox = _getMatchingNode(parentLine.parent, base_node);
    let [new_named_nodes, new_current_turtle_id] = findNamedBoxesInScope(parentBox, base_node, name_list, current_turtle_id);
    named_nodes = named_nodes.concat(new_named_nodes);
    current_turtle_id = new_current_turtle_id;
    return [named_nodes, current_turtle_id]
}

// This finds all of the named boxes that exist within a given named scope, including itself
// it is called from findNamedBoxesInScope
// It builds lists of the names and nodes found, including a port name and port node
// If theNode is a port then it looks for named nodes inside the port, but ignores the name of the targeted box.
// If it discovers a transparent box then it is called recursively.
function getContainedNames(theNode, base_node, name_list, current_turtle_id) {

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
        theNode = getPortTarget(theNode, base_node)
    }

    if (theNode.closetLine) {
        processContainedLine(theNode.closetLine)
    }

    if (container_kinds.includes(theNode.kind)) {
        for (let lin of theNode.line_list) {
            processContainedLine(lin)
        }
    }

    function processContainedLine(lin) {
        for (let node of lin.node_list) {
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
                let [sub_names, sub_nodes, new_current_turtle_id] = getContainedNames(node, base_node, name_list.concat(new_names), current_turtle_id);
                new_names = new_names.concat(sub_names);
                new_nodes = new_nodes.concat(sub_nodes);
                current_turtle_id = new_current_turtle_id
            }

        }
    }
    return [new_names, new_nodes, current_turtle_id]
}


function insertVirtualNode(nodeToInsert, boxToInsertIn, virtualNodeTree) {
    let lnodeToInsert = _.cloneDeep(nodeToInsert);
    let new_id = guid();
    lnodeToInsert.unique_id = new_id;
    if (container_kinds.includes(lnodeToInsert.kind)) {
        window.updateIds(lnodeToInsert.line_list);
        for (let lin of lnodeToInsert.line_list) {
            lin.parent = new_id
        }
        if (lnodeToInsert.closetLine) {
            lnodeToInsert.closetLine.unique_id = guid();
            lnodeToInsert.closetLine.parent = new_id
        }
    }
    lnodeToInsert.virtual = true;
    let _tempLineNode = window.newLineNode([lnodeToInsert]);
    _tempLineNode.parent = boxToInsertIn.unique_id;
    _tempLineNode.position = boxToInsertIn.line_list.length;
    makeChildrenVirtual(lnodeToInsert);

    boxToInsertIn.line_list.push(_tempLineNode);
    return lnodeToInsert;
}

function makeChildrenVirtual(node) {
    if (container_kinds.includes(node.kind)) {
        for (let line of node.line_list) {
            line.virtual = true;
            for (let lnode of line.node_list) {
                lnode.virtual = true;
                makeChildrenVirtual(lnode)
            }
        }
        if (node.closetLine) {
            node.closetLine.virtual = true;
            for (let lnode of node.closetLine.node_list) {
                lnode.virtual = true;
                makeChildrenVirtual(lnode)
            }
        }
    }
}

// Convert a named doit box to javascript
function _convertNamedDoit (doitNode, virtualNodeTree) {

    try {
        let [_named_nodes, current_turtle_id] = findNamedBoxesInScope(doitNode, virtualNodeTree);
        let context = preprocessNamedBoxes(_named_nodes, virtualNodeTree);
        let lvarstring = "";
        for (let dboxName in context.data_boxes) {
            let dbox = context.data_boxes[dboxName];
            let parentLine = _getMatchingNode(dbox.parent, virtualNodeTree);
            if (parentLine.parent == doitNode.unique_id) {
                lvarstring += "\n" + dataBoxToString(dbox, dboxName);
            }
        }
        if (current_turtle_id) {
            lvarstring += `\n let current_turtle_id = "${current_turtle_id}"`
        }

        // Get the input names for the box we're converting
        let arglist = context.doit_boxes[doitNode.name].args;
        let input_names = [];
        for (let arg of arglist) {
            input_names.push(arg[0])
        }
        let converted_body;
        context.input_names = input_names;

        // Find all called doit boxes and copy them locally
        let called_doits = findCalledDoits(doitNode, virtualNodeTree, context);
        let called_doit_string = "";
        context.copied_doits = {};
        let inserted_lines = 0;
        for (let called_doit of called_doits) {
            if (called_doit.node.parent == doitNode.unique_id) {
                continue
            }
            let vnode = insertVirtualNode(called_doit.node, doitNode, virtualNodeTree);
            inserted_lines += 1;
            context.copied_doits[called_doit.node.name] = {
                node: vnode,
                args: called_doit.args
            };
            called_doit_string += "\n" + _convertNamedDoit(vnode, virtualNodeTree)
        }

        // process remaining lines in doit box we're converting
        // skip new lines added at the end as well as the input line, if there is one.
        let line_list = doitNode.line_list;
        let endat = line_list.length - inserted_lines;
        if (arglist.length > 0) {
            converted_body = convertStatementList(line_list.slice(1, endat),
                virtualNodeTree, context, true)
        } else {
            converted_body = convertStatementList(line_list.slice(0, endat),
                virtualNodeTree, context, true)
        }
        let name_string = `async function ${doitNode.name} (`;
        let first = true;
        for (let arg of context.input_names) {
            if (!first) {
                name_string = name_string + ", ";
            }
            first = false;
            name_string = name_string + arg
        }
        name_string += ")";

        let res_string = `
            ${name_string} {
                let my_node_id = "${doitNode.unique_id}";
                ${lvarstring}
                ${converted_body}
                ${called_doit_string}
                ${eval_in_place_string}
            }
        `;
        return res_string
    }
    catch(error) {
        let title = `Error transpiling doit box '${doitNode.name}'`;
        window.addErrorDrawerEntry({title: title, content: `<pre>${error}\n${error.stack}</pre>`})

    }
}

// Finds doit boxes that are called
// The names are adjusted if we have a portal to a doit box
function findCalledDoits(doitNode, virtualNodeTree, context, called_doits = []) {
    for (let line of doitNode.line_list){
        let tline = tokenizeLine(line);
        for (let token of tline) {
            if (typeof(token) == "object") {
                if (token.name == null && token.kind == "doitbox") {
                    called_doits = called_doits.concat(findCalledDoits(token, virtualNodeTree, context, called_doits))
                }
            }
            else {
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
function preprocessNamedBoxes(namedNodes, virtualNodeTree) {
    let doit_boxes = {};
    let data_boxes = {};
    let js_boxes = {};
    for (let node of namedNodes) {
        let name = node.name;
        if (node.kind == "port") {
            node = getPortTarget(node, virtualNodeTree)
        }
        if (data_kinds.includes(node.kind)) {
            data_boxes[name] = node;
        }
        else if (node.kind == "doitbox") {
            let first_tokenized = tokenizeLine(node.line_list[0]);
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
function convertStatementList(line_list, virtualNodeTree, context, return_last_line=false) {
    let converted_string = "";
    let counter = 0;
    for (let line of line_list) {
        if (line.amCloset) continue;
        let token_list = tokenizeLine(line);
        counter += 1;
        let is_last_line = return_last_line && counter == line_list.length;
        converted_string += convertStatementLine(token_list, virtualNodeTree, context, is_last_line)
    }
    return converted_string
}

function convertStatementLine(token_list, virtualNodeTree, context, is_last_line=false) {
    if (token_list.length == 0){
        return ""
    }
    let consuming_line = _.cloneDeep(token_list);
    let first_token = consuming_line[0];

    if ((typeof(first_token) == "object")) {
        if (!first_token.name) { // A raw doit box on the last line
            let lresult = consumeAndConvertNextArgument(consuming_line, virtualNodeTree, context)[0] + ";"
            if (is_last_line) {
                lresult = "return " + lresult
            }
            return lresult
        }
        return ""
    }
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
        return convertTell(token_list, virtualNodeTree, context, is_last_line)
    }
    else {
        if (is_last_line && statement_type != "boxer_statement") {
            return "return " + consumeAndConvertNextArgument(token_list, virtualNodeTree, context)[0] + ";"
        }
        else {
            return ""
        }
    }

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
        if (arg[1] != "statement_list") {

            consume_result = consumeAndConvertNextArgument(consuming_line, virtualNodeTree, context);
            consuming_line = consuming_line.slice(consume_result[1]);
            converted_args.push(consume_result[0])
        }
        else {
            consume_result = consumeAndConvertNextStatementList(consuming_line, virtualNodeTree, context);
            consuming_line = consuming_line.slice(consume_result[1]);
            converted_args.push(consume_result[0])
        }
    }
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
        result_string = `await ${first_token}(${arg_string})\n`;

    }
    else {
        result_string = boxer_statements[first_token].converter(converted_args) + "\n"
    }
    if (consuming_line.length > 0) {
        result_string += "\n" + convertStatementLine(consuming_line, virtualNodeTree, context)
    }
    else if (is_last_line) {
        if (statement_type != "boxer_statement" || boxer_statements[first_token].allow_return) {
            result_string = "return " + result_string + ";"
        }
    }
    return result_string
}

function convertTell(token_list, virtualNodeTree, context, is_last_line) {

    // If the target is a port, this case should already be handled correctly in
    // the context built earlier.
    let startBox = context.data_boxes[token_list[1]];
    let box_id = startBox.unique_id;
    let the_node;
    if (typeof(token_list[2]) == "object") {
        the_node = token_list[2]
    }
    else {
        the_node = window.newTextNode(token_list[2]);
    }
    let the_code_line = window.newLineNode([the_node]);
    let _fname = _createLocalizedFunctionCall(the_code_line, box_id, window.getBaseNode(), false);

    if (is_last_line) {
        return `return await ${_fname}()`
    }
    else{
        return `${_fname}()`
    }
}


function consumeAndConvertNextArgument(consuming_line, virtualNodeTree, context) {
    let first_node = consuming_line[0];
    let first_token;
    let tokens_consumed = 1;
    let new_consuming_line = _.cloneDeep(consuming_line);
    if (typeof(first_node) == "object") {

        if (first_node.kind == "port") {
            first_node = getPortTarget(first_node, virtualNodeTree)
        }
        if (first_node.kind == "doitbox") {
            let fstring = convertStatementList(first_node.line_list, virtualNodeTree, context, true);
            first_token = `await (async ()=>{${fstring}})()\n`
        }
        else if (first_node.kind == "databox" && first_node.line_list.length == 1) {
            let first_line = first_node.line_list[0];
            if (first_line.node_list.length == 1) {
                let the_text = first_line.node_list[0].the_text.trim();
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
        if (!isNaN(first_node)) {
            first_token = first_node;
            new_consuming_line = new_consuming_line.slice(1,);
        }
        else {
            let args;
            let ntype = getNameType(first_node, context);
            if (ntype == "user_data" || ntype == "input_name") {
                first_token = first_node;
                new_consuming_line = new_consuming_line.slice(1,);
            }
            else {
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
                for (let arg in args) {
                    if (new_consuming_line.length == 0) {
                        if (isOptional(arg))
                            break;
                        else {
                            throw `Not enough arguments for ${first_node}`
                        }

                    }
                    let consume_result = consumeAndConvertNextArgument(new_consuming_line, virtualNodeTree, context);
                    new_consuming_line = new_consuming_line.slice(consume_result[1]);
                    tokens_consumed += consume_result[1];
                    converted_args.push(consume_result[0])
                }
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
                    first_token = `await ${first_node}(${arg_string})`;

                }
                else {
                    first_token = boxer_statements[first_node].converter(converted_args)
                }
            }
        }
    }
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
                let cresult = consumeAndConvertNextArgument(new_consuming_line.slice(1, ), virtualNodeTree, context);
                tokens_consumed += cresult[1];
                result_string += cresult[0];
            }
        }
    }

    return [result_string, tokens_consumed]
}

function consumeAndConvertNextStatementList(consuming_line, virtualNodeTree, context) {
    let first_node = consuming_line[0];
    let first_token;
    let tokens_consumed = 1;
    let new_consuming_line = _.cloneDeep(consuming_line);
    let result_string;
    if (typeof(first_node) == "object") {
        result_string = convertStatementList(first_node.line_list, virtualNodeTree, context);
        return [result_string, 1]
    }
    else {
        result_string = convertStatementLine(consuming_line, virtualNodeTree, context);
        return [result_string, consuming_line.length]
    }
}


function jsBoxToString(jsbox, alt_name) {
    let var_name;
    if (alt_name == null) {
        var_name = jsbox.name
    }
    else {
        var_name = alt_name
    }
    return `
    async function ${var_name} {${jsbox.the_code}}
    `
}

function boxObjectToString(dbox, alt_name=null) {
    let var_name;
    if (alt_name == null) {
        var_name = dbox.name
    }
    else {
        var_name = alt_name
    }
    let dbstring = JSON.stringify(dbox);
    return `var ${var_name} = ${dbstring}`
}

function dataBoxToString(dbox, alt_name=null) {
    let var_name;
    if (alt_name == null) {
        var_name = dbox.name
    }
    else {
        var_name = alt_name
    }
    if (dbox.line_list.length == 1){
        let the_line = dbox.line_list[0];
        if (the_line.node_list.length == 1) {
            let the_text = the_line.node_list[0].the_text.trim();
            if (!the_text) {
                return `var ${var_name} = null`
            }
            if (isNaN(the_text)) {
                return `var ${var_name} = "${the_text}"`
            }
            else {
                return `var ${var_name} = ${the_text}`
            }
        }
        else {
            return boxObjectToString(dbox, var_name)
        }
    }
    else {
        return boxObjectToString(dbox, var_name)
    }
}


function _getMatchingNode(uid, node) {
    if (node.unique_id == uid) {
            return node
    }
    if (!container_kinds.includes(node.kind) || (node.line_list.length == 0)) {
        return false
    }
    if (node.closetLine) {
        if (node.closetLine.unique_id == uid) {
            return node.closetLine
        }
        for (let nd of node.closetLine.node_list) {
            let match = _getMatchingNode(uid, nd);
            if (match) {
                return match
            }
        }
    }
    for (let lin of node.line_list) {
        if (lin.unique_id == uid) {
            return lin
        }
        for (let nd of lin.node_list) {
            let match = _getMatchingNode(uid, nd);
            if (match) {
                return match
            }
        }
    }
    return false
}

function getPortTarget(portNode, base_node) {
    if (portNode.target == null) return null;
    let targetNode = _getMatchingNode(portNode.target, base_node);
    return targetNode
}

function extractArgs(doitBoxNode) {
    let first_tokenized = tokenizeLine(doitBoxNode.line_list[0]);
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

function tokenizeLine(line) {
    let token_list = [];
    for (let node of line.node_list) {
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