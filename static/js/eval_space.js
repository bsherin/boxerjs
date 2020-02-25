
import _ from 'lodash'
export {doExecution}

var _name_index;
var _base_node;

let delay_amount = 30;

let current_turtle_id = null;
let current_turtle_ref = null;

function changeNodePromise(uid, param_name, new_val) {
    return new Promise(function(resolve, reject) {
        window.changeNode(uid, param_name, new_val, (data)=>{
            resolve(data)
        })
    })
}

async function doExecution(the_code, box_id, base_node) {
    _base_node = base_node;
    let _start_node = _getMatchingNode(box_id, base_node);
    let _named_nodes = findNamedBoxesInScope(_start_node, base_node);
    let _context_string = "";
    _name_index = {};
    for (let _node of _named_nodes) {
        let _nstring;
        if (_node.kind == "databox") {
            _name_index[_node.name] = _node.unique_id;
            _nstring = dataBoxToString(_node);
        }
        else {
            _nstring = jsBoxToString(_node);
        }
        _context_string += "\n" + _nstring
    }
    let _full_code = `
        function _tempFunc() {
            ${_context_string}
            return ${the_code} 
            ${cfunc}
        } 
        _tempFunc()
    `;

    try {
        let _result = await eval(_full_code);
        return _result;
    }
    catch(error){
        window.addErrorDrawerEntry({title: error.message, content: `<pre>${error.stack}</pre>`})
    }
}

let cfunc = `async function change(boxname, newval) {
    let mnode = _getMatchingNode(_name_index[boxname], _base_node);
    let estring;
    if (typeof(newval) == "object") {
        let _newval =_.cloneDeep(newval);
        if (_newval.kind == "databox") {
            window.updateIds(_newval.line_list);
            for (let lin of _newval.line_list) {
                lin.parent = mnode.unique_id
            }
        }
        let dbstring = JSON.stringify(_newval);
        estring = boxname + " = " + dbstring;
        eval(estring);
        return new Promise(function(resolve, reject) {
            window.changeNode(mnode.unique_id, "line_list", _newval.line_list, async (data)=>{
                await delay(300);
                resolve(data)
            })
        })
    }
    else {
        if (!newval) {
            estring = boxname + " = null"
        }
        if (isNaN(newval)) {
            estring = boxname + " = '" + newval + "'"
        }
        else {
            estring = boxname + " = " + newval
        }
        eval(estring);
        let newtext = window.newTextNode(String(newval));
        let newline = window.newLineNode([newtext]);
        newline.parent = mnode.unique_id;
        return new Promise(function(resolve, reject) {
            window.changeNode(mnode.unique_id, "line_list", [newline], async (data)=>{
                await delay(delay_amount);
                resolve(data)
            })
        })
    }
}
`;

function delay(msecs) {
    return new Promise(resolve => setTimeout(resolve, msecs));
}

async function redisplay() {
    await delay(300)
}

async function forward(steps) {
    for (let i=0; i<steps; ++i) {
        current_turtle_ref.current.forward(1);
        //await delay(1)
    }
}

function clear() {
    current_turtle_ref.current.clear()
}

function reset() {
    current_turtle_ref.current.reset()
}

function wrap() {
    current_turtle_ref.current.wrap()
}

function showTurtle() {
    current_turtle_ref.current.showTurtle()
}

function hideTurtle() {
    current_turtle_ref.current.hideTurtle()
}

function redrawOnMove(bool) {
    current_turtle_ref.current.redrawOnMove(bool)
}

function penup() {
    current_turtle_ref.current.penup();
}

function pendown() {
    current_turtle_ref.current.pendown();
}

function right(degrees) {
    current_turtle_ref.current.right(degrees)
}

function left(degrees) {
    current_turtle_ref.current.left(degrees)
}

function setxy(x, y) {
    current_turtle_ref.current.goto(x, y)
}

function setheading(degrees) {
    current_turtle_ref.current.angle(degrees)
}

function setlinewidth(w) {
    current_turtle_ref.current.width(w)
}

function write(text) {
    current_turtle_ref.current.write(text)
}

function setcolor(r, g, b, a) {
    current_turtle_ref.current.color(r, g, b, a)
}

function random(low, hi){
    current_turtle_ref.current.random(low, hight)
}

function animate(action, ms) {
    current_turtle_ref.current.animate(action, ms)
}

function setfont(font) {
    current_turtle_ref.current.setfont(font)
}

function _getMatchingNode(uid, node) {
    if (node.unique_id == uid) {
            return node
    }
    if ((node.kind == "text") || (node.kind == "jsbox") || (node.kind == "turtlebox") || (node.line_list.length == 0)) {
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

function findNamedBoxesInScope(startBoxNode, baseNode, name_list=null, turtleboxfound=false) {
    let named_nodes = [];
    if (!name_list) {
        name_list = []
    }
    if (startBoxNode.kind == "databox") {
        for (let lin of startBoxNode.line_list) {
            for (let node of lin.node_list) {
                if ((node.kind != "text") && node.name) {
                    if (!name_list.includes(node.name)) {
                        named_nodes.push(node);
                        name_list.push(node.name)
                    }

                }
                if (!turtleboxfound && node.kind == "turtlebox") {
                    current_turtle_id = node.unique_id;
                    current_turtle_ref = window.turtle_box_refs[current_turtle_id];
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

function jsBoxToString(jsbox) {
    return `
    async function ${jsbox.name} {${jsbox.the_code}}
    `
}

