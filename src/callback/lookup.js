import { Undefined, $isNothing } from "core/base2";
import { $instant } from "core/qualifier";
import { CallbackBase } from "./callback";
import { looksup } from "./callback-policy";
import { createKeyChain } from "core/privates";

const _ = createKeyChain();

/**
 * Callback representing the invariant lookup of a key.
 * @class Lookup
 * @constructor
 * @param   {Any}  key  -  lookup key
 * @extends CallbackBase
 */
export class Lookup extends CallbackBase {
    constructor(key) {
        if ($isNothing(key)) {
            throw new Error("The key argument is required.");
        }

        super();
        const _this = _(this);
        _this.key     = key;
        _this.instant = $instant.test(key);
    }

    get key() { return _(this).key; }
    get policy() { return lookups.policy; }
    get instant() { return _(this).instant; }

    acceptPromiseResult(promise) {
        return promise.catch(Undefined);
    }

    dispatch(handler, greedy, composer) {
        const count = this.resultCount;
        return looksup.dispatch(handler, this, this.key, composer, greedy) ||
            this.resultCount > count;
    }

    toString() {
        return `Lookup | ${this.key}`;
    }
}
