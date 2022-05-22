import {
    Base,
    $isNothing,
    $isFunction,
    $isPromise,
    $flatten,
} from "core/base2";

import { Protocol, conformsTo } from "core/protocol";
import { createKeyChain } from "core/privates";

const _ = createKeyChain();

export const Callback = Protocol.extend({
    /**
     * Tags this callback for boundary checking.
     * @property {Any} bounds
     * @readOnly
     */
    get bounds() {},

    /**
     * Returns true if this callback can participate in batching.
     * @property {Boolean} canBatch
     * @readOnly
     */
    get canBatch() {},

    /**
     * Returns true if this callback can participate in filtering.
     * @property {Boolean} canFilter
     * @readOnly
     */    
    get canFilter() {},

    /**
     * Returns true if this callback can participate in inference.
     * @property {Boolean} canInfer
     * @readOnly
     */    
    get canInfer() {},

    /**
     * Gets the callback policy.
     * @property {CallbackPolicy} policy
     * @readOnly
     */
    get policy() {},

    /**
     * Gets the callback source, if present.
     * @property {Any} policy
     * @readOnly
     */
    get source() {},

    /**
     * Determines if results will be added strictly.
     * Strict results will be added as-is while not-strict
     * arrays will be added to results individually.
     * @property {Boolean} strict
     * @readOnly
     */
    get strict() {},

    /**
     * Gets the effective result of the callback.
     * @method getResult
     * @param   {Boolean}  many  -  true for all results
     * @returns {Any} the result. 
     */
    getResult(many) {},
    
    /**
     * Sets the effective result of the callback.
     * @method setResult
     * @param   {Any}  result  -  the result
     */
    setResult(result) {},

    /**
     * Receives a result to be added to the callback.
     * @method dispatch
     * @param   {Any}      result    -  the result
     * @param   {Boolean}  strict    -  true to receive strictly
     * @param   {Handler}  composer  -  composition handler
     * @returns {true} if the result was received. 
     */
    receiveResult(result, strict, composer) {},

    /**
     * Guards the callback dispatch.
     * @method guardDispatch
     * @param   {Object}   handler   -  target handler
     * @param   {Any}      binding   -  usually Binding
     * @returns {Function} truthy if dispatch can proceed.
     * If a function is returned it will be called after
     * the dispatch with *this* callback as the receiver.
     */
    guardDispatch(handler, binding) {},

    /**
     * Dispatches the callback.
     * @method dispatch
     * @param   {Object}   handler     -  target handler
     * @param   {boolean}  greedy      -  true if handle greedily
     * @param   {Handler}  [composer]  -  composition handler
     * @returns {boolean} true if the callback was handled, false otherwise.
     */
    dispatch(handler, greedy, composer) {}
});

@conformsTo(Callback)
export class CallbackBase extends Base {
    constructor() {
        super();
        const _this = _(this);
        _this.results  = [];
        _this.promises = [];
    }

    get policy() {
        throw new Error("Callback.policy not implemented.");
    }

    get resultCount() {
        const { results, promises } = _(this);
        return results.length + promises.length;
    }

    getResult(many) {
        let { result, results, promises } = _(this);
        if (result === undefined) {
            if (promises.length == 0) {
                _(this).result = result = many ? results : results[0];
            } else {
                _(this).result = result = many ?
                    Promise.all(promises).then(() => results) :
                    Promise.all(promises).then(() => results[0]);
            }
        }
        return result;
    }

    setResult(result) { _(this).result = result; }

    addResult(result, composer) {
        if ($isNothing(result)) return false;
        const acceptResult = this.acceptResult;
        if ($isPromise(result)) {
            _(this).promises.push(result.then(res => {
                if (!$isNothing(res)) {
                    if ($isFunction(acceptResult)) {
                        acceptResult.call(this, res, composer);
                    } else {
                     _(this).results.push(res);
                    }
                }
            }));
        } else if ($isFunction(acceptResult)) {
            return acceptResult.call(this, result, composer);
        } else {
            _(this).results.push(result);
        }
        delete _(this).result;
        return true;
    }

    receiveResult(result, strict, composer) {
        if ($isNothing(result)) return false;
        if (strict == null) {
            strict = this.strict;
        }
        if (!strict && Array.isArray(result)) {
            return $flatten(result, true).reduce(
                (s, r) => include.call(this, r, false, composer) || s, false);
        } else {
            return include.call(this, result, strict, composer);
        }
    }

    acceptPromiseResult(promise) {
        return promise;
    }
}

function include(result, strict, composer) {
    if ($isNothing(result)) return false;
    if ($isPromise(result)) {
        if (this.instant) return false;
        const promise = this.acceptPromiseResult(result.then(res => {
            if (strict) {
                this.addResult(res, composer);
            } else if (Array.isArray(res)) {
                res.forEach(r => this.addResult(r, composer));
            } else {
                this.addResult(res, composer);
            }
        }));
        return this.addResult(promise, composer);
    } else if (strict) {
        return this.addResult(result, composer);
    } else if (Array.isArray(result)) {
        result.forEach(r => this.addResult(r, composer));
    } else {
        return this.addResult(result, composer);
    }
}