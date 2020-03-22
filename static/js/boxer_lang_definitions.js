
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
            return `await right(current_turtle_id, ${arglist[0]})`
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
            return `await setxy(current_turtle_id, ${arglist[0]}, ${arglist[1]})`
        }
    },
    setheading: {
        args: [
            ["angle", "number"]
        ],
        converter: (arglist) => {
            return `await setheading(current_turtle_id, ${arglist[0]})`
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
    }
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
    ">=": ">+"
};

function isOperator(token) {
    return Object.keys(operators).includes(token)
}