import { Base, Undefined, $isFunction } from "core/base2";
import { createKeyChain } from "core/privates";
import { conformsTo } from "core/protocol";
import { Callback } from "./callback";
import { CallbackPolicy, handles } from "./callback-policy";

const _ = createKeyChain();

@conformsTo(Callback)
export class Trampoline extends Base {
    constructor(callback) {
        super();
        if (callback) {
            _(this).callback = callback;
        }
    }

    get callback() { return _(this).callback; }
    get policy() {
        const callback = this.callback;
        return callback && callback.policy;
    }

    getResult(many) {
        const callback = this.callback;
        return callback && callback.getResult(many);
    }

    setResult(result) {
        const callback = this.callback;
        if (callback) {
            callback.setResult(result);
        }
    }

    guardDispatch(handler, binding) {
        const callback = this.callback;
        if (callback) {
            const guardDispatch = callback.guardDispatch;
            if ($isFunction(guardDispatch)) {
                return guardDispatch.call(callback, handler, binding);
            }
        }
        return Undefined;
    }

    dispatch(handler, greedy, composer) {
        const callback = this.callback;
        return callback ?
            CallbackPolicy.dispatch(handler, callback, greedy, composer) :
            handles.dispatch(handler, this, null, composer, greedy);
    }
}