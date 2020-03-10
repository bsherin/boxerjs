
export {boxer_statements, operators, isOperator, isBoxerStatement}

let boxer_statements = {
    forward: {
        args: [
            ["steps", "number"]
        ],
        converter: (arglist) => {
            return `forward(${arglist[0]})`
        }
    },
    back: {
        args: [
            ["steps", "number"]
        ],
        converter: (arglist) => {
            return `back(${arglist[0]})`
        }
    },
    right: {
        args: [
            ["angle", "number"]
        ],
        converter: (arglist) => {
            return `right(${arglist[0]})`
        }
    },
    left: {
        args: [
            ["angle", "number"]
        ],
        converter: (arglist) => {
            return `left(${arglist[0]})`
        }
    },
    clear: {
        args: [],
        converter: (arglist) => {
            return "clear()"
        }
    },
    clean: {
        args: [],
        converter: (arglist) => {
            return "clean()"
        }
    },
    penup: {
        args: [],
        converter: (arglist) => {
            return "penup()"
        }
    },
    pendown: {
        args: [],
        converter: (arglist) => {
            return "pendown()"
        }
    },
    setxy: {
        args: [
            ["xcoord", "number"],
            ["ycoord", "number"]
        ],
        converter: (arglist) => {
            return `setxy(${arglist[0]}, ${arglist[1]})`
        }
    },
    setheading: {
        args: [
            ["angle", "number"]
        ],
        converter: (arglist) => {
            return `setheading(${arglist[0]})`
        }
    },
    showturtle: {
        args: [],
        converter: (arglist) => {
            return "showTurtle()"
        }
    },
    hideturtle: {
        args: [],
        converter: (arglist) => {
            return "hideTurtle()"
        }
    },
    "set-pen-width": {
        args:[
            ["width", "number"]
        ],
        converter: (arglist) => {
            return `setPenWidth(${arglist[0]})`
        }
    },

    "set-pen-color": {
        args:[
            ["the_color", "boxorstring"]
        ],
        converter: (arglist) => {
            return `setPenColor(${arglist[0]})`
        }
    },

    "set-background-color": {
        args:[
            ["the_color", "boxorstring"]
        ],
        converter: (arglist) => {
            return `setBackgroundColor(${arglist[0]})`
        }
    },

    "stamp-rectangle": {
        args:[
            ["width", "number"],
            ["height", "number"]
        ],
        converter: (arglist) => {
            return `stampRectangle(${arglist[0]},${arglist[1]})`
        }
    },

    "stamp-hollow-rectangle": {
        args:[
            ["width", "number"],
            ["height", "number"]
        ],
        converter: (arglist) => {
            return `stampHollowRectangle(${arglist[0]},${arglist[1]})`
        }
    },
    dot: {
        args: [],
        converter: (arglist) => {
            return "dot()"
        }
    },
    "stamp-ellipse": {
        args:[
            ["width", "number"],
            ["height", "number"]
        ],
        converter: (arglist) => {
            return `stampEllipse(${arglist[0]},${arglist[1]})`
        }
    },

    "stamp-hollow-ellipse": {
        args:[
            ["width", "number"],
            ["height", "number"]
        ],
        converter: (arglist) => {
            return `stampHollowEllipse(${arglist[0]},${arglist[1]})`
        }
    },
    "stamp-circle": {
        args:[
            ["radius", "number"]
        ],
        converter: (arglist) => {
            return `stampCircle(${arglist[0]})`
        }
    },

    "stamp-hollow-circle": {
        args:[
            ["radius", "number"],
        ],
        converter: (arglist) => {
            return `stampHollowCircle(${arglist[0]})`
        }
    },

    "set-graphics-mode": {
        args:[
            ["the_text", "text"]
        ],
        converter: (arglist) => {
            return `setGraphicsMode(${arglist[0]})`
        }
    },

    type: {
        args:[
            ["the_text", "text"],
        ],
        converter: (arglist) => {
            return `type(${arglist[0]})`
        }
    },

    "set-type-font": {
        args:[
            ["font_string", "text"],
        ],
        converter: (arglist) => {
            return `setTypeFont(${arglist[0]})`
        }
    },

    "set-sprite-size": {
        args:[
            ["the_size", "number"],
        ],
        converter: (arglist) => {
            return `setSpriteSize(${arglist[0]})`
        }
    },

    reset: {
        args: [],
        converter: (arglist) => {
            return "reset()"
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