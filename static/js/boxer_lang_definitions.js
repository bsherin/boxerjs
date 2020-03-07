
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
    p5move: {
        args: [
            ["xcoord", "number"],
            ["ycoord", "number"]
        ],
        converter: (arglist) => {
            return `p5Move(${arglist[0]}, ${arglist[1]})`
        }
    },
    p5clear: {
        args: [
        ],
        converter: (arglist) => {
            return `p5Clear()`
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
    rt: "right",
    lt: "left",
    st: "showturtle",
    ht: "hideturtle",
    cs: "reset",
    clearscreen: "reset",
    pu: "penup",
    pd: "pendown"
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