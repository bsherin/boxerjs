
import _ from "lodash";
import {boxer_statements, operators, isOperator, isBoxerStatement} from "./boxer_lang_definitions.js"
import {guid} from "./utilities";

export {_convertNamedDoit, insertVirtualNode, _createLocalizedFunctionCall,
    _getMatchingNode, current_turtle_id, findNamedBoxesInScope}

let current_turtle_id = null;

function _createLocalizedFunctionCall(the_code_line, box_id, base_node, root=true) {
    let local_the_code_line = _.cloneDeep(the_code_line);
    let _tempDoitNode = window.newDoitNode([local_the_code_line]);
    _tempDoitNode.name = "_tempFunc";
    let _virtualNodeTree = _.cloneDeep(base_node);
    let _start_node = _getMatchingNode(box_id, _virtualNodeTree);
    let _inserted_start_node = insertVirtualNode(_tempDoitNode, _start_node, _virtualNodeTree);
    let _tempFuncString = _convertNamedDoit(_inserted_start_node, _virtualNodeTree);

    let _named_nodes = findNamedBoxesInScope(_start_node, _virtualNodeTree);
    let global_declarations_string = "";
    for (let _node of _named_nodes) {
        if (_node.kind == "databox") {
            global_declarations_string += "\n" + dataBoxToString(_node)
        }
        if (_node.kind == "jsbox") {
            global_declarations_string += "\n" + jsBoxToString(_node)
        }
    }
    let fname;
    if (root) {
        fname = "_outerFunc";
    }
    else {
        fname = "_tellFunc" + String(window.tell_function_counter);
        window.tell_function_counter += 1;
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

function findNamedBoxesInScope(startBoxNode, baseNode, name_list=null, turtleboxfound=false) {
    let named_nodes = [];
    if (!name_list) {
        name_list = []
    }
    if (startBoxNode.kind == "databox" || startBoxNode.kind == "doitbox") {
        for (let lin of startBoxNode.line_list) {
            for (let node of lin.node_list) {
                if ((node.kind != "text") && node.name) {
                    if (!name_list.includes(node.name)) {
                        named_nodes.push(node);
                        name_list.push(node.name)
                    }

                }
                if (!turtleboxfound && (node.kind == "turtlebox" || node.kind == "p5turtlebox")) {
                    current_turtle_id = node.unique_id;
                    turtleboxfound = true
                }
            }
        }
    }

    if (startBoxNode.parent == null) {
        return named_nodes
    }
    let parentLine = _getMatchingNode(startBoxNode.parent, baseNode);
    if (!parentLine) {
        return named_nodes
    }
    let parentBox = _getMatchingNode(parentLine.parent, baseNode);
    named_nodes = named_nodes.concat(findNamedBoxesInScope(parentBox, baseNode, name_list, turtleboxfound));
    return named_nodes
}

function preprocessNamedBoxes(namedNodes) {
    let doit_boxes = {};
    let data_boxes = {};
    let js_boxes = {};
    for (let node of namedNodes) {
        if (node.kind == "databox") {
            data_boxes[node.name] = node;
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
            doit_boxes[node.name] = {
                node: node,
                args: args
            }
        }
        else {
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
            js_boxes[fname] = {
                node:node,
                args: args,
            }
        }
    }
    return {
        doit_boxes: doit_boxes,
        data_boxes: data_boxes,
        js_boxes: js_boxes,
        input_names: [],
    }
}

function _getMatchingNode(uid, node) {
    if (node.unique_id == uid) {
            return node
    }
    if ((node.kind == "text") || (node.kind == "jsbox") || (node.kind == "turtlebox") || (node.kind == "p5turtlebox") || (node.line_list.length == 0)) {
        return false
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

function makeChildrenVirtual(node) {
    if (node.kind == "databox" || node.kind == "doitbox") {
        for (let line of node.line_list) {
            line.virtual = true;
            for (let lnode of line.node_list) {
                lnode.virtual = true;
                makeChildrenVirtual(lnode)
            }
        }
    }
}

function insertVirtualNode(nodeToInsert, boxToInsertIn, virtualNodeTree) {
    let lnodeToInsert = _.cloneDeep(nodeToInsert);
    let new_id = guid();
    lnodeToInsert.unique_id = new_id;
    if (lnodeToInsert.kind == "databox" || lnodeToInsert.kind == "doitbox") {
        window.updateIds(lnodeToInsert.line_list);
        for (let lin of lnodeToInsert.line_list) {
            lin.parent = new_id
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
                    called_doits = called_doits.concat(context.doit_boxes[token])
                }
            }
        }
    }
    return called_doits
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

function _convertNamedDoit (doitNode, virtualNodeTree) {

    try {
        let _named_nodes = findNamedBoxesInScope(doitNode, virtualNodeTree);
        let context = preprocessNamedBoxes(_named_nodes);
        let lvarstring = "";
        for (let dboxName in context.data_boxes) {
            let dbox = context.data_boxes[dboxName];
            let parentLine = _getMatchingNode(dbox.parent, virtualNodeTree);
            if (parentLine.parent == doitNode.unique_id) {
                lvarstring += "\n" + dataBoxToString(dbox);
            }
        }
        let line_list = doitNode.line_list;
        let arglist = context.doit_boxes[doitNode.name].args;
        let input_names = [];
        for (let arg of arglist) {
            input_names.push(arg[0])
        }
        let converted_body;
        context.input_names = input_names;
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
        window.addErrorDrawerEntry({title: title, content: `<pre>${error}</pre>`})
    }

}


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
    return token_list
}

function convertStatementList(line_list, virtualNodeTree, context, return_last_line=false) {
    let converted_string = "";
    let counter = 0;
    for (let line of line_list) {
        let token_list = tokenizeLine(line);
        counter += 1;
        let is_last_line = return_last_line && counter == line_list.length;
        converted_string += convertStatementLine(token_list, virtualNodeTree, context, is_last_line)
    }
    return converted_string
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
function consumeAndConvertNextArgument(consuming_line, virtualNodeTree, context) {
    let first_node = consuming_line[0];
    let first_token;
    let tokens_consumed = 1;
    let new_consuming_line = _.cloneDeep(consuming_line);
    if (typeof(first_node) == "object") {
        if (first_node.kind == "doitbox") {
            let fstring = convertStatementList(first_node.line_list, virtualNodeTree, context, true);
            first_token = `await (async ()=>{${fstring}})()\n`
        }
        else if (first_node.line_list.length == 1) {
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


function jsBoxToString(jsbox) {
    return `
    async function ${jsbox.name} {${jsbox.the_code}}
    `
}

function dataBoxToString(dbox) {
    if (dbox.line_list.length == 1){
        let the_line = dbox.line_list[0];
        if (the_line.node_list.length == 1) {
            let the_text = the_line.node_list[0].the_text.trim();
            if (!the_text) {
                return `var ${dbox.name} = null`
            }
            if (isNaN(the_text)) {
                return `var ${dbox.name} = "${the_text}"`
            }
            else {
                return `var ${dbox.name} = ${the_text}`
            }
        }
        else {
            let dbstring = JSON.stringify(dbox);
            return `var ${dbox.name} = ${dbstring}`
        }
    }
    else {
        let dbstring = JSON.stringify(dbox);
        return `var ${dbox.name} = ${dbstring}`
    }
}

function convertTell(token_list, virtualNodeTree, context, is_last_line) {
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

function convertStatementLine(token_list, virtualNodeTree, context, is_last_line=false) {
    if (token_list.length == 0){
        return ""
    }
    let consuming_line = _.cloneDeep(token_list);
    let statement_name = consuming_line[0];
    if ((typeof(statement_name) == "object")) {
        if (is_last_line && !statement_name.name && statement_name.kind == "databox") {
            return "return " + consumeAndConvertNextArgument(consuming_line, virtualNodeTree, context)[0]  + ";"
        }
        else if (statement_name.kind == "doitbox") {
            let fstring = convertStatementList(statement_name.line_list, virtualNodeTree, context, true);
            return `return await (async ()=>{${fstring}})()\n` + convertStatementLine(consuming_line.slice(1,), virtualNodeTree, context, true)
        }
        else {
            return ""
        }
    }
    let statement_type = getNameType(statement_name, context, is_last_line);
    let args;
    if (statement_type == "user_doit") {
        args = context.doit_boxes[statement_name].args
    }
    else if (statement_type == "copied_doit") {
        args = context.copied_doits[statement_name].args
    }
    else if (statement_type == "user_js") {
        args = context.js_boxes[statement_name].args
    }
    else if (statement_type == "boxer_statement"){
        args = boxer_statements[statement_name].args
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
                throw `Not enough arguments for '${statement_name}'`
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
        result_string = `await ${statement_name}(${arg_string})\n`;

    }
    else {
        result_string = boxer_statements[statement_name].converter(converted_args) + "\n"
    }
    if (consuming_line.length > 0) {
        result_string += "\n" + convertStatementLine(consuming_line, virtualNodeTree, context)
    }
    else if (is_last_line && statement_type != "boxer_statement") {
        result_string = "return " + result_string + ";"
    }
    return result_string
}

