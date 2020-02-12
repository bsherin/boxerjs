
export {doBinding, isString}

function doBinding(obj, seq = "_") {
    const proto = Object.getPrototypeOf(obj);
    for (const key of Object.getOwnPropertyNames(proto)) {
        if (key.startsWith(seq)) {
            obj[key] = obj[key].bind(obj);
        }
    }
}

function isString (value) {
    return typeof value === 'string' || value instanceof String;
}