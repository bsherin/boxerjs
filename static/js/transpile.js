
import _ from "lodash";
import {boxer_statements, operators, isOperator, isBoxerStatement} from "./boxer_lang_definitions.js"

export {_convertNamedDoit, _convertLine, tokenizeLine}


function _convertNamedDoit (boxname, user_doitboxes, user_databoxes, user_jsboxes) {
    let line_list = user_doitboxes[boxname].node.line_list;
    let first_tokenized = tokenizeLine[line_list[0]];
    let arglist = user_doitboxes[boxname].args;
    let local_vars = [];
    for (let arg of arglist) {
        local_vars.push(arg[0])
    }
    let converted_body;
    if (arglist.length > 0) {
        converted_body = convertStatementList(line_list.slice(1,), user_doitboxes, user_databoxes, user_jsboxes, local_vars)
    } else {
        converted_body = convertStatementList(line_list, user_doitboxes, user_databoxes, user_jsboxes, local_vars)
    }
    let name_string = `async function ${boxname} (`;
    let first = true;
    for (let arg of local_vars) {
        if (!first) {
            name_string = name_string + ", ";
        }
        first = false;
        name_string = name_string + arg
    }
    name_string += ")";
    let res_string = `
        ${name_string} {
            ${converted_body}
        }
      `;
    return res_string
}

function _convertLine(the_code_line, _user_doitboxes, _user_databoxes, _user_jsboxes) {
    let token_list = tokenizeLine(the_code_line);
    if (isBoxerStatement(token_list[0])) {
        return convertStatementLine(the_code_line, _user_doitboxes, _user_databoxes, _user_jsboxes)
    }
    else {
        return consumeAndConvertNextArgument(token_list, _user_doitboxes, _user_databoxes, _user_jsboxes)[0]
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

function convertStatementList(line_list, user_doitboxes, user_databoxes, user_jsboxes, local_vars=[]) {
    let converted_string = "";
    for (let line of line_list) {
        converted_string += convertStatementLine(line, user_doitboxes, user_databoxes, user_jsboxes, local_vars)
    }
    return converted_string
}

function getNameType(token, user_doitboxes, user_databoxes, user_jsboxes, local_vars=[]) {
    if (Object.keys(user_doitboxes).includes(token)) {
        return "user_doit"
    }
    // else if (Object.keys(user_jsboxes).includes(token)) {
    //     return "user_jsbox"
    // }
    else if (isBoxerStatement(token)) {
        return "boxer_statement"
    }
    else if (Object.keys(user_databoxes).includes(token)) {
        return "user_data"
    }
    else if (Object.keys(user_jsboxes).includes(token)) {
        return "user_js"
    }
    else if (local_vars.includes(token)) {
        return "local_var"
    }
}

function consumeAndConvertNextArgument(consuming_line, user_doitboxes, user_databoxes, user_jsboxes, local_vars) {
    let first_node = consuming_line[0];
    let first_token;
    let tokens_consumed = 1;
    let new_consuming_line = _.cloneDeep(consuming_line);
    if (typeof(first_node) == "object") {
        if (first_node.kind == "doitbox") {
            let tline = tokenizeLine(first_node.line_list[0]);
            first_token = consumeAndConvertNextArgument(tline, user_doitboxes, user_databoxes, user_jsboxes, local_vars)
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
            let ntype = getNameType(first_node, user_doitboxes, user_databoxes, user_jsboxes, local_vars);
            if (ntype == "user_data" || ntype == "local_var") {
                first_token = first_node;
                new_consuming_line = new_consuming_line.slice(1,);
            }
            else {
                if (ntype == "user_doit") {
                    args = user_doitboxes[first_node].args
                } else if (ntype == "boxer_statement") {
                    args = boxer_statements[first_node].args
                }
                else if (ntype == "user_js") {
                    args = user_jsboxes[first_node].args
                }
                new_consuming_line = new_consuming_line.slice(1,);
                let converted_args = [];
                for (let arg in args) {
                    let consume_result = consumeAndConvertNextArgument(new_consuming_line, user_doitboxes, user_databoxes, user_jsboxes, local_vars);
                    new_consuming_line = new_consuming_line.slice(consume_result[1]);
                    tokens_consumed += consume_result[1];
                    converted_args.push(consume_result[0])
                }
                if (ntype == "user_doit" || ntype == "user_js") {
                    let arg_string = "";
                    let first = true;
                    for (let arg of converted_args) {
                        if (!first) {
                            arg_string = arg_string + ", ";
                        }
                        first = false;
                        arg_string = arg_string + arg
                    }
                    first_token = `${first_node}(${arg_string})`;

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
                result_string += consumeAndConvertNextArgument(new_consuming_line.slice(1, ), user_doitboxes, user_databoxes, user_jsboxes, local_vars)[0];
            }
        }
    }

    return [result_string, tokens_consumed]
}

function consumeAndConvertNextStatementList(consuming_line, user_doitboxes, user_databoxes, user_jsboxes, local_vars=[]) {
    let first_node = consuming_line[0];
    let first_token;
    let tokens_consumed = 1;
    let new_consuming_line = _.cloneDeep(consuming_line);
    let result_string;
    if (typeof(first_node) == "object") {
        result_string = convertStatementList(first_node.line_list, user_doitboxes, user_databoxes, user_jsboxes, local_vars);
        return [result_string, 1]
    }
    else {
        result_string = convertStatementLine(consuming_line, user_doitboxes, user_databoxes, user_jsboxes, local_vars);
        return [result_string, consuming_line.length]
    }
}

function convertStatementLine(line, user_doitboxes, user_databoxes, user_jsboxes, local_vars=[]) {
    let tline = tokenizeLine(line);
    let statement_name = tline[0];
    let statement_type = getNameType(statement_name, user_doitboxes, user_databoxes, user_jsboxes, local_vars);
    let args;
    if (statement_type == "user_doit") {
        args = user_doitboxes[statement_name].args
    }
    else if (statement_type == "user_js") {
        args = user_jsboxes[statement_name].args
    }
    else if (statement_type == "boxer_statement"){
        args = boxer_statements[statement_name].args
    }
    let consuming_line = _.cloneDeep(tline);
    consuming_line = consuming_line.slice(1, );
    let consume_result;
    let converted_args = [];
    for (let arg of args) {
        if (arg[1] != "statement_list") {
            consume_result = consumeAndConvertNextArgument(consuming_line, user_doitboxes, user_databoxes, user_jsboxes, local_vars);
            consuming_line = consuming_line.slice(consume_result[1]);
            converted_args.push(consume_result[0])
        }
        else {
            consume_result = consumeAndConvertNextStatementList(consuming_line, user_doitboxes, user_databoxes, user_jsboxes, local_vars);
            consuming_line = consuming_line.slice(consume_result[1]);
            converted_args.push(consume_result[0])
        }
    }
    let result_string;
    if (statement_type == "user_doit" || statement_type == "user_js") {
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
        result_string += "\n" + convertStatementLine(consuming_line, user_doitboxes, user_databoxes, user_jsboxes, local_vars)
    }
    return result_string
}