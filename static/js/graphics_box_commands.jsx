import {doBinding} from "./utilities";


export {GraphicsNode}


class GraphicsNode {
    constructor(param_dict) {
        doBinding(this);
        for (let k in param_dict) {
            this[k] = param_dict[k]
        }
        this.saveParams = Object.keys(param_dict);
    }
    clearComponents(callback=null) {
        window.changeNode(this.unique_id, "drawn_components", [], callback)
    }

    setWrap(wrap) {
        window.changeNode(this.unique_id, "do_wrap", wrap)
    }


    setBgColor(color) {
        window.changeNode(this.unique_id, "bgColor", color);
    }

    addGraphicsComponent(the_comp, callback=null) {
        window.addGraphicsComponent(this.unique_id, the_comp, callback)
    }

}