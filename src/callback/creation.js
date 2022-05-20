import { $isNothing } from "core/base2";
import { CallbackBase } from "./callback";
import { creates } from "./callback-policy";
import { createKeyChain } from "core/privates";

const _ = createKeyChain();

/**
 * Callback representing the covariant creation of a type.
 * @class Creation
 * @constructor
 * @param   {Function}  type  -  type to create
 * @extends CallbackBase
 */
export class Creation extends CallbackBase {
    constructor(type) {
        if ($isNothing(type)) {
            throw new TypeError("The type argument is required.");
        }
        super();
        const _this = _(this);
        _this.type = type;
    }

    get type() { return _(this).type; }
    get policy() { return creates.policy; }

    dispatch(handler, greedy, composer) {
        const count = this.resultCount;
        return creates.dispatch(handler, this, this.type, composer, greedy)
            || this.resultCount > count;
    }

    toString() {
        return `Creation | ${this.type}`;
    }
}