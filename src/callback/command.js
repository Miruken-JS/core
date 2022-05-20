import {
    Undefined,
    $isNothing,
    $isFunction
} from "core/base2";

import { CallbackBase } from "./callback";
import { handles } from "./callback-policy";
import { createKeyChain } from "core/privates";

const _ = createKeyChain();

/**
 * Callback representing a command with results.
 * @class Command
 * @constructor
 * @param   {Object}  callback  -  callback
 * @extends CallbackBase
 */
export class Command extends CallbackBase {
    constructor(callback) {
        if ($isNothing(callback)) {
            throw new TypeError("The callback argument is required.");
        }
        super();
        const _this = _(this);
        _this.callback = callback;
    }

    get source() { return _(this).callback; }
    get policy() { return handles.policy; }
    get strict() { return true; }
    
    get canBatch() {
        return this.source.canBatch !== false;
    }
    get canFilter() {
        return this.source.canFilter !== false;
    }
    get canInfer() {
        return this.source.canInfer !== false;
    }

    guardDispatch(handler, binding) {
        const callback = this.source;
        if (callback) {
            const guardDispatch = callback.guardDispatch;
            if ($isFunction(guardDispatch)) {
                return guardDispatch.call(callback, handler, binding);
            }
        }
        return Undefined;
    }

    dispatch(handler, greedy, composer) {
        const count = this.resultCount;
        return handles.dispatch(handler, this, null, composer, greedy) ||
            this.resultCount > count;
    }

    toString() {
        return `Command | ${this.source}`;
    }
}