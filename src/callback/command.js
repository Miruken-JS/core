import { $isNothing } from "core/base2";
import { CallbackBase } from "./callback";
import { handles } from "./callback-policy";

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
        super(callback);
    }

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

    dispatch(handler, greedy, composer) {
        const count = this.resultCount;
        return handles.dispatch(handler, this, null, composer, greedy) ||
            this.resultCount > count;
    }

    toString() {
        return `Command | ${this.source}`;
    }
}