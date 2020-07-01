import {doBinding} from "./utility/utilities.js";
import {addToBuffer, changeNodePure} from "./redux/actions/action_creators.js";
import {addGraphicsComponent, changeNode} from "./redux/actions/composite_actions.js";

export {GraphicsNode}

class GraphicsNode {
    constructor(param_dict) {
        doBinding(this);
        for (let k in param_dict) {
            this[k] = param_dict[k]
        }
        this.saveParams = Object.keys(param_dict);
    }
    clearComponents(callback=null, buffer=true) {

        window.vstore.dispatch(changeNodePure(this.unique_id, "drawn_components", []));
        if (buffer) {
            window.vstore.dispatch(addToBuffer(changeNodePure(this.unique_id, "drawn_components", [])));
        }

        callback()
    }

    setWrap(wrap, buffer=true) {
        window.vstore.dispatch(changeNodePure(this.unique_id, "do_wrap", wrap))
        if (buffer) {
            window.vstore.dispatch(addToBuffer(changeNodePure(this.unique_id, "do_wrap", wrap)))
        }
    }


    setBgColor(color, buffer=true) {
        window.vstore.dispatch(changeNodePure(this.unique_id, "bgColor", color));
        if (buffer) {
            window.vstore.dispatch(addToBuffer(changeNodePure(this.unique_id, "bgColor", color)));
        }
    }

    addGraphicsComponent(the_comp, callback=null, buffer=true) {
        window.vstore.dispatch(addGraphicsComponent(this.unique_id, the_comp, buffer)).then(callback);
    }

}