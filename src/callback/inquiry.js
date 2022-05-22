import {
    Undefined,
    $isNothing,
    $isSomething,
    $classOf
} from "core/base2";

import { Variance } from "core/core";
import { conformsTo } from "core/protocol";
import { $instant } from "core/qualifier";
import { CallbackBase } from "./callback";
import { Binding } from "./binding/binding";
import { BindingScope } from "./binding/binding-scope";
import { BindingMetadata } from "./binding/binding-metadata";
import { provides } from "./callback-policy";
import { createKeyChain } from "core/privates";

const _ = createKeyChain();

/**
 * Callback representing the covariant resolution of a key.
 * @class Inquiry
 * @constructor
 * @param   {any}      key    -  inquiry key
 * @param   {Inquiry}  parent -  parent inquiry
 * @extends CallbackBase
 */
@conformsTo(BindingScope)
export class Inquiry extends CallbackBase {
    constructor(key, parent) {
        if ($isNothing(key)) {
            throw new Error("The key argument is required.");
        }

        super();
        const _this = _(this);

        if ($isSomething(parent)) {
            if (!(parent instanceof Inquiry)) {
                throw new TypeError("The parent is not an Inquiry.");
            }
            _this.parent = parent;
        }

        _this.key      = key;
        _this.instant  = $instant.test(key);
        _this.metadata = new BindingMetadata();
    }

    get key() { return _(this).key; }
    get parent() { return _(this).parent; }
    get handler() { return _(this).handler; }
    get binding() { return _(this).binding; }
    get metadata() { return _(this).metadata; }
    get policy() { return provides.policy; }
    get instant() { return _(this).instant; }

    acceptPromiseResult(promise) {
        return promise.catch(Undefined);
    }

    guardDispatch(handler, binding) {
        if (!this.inProgress(handler, binding)) {
            return function(self, h, b) {
                _(self).handler = handler;
                _(self).binding = binding;
                return function() {
                    _(self).handler = h;
                    _(self).binding = b;
                }
            }(this, _(this).handler, _(this).binding);
        }
    }

    inProgress(handler, binding) {
        return _(this).handler === handler &&
            _(this).binding === binding ||
            (this.parent && this.parent.inProgress(handler, binding));
    }

    dispatch(handler, greedy, composer) {
        let resolved = false;
        if (_(this).metadata.isEmpty) {
            // check if handler implicitly satisfies key
            const implied = Binding.create(this.key);
            if (implied.match($classOf(handler), Variance.Contravariant)) {
                resolved = this.receiveResult(handler, false, composer);
                if (resolved && !greedy) return true;
            }
        }
        const count = this.resultCount;
        resolved = provides.dispatch(handler, this, this.key, composer, greedy) ||
            resolved;

        return resolved || (this.resultCount > count);
    }

    toString() {
        return `Inquiry | ${this.key}`;
    }
}
