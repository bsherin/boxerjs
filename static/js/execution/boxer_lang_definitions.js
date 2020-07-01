
export {boxer_statements, operators, isOperator, isBoxerStatement}

let boxer_statements = {
    forward: {
        args: [
            ["steps", "standard"]
        ],
        converter: (arglist) => {
            return `await forward(current_turtle_id, ${arglist[0]})`
        }
    },
    back: {
        args: [
            ["steps", "standard"]
        ],
        converter: (arglist) => {
            return `await back(current_turtle_id, ${arglist[0]})`
        }
    },
    right: {
        args: [
            ["angle", "standard"]
        ],
        converter: (arglist) => {
            return `await right(current_turtle_id, ${arglist[0]})`
        }
    },
    left: {
        args: [
            ["angle", "standard"]
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
            ["xcoord", "standard"],
            ["ycoord", "standard"]
        ],
        converter: (arglist) => {
            return `await setxy(current_turtle_id, ${arglist[0]}, ${arglist[1]})`
        }
    },
    setheading: {
        args: [
            ["angle", "standard"]
        ],
        converter: (arglist) => {
            return `await setheading(${arglist[0]}, my_node_id)`
        }
    },
    showturtle: {
        args: [],
        converter: (arglist) => {
            return "await showTurtle(my_node_id)"
        }
    },
    hideturtle: {
        args: [],
        converter: (arglist) => {
            return "await hideTurtle(my_node_id)"
        }
    },
    "set-pen-width": {
        args:[
            ["width", "standard"]
        ],
        converter: (arglist) => {
            return `await setPenWidth(current_turtle_id, ${arglist[0]})`
        }
    },

    "set-pen-color": {
        args:[
            ["the_color", "standard"]
        ],
        converter: (arglist) => {
            return `await setPenColor(current_turtle_id, ${arglist[0]})`
        }
    },

    "set-background-color": {
        args:[
            ["the_color", "standard"]
        ],
        converter: (arglist) => {
            return `await setBackgroundColor(current_turtle_id, ${arglist[0]})`
        }
    },

    "stamp-rectangle": {
        args:[
            ["width", "standard"],
            ["height", "standard"]
        ],
        converter: (arglist) => {
            return `await stampRectangle(current_turtle_id, ${arglist[0]},${arglist[1]})`
        }
    },

    "stamp-hollow-rectangle": {
        args:[
            ["width", "standard"],
            ["height", "standard"]
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
            ["width", "standard"],
            ["height", "standard"]
        ],
        converter: (arglist) => {
            return `await stampEllipse(current_turtle_id, ${arglist[0]},${arglist[1]})`
        }
    },

    "stamp-hollow-ellipse": {
        args:[
            ["width", "standard"],
            ["height", "standard"]
        ],
        converter: (arglist) => {
            return `await stampHollowEllipse(current_turtle_id, ${arglist[0]},${arglist[1]})`
        }
    },
    "stamp-circle": {
        args:[
            ["radius", "standard"]
        ],
        converter: (arglist) => {
            return `await stampCircle(current_turtle_id, ${arglist[0]})`
        }
    },

    "stamp-hollow-circle": {
        args:[
            ["radius", "standard"],
        ],
        converter: (arglist) => {
            return `await stampHollowCircle(current_turtle_id, ${arglist[0]})`
        }
    },

    "set-graphics-mode": {
        args:[
            ["the_text", "standard"]
        ],
        converter: (arglist) => {
            return `await setGraphicsMode(current_turtle_id, ${arglist[0]})`
        }
    },

    type: {
        args:[
            ["the_text", "standard"],
        ],
        converter: (arglist) => {
            return `await type(current_turtle_id, ${arglist[0]})`
        }
    },

    "set-type-font": {
        args:[
            ["font_string", "standard"],
        ],
        converter: (arglist) => {
            return `await setTypeFont(current_turtle_id, ${arglist[0]})`
        }
    },

    "set-sprite-size": {
        args:[
            ["the_size", "standard"],
        ],
        converter: (arglist) => {
            return `await setSpriteSize(current_turtle_id, ${arglist[0]})`
        }
    },

    "make-color": {
        args:[
            ["red", "standard"],
            ["green", "standard"],
            ["blue", "standard"]
        ],
        allow_return: true,
        converter: (arglist) => {
            return `await makeColor(${arglist[0]}, ${arglist[1]}, ${arglist[2]})`
        }
    },

    "set-tick-interval": {
        args: [
            ["interval", "standard"],
        ],
        converter: (arglist) => {
            return `await setTickInterval(${arglist[0]})`
        }
    },

    "set-printing-precision": {
        args: [
            ["interval", "standard"],
        ],
        converter: (arglist) => {
            return `await setPrintingPrecision(${arglist[0]})`
        }
    },

    snap: {
        args:[
            ["gbox", "standard"]
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
            ["repeats", "standard"],
            ["actions", "statement_list"]
        ],
        converter: (arglist) => {
            return `
                for (let _i = 0; _i < ${arglist[0]}; ++_i) {
                    if (window.user_aborted) break;
                    ${arglist[1]}
                    await delay(1)
                } 
            `
        }
    },
    change: {
        args: [
            ["boxname", "port_to"],
            ["newval", "standard"]
        ],
        converter: (arglist) => {
            return `await change("${arglist[0]}", ${arglist[1]}, my_node_id)`
        }
    },

    "change-graphics": {
        args: [
            ["boxname", "port_to"],
            ["newval", "standard"]
        ],
        converter: (arglist) => {
            return `await changeGraphics("${arglist[0]}", ${arglist[1]}, my_node_id)`
        }
    },

    setshape: {
        args: [
            ["newval", "standard"]
        ],
        converter: (arglist) => {
            return `await changeGraphicsByName("shape", ${arglist[0]}, my_node_id)`
        }
    },

    setposition: {
        args: [
            ["pos", "standard"]
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
            ["condition", "standard"],
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
            ["condition", "standard"],
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
            ["angle", "standard"],
        ],
        allow_return: true,
        converter: (arglist) => {
            return `sin(${arglist[0]})`
        }
    },

    asin:  {
        args:[
            ["x", "standard"],
            ["y", "standard"]
        ],
        allow_return: true,
        converter: (arglist) => {
            return `asin(${arglist[0]}, ${arglist[1]})`
        }
    },

    cos:  {
        args:[
            ["angle", "standard"],
        ],
        allow_return: true,
        converter: (arglist) => {
            return `cos(${arglist[0]})`
        }
    },

    acos:  {
        args:[
            ["x", "standard"],
            ["y", "standard"]
        ],
        allow_return: true,
        converter: (arglist) => {
            return `acos(${arglist[0]}, ${arglist[1]})`
        }
    },


    tan:  {
        args:[
            ["angle", "standard"],
        ],
        allow_return: true,
        converter: (arglist) => {
            return `tan(${arglist[0]})`
        }
    },

    atan:  {
        args:[
            ["x", "standard"],
            ["y", "standard"]
        ],
        allow_return: true,
        converter: (arglist) => {
            return `atan(${arglist[0]}, ${arglist[1]})`
        }
    },
    sqrt:  {
        args:[
            ["x", "standard"]
        ],
        allow_return: true,
        converter: (arglist) => {
            return `sqrt(${arglist[0]})`
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