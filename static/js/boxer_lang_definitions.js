
export {boxer_statements, operators, isOperator, isBoxerStatement}

let boxer_statements = {
    forward: {
        args: [
            ["steps", "number"]
        ],
        converter: (arglist) => {
            return `await forward(current_turtle_id, ${arglist[0]})`
        }
    },
    back: {
        args: [
            ["steps", "number"]
        ],
        converter: (arglist) => {
            return `await back(current_turtle_id, ${arglist[0]})`
        }
    },
    right: {
        args: [
            ["angle", "number"]
        ],
        converter: (arglist) => {
            return `await right(current_turtle_id, ${arglist[0]}, eval_in_place)`
        }
    },
    left: {
        args: [
            ["angle", "number"]
        ],
        converter: (arglist) => {
            return `await left(current_turtle_id, ${arglist[0]})`
        }
    },
    clear: {
        args: [],
        converter: (arglist) => {
            return "await clear(current_turtle_id)"
        }
    },
    clean: {
        args: [],
        converter: (arglist) => {
            return "await clean(current_turtle_id)"
        }
    },
    penup: {
        args: [],
        converter: (arglist) => {
            return "await penup(current_turtle_id)"
        }
    },
    pendown: {
        args: [],
        converter: (arglist) => {
            return "await pendown(current_turtle_id)"
        }
    },
    setxy: {
        args: [
            ["xcoord", "number"],
            ["ycoord", "number"]
        ],
        converter: (arglist) => {
            return `await setxy(current_turtle_id, ${arglist[0]}, ${arglist[1]}, eval_in_place)`
        }
    },
    setheading: {
        args: [
            ["angle", "number"]
        ],
        converter: (arglist) => {
            return `await setheading(current_turtle_id, ${arglist[0]}, eval_in_place)`
        }
    },
    showturtle: {
        args: [],
        converter: (arglist) => {
            return "await showTurtle(current_turtle_id)"
        }
    },
    hideturtle: {
        args: [],
        converter: (arglist) => {
            return "await hideTurtle(current_turtle_id)"
        }
    },
    "set-pen-width": {
        args:[
            ["width", "number"]
        ],
        converter: (arglist) => {
            return `await setPenWidth(current_turtle_id, ${arglist[0]})`
        }
    },

    "set-pen-color": {
        args:[
            ["the_color", "boxorstring"]
        ],
        converter: (arglist) => {
            return `await setPenColor(current_turtle_id, ${arglist[0]})`
        }
    },

    "set-background-color": {
        args:[
            ["the_color", "boxorstring"]
        ],
        converter: (arglist) => {
            return `await setBackgroundColor(current_turtle_id, ${arglist[0]})`
        }
    },

    "stamp-rectangle": {
        args:[
            ["width", "number"],
            ["height", "number"]
        ],
        converter: (arglist) => {
            return `await stampRectangle(current_turtle_id, ${arglist[0]},${arglist[1]})`
        }
    },

    "stamp-hollow-rectangle": {
        args:[
            ["width", "number"],
            ["height", "number"]
        ],
        converter: (arglist) => {
            return `await stampHollowRectangle(current_turtle_id, ${arglist[0]},${arglist[1]})`
        }
    },
    dot: {
        args: [],
        converter: (arglist) => {
            return "await dot(current_turtle_id)"
        }
    },
    "stamp-ellipse": {
        args:[
            ["width", "number"],
            ["height", "number"]
        ],
        converter: (arglist) => {
            return `await stampEllipse(current_turtle_id, ${arglist[0]},${arglist[1]})`
        }
    },

    "stamp-hollow-ellipse": {
        args:[
            ["width", "number"],
            ["height", "number"]
        ],
        converter: (arglist) => {
            return `await stampHollowEllipse(current_turtle_id, ${arglist[0]},${arglist[1]})`
        }
    },
    "stamp-circle": {
        args:[
            ["radius", "number"]
        ],
        converter: (arglist) => {
            return `await stampCircle(current_turtle_id, ${arglist[0]})`
        }
    },

    "stamp-hollow-circle": {
        args:[
            ["radius", "number"],
        ],
        converter: (arglist) => {
            return `await stampHollowCircle(current_turtle_id, ${arglist[0]})`
        }
    },

    "set-graphics-mode": {
        args:[
            ["the_text", "text"]
        ],
        converter: (arglist) => {
            return `await setGraphicsMode(current_turtle_id, ${arglist[0]})`
        }
    },

    type: {
        args:[
            ["the_text", "text"],
        ],
        converter: (arglist) => {
            return `await type(current_turtle_id, ${arglist[0]})`
        }
    },

    "set-type-font": {
        args:[
            ["font_string", "text"],
        ],
        converter: (arglist) => {
            return `await setTypeFont(current_turtle_id, ${arglist[0]})`
        }
    },

    "set-sprite-size": {
        args:[
            ["the_size", "number"],
        ],
        converter: (arglist) => {
            return `await setSpriteSize(current_turtle_id, ${arglist[0]})`
        }
    },

    "make-color": {
        args:[
            ["red", "number"],
            ["green", "number"],
            ["blue", "number"]
        ],
        allow_return: true,
        converter: (arglist) => {
            return `await makeColor(${arglist[0]}, ${arglist[1]}, ${arglist[2]})`
        }
    },
    snap: {
        args:[
            ["gbox", "graphics"]
        ],
        allow_return: true,
        converter: (arglist) => {
            return `await snap(${arglist[0]})`
        }
    },


    red: {
        args: [],
        allow_return: true,
        converter: (arglist) => {
            return "await makeColor(255, 0, 0)"
        }
    },
    green: {
        args: [],
        allow_return: true,
        converter: (arglist) => {
            return "await makeColor(0, 255, 0)"
        }
    },
    blue: {
        args: [],
        allow_return: true,
        converter: (arglist) => {
            return "await makeColor(0, 0, 255)"
        }
    },
    black: {
        args: [],
        allow_return: true,
        converter: (arglist) => {
            return "await makeColor(0, 0, 0)"
        }
    },
    white: {
        args: [],
        allow_return: true,
        converter: (arglist) => {
            return "await makeColor(255, 255, 255)"
        }
    },

    orange: {
        args: [],
        allow_return: true,
        converter: (arglist) => {
            return "await makeColor(255, 166, 0)"
        }
    },
    yellow: {
        args: [],
        allow_return: true,
        converter: (arglist) => {
            return "await makeColor(255, 255, 0)"
        }
    },
    gray: {
        args: [],
        allow_return: true,
        converter: (arglist) => {
            return "await makeColor(127, 127, 127)"
        }
    },
    purple: {
        args: [],
        allow_return: true,
        converter: (arglist) => {
            return "await makeColor(161, 33, 240)"
        }
    },


    reset: {
        args: [],
        converter: (arglist) => {
            return "await reset(current_turtle_id)"
        }
    },
    repeat: {
        args: [
            ["repeats", "number"],
            ["actions", "statement_list"]
        ],
        converter: (arglist) => {
            return `
                for (let _i = 0; _i < ${arglist[0]}; ++_i) {
                    ${arglist[1]}
                    await delay(1)
                } 
            `
        }
    },
    change: {
        args: [
            ["boxname", "raw_string"],
            ["newval", "expression"]
        ],
        converter: (arglist) => {
            return `await change("${arglist[0]}", ${arglist[1]}, my_node_id, eval_in_place)`
        }
    },

    "change-graphics": {
        args: [
            ["boxname", "raw_string"],
            ["newval", "expression"]
        ],
        converter: (arglist) => {
            return `await changeGraphics("${arglist[0]}", ${arglist[1]}, my_node_id, eval_in_place)`
        }
    },

    setshape: {
        args: [
            ["newval", "expression"]
        ],
        converter: (arglist) => {
            return `await changeGraphics("shape", ${arglist[0]}, my_node_id, eval_in_place)`
        }
    },

    setposition: {
        args: [
            ["pos", "expression"]
        ],
        converter: (arglist) => {
            return `await setPosition(current_turtle_id, ${arglist[0]})`
        }
    },

    "turtle-shape": {
        args: [],
        allow_return: true,
        converter: (arglist) => {
            return "await turtleShape()"
        }
    },

    "mouse-position": {
        args: [],
        allow_return: true,
        converter: (arglist) => {
            return "await getMousePosition(current_turtle_id)"
        }
    },

    if: {
        args: [
            ["condition", "expression"],
            ["actions", "statement_list"],
            ["more-actions", "statement_list", "optional"]
        ],
        converter: (arglist) => {
            if (arglist.length == 2) {
                return `
                    if (${arglist[0]}) {
                        ${arglist[1]}
                    }
                  `
            }
            else {
                return `
                    if (${arglist[0]}) {
                        ${arglist[1]}
                    }
                    else {
                        ${arglist[2]}
                    }
                  `
            }

        }
    },
    when: {
        args: [
            ["condition", "expression"],
            ["actions", "statement_list"]
        ],
        converter: (arglist) => {
            return `
                if (${arglist[0]}) {
                    ${arglist[1]}
                }
              `
        }
    },

    sin:  {
        args:[
            ["angle", "number"],
        ],
        allow_return: true,
        converter: (arglist) => {
            return `sin(${arglist[0]})`
        }
    },

    asin:  {
        args:[
            ["x", "number"],
            ["y", "number"]
        ],
        allow_return: true,
        converter: (arglist) => {
            return `asin(${arglist[0]}, ${arglist[1]})`
        }
    },

    cos:  {
        args:[
            ["angle", "number"],
        ],
        allow_return: true,
        converter: (arglist) => {
            return `cos(${arglist[0]})`
        }
    },

    acos:  {
        args:[
            ["x", "number"],
            ["y", "number"]
        ],
        allow_return: true,
        converter: (arglist) => {
            return `acos(${arglist[0]}, ${arglist[1]})`
        }
    },


    tan:  {
        args:[
            ["angle", "number"],
        ],
        allow_return: true,
        converter: (arglist) => {
            return `tan(${arglist[0]})`
        }
    },

    atan:  {
        args:[
            ["x", "number"],
            ["y", "number"]
        ],
        allow_return: true,
        converter: (arglist) => {
            return `atan(${arglist[0]}, ${arglist[1]})`
        }
    },

};

let synonyms = {
    fd: "forward",
    bk: "back",
    rt: "right",
    lt: "left",
    st: "showturtle",
    show: "showturtle",
    ht: "hideturtle",
    hide: "hideturtle",
    seth: "setheading",
    cs: "reset",
    clearscreen: "reset",
    pu: "penup",
    pd: "pendown",
    "stamp-rect": "stamp-rectangle",
    "stamp-hollow-rect": "stamp-hollow-rectangle"
};

for (let name in synonyms) {
    boxer_statements[name] = boxer_statements[synonyms[name]]
}

function isBoxerStatement(token) {
    return Object.keys(boxer_statements).includes(token)
}

let operators = {
    "+": "+",
    "-": "-",
    "*": "*",
    "=": "==",
    "<": "<",
    ">": ">",
    "<=": "<=",
    ">=": ">=",
    "/": "/"
};

function isOperator(token) {
    return Object.keys(operators).includes(token)
}