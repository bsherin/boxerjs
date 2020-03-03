
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
    clear: {
        args: [],
        converter: (arglist) => {
            return "clear()"
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
            return `await change("${arglist[0]}", ${arglist[1]})`
        }
    }
};

function isBoxerStatement(token) {
    return Object.keys(boxer_statements).includes(token)
}

let operators = {
    "+": "+",
    "-": "-",
    "=": "==",
    "<": "<",
    ">": ">",
    "<=": "<=",
    ">=": ">+"
};

function isOperator(token) {
    return Object.keys(operators).includes(token)
}