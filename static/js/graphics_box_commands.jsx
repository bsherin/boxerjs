import {doBinding} from "./utility/utilities.js";
import {changeNode} from "./redux/actions/core_actions.js";
import {addGraphicsComponent} from "./redux/actions/composite_actions.js";

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
        window.store.dispatch(changeNode(this.unique_id, "drawn_components", []));
        callback()
    }

    setWrap(wrap) {
        window.store.dispatch(changeNode(this.unique_id, "do_wrap", wrap))
    }


    setBgColor(color) {
        window.store.dispatch(changeNode(this.unique_id, "bgColor", color));
    }

    addGraphicsComponent(the_comp, callback=null) {
        window.store.dispatch(addGraphicsComponent(this.unique_id, the_comp)).then(callback);
    }

}