import { $isNothing, $isFunction } from "core/base2";
import { createKeyChain } from "core/privates";
import { Inquiry } from "./inquiry";
import { CallbackPolicy } from "./callback-policy";

const _ = createKeyChain();

export class Resolving extends Inquiry {
    constructor(key, callback, greedy) {
        if ($isNothing(callback)) {
            throw new Error("The callback argument is required.");
        }
        if (callback instanceof Inquiry) {
            super(key, true, callback);
        } else {
            super(key, true);
        }
        _(this).callback = callback;
        _(this).greedy   = !!greedy;
    }

    get callback()  { return _(this).callback; }
    get succeeded() { return _(this).succeeded; }

    guardDispatch(handler, binding) {
        const outer = super.guardDispatch(handler, binding);
        if (outer) {
            const callback      = _(this).callback,
                  guardDispatch = callback.guardDispatch;
            if ($isFunction(guardDispatch)) {
                const inner = guardDispatch.call(callback, handler, binding);
                if (!inner) {
                    if ($isFunction(outer)) {
                        outer.call(this);
                    }
                    return inner;
                }
                if ($isFunction(inner)) {
                    if ($isFunction(outer)) {
                        return function () {
                            inner.call(callback);
                            outer.call(this);
                        }
                    }
                    return inner;
                }
            }
        }
        return outer;
    }

    isSatisfied(resolution, composer) {
        const { greedy, callback, succeeded } = _(this);
        if (!greedy && succeeded) return true;
        const handled  = CallbackPolicy.dispatch(resolution, callback, greedy, composer);
        if (handled) { _(this).succeeded = true; }    
        return handled;
    }

    toString() {
        return `Resolving | ${this.key} => ${this.callback}`;
    }     
}

