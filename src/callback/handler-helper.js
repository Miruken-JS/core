import {
    $isFunction, $isNothing, $isPromise,
    $isPlainObject, $flatten,
} from "core/base2";

import { $decorate } from "core/core";
import { $optional, $contents } from "core/qualifier";
import { TypeFlags } from "core/type-info";
import { Command } from "./command";
import { Lookup } from "./lookup";
import { Inquiry } from "./inquiry";
import { Creation } from "./creation";

import {
    handles, provides, looksup
} from "./callback-policy";

import { Handler } from "./handler";
import { Composition } from "./composition";
import { CascadeHandler } from "./cascade-handler";
import { CompositeHandler } from "./composite-handler";
import { ConstraintBuilder } from "./binding/constraint-builder";
import { KeyResolver } from "./key-resolver";

import { 
    NotHandledError, RejectedError, TimeoutError
} from "./errors";

const defaultKeyResolver = new KeyResolver();

Handler.implement({
    /**
     * Handles the callback.
     * @method $command
     * @param   {Object}  callback  -  callback
     * @returns {Any} optional result
     * @for Handler
     */                        
    $command(callback) {
        const command = new Command(callback);
        if (!this.handle(command, false)) {
            throw new NotHandledError(callback);
        }
        return command.getResult(false);            
    },
    /**
     * Handles the callback greedily.
     * @method $commandAll
     * @param   {Object}  callback  -  callback
     * @returns {Any} optional results.
     * @for Handler
     */                                
    $commandAll(callback) {
        const command = new Command(callback);
        if (!this.handle(command, true)) {
            throw new NotHandledError(callback);
        }
        return command.getResult(true);
    },    
    /**
     * Resolves the key.
     * @method resolve
     * @param   {Any}       key            -  key
     * @param   {Function}  [constraints]  -  optional constraints
     * @returns {Any}  resolved key.  Could be a promise.
     * @for Handler
     * @async
     */                                
    resolve(key, constraints) {
        let inquiry;
        if (key instanceof Inquiry) {
            inquiry = key;
        } else {
            inquiry = new Inquiry(key);
        }
        constraints?.(new ConstraintBuilder(inquiry));
        if (this.handle(inquiry, false)) {
            return inquiry.getResult(false);
        }
    },
    /**
     * Resolves the key greedily.
     * @method resolveAll
     * @param   {Any}       key            -  key
     * @param   {Function}  [constraints]  -  optional constraints
     * @returns {Array} resolved key.  Could be a promise.
     * @for Handler
     * @async
     */                                        
    resolveAll(key, constraints) {
        let inquiry;
        if (key instanceof Inquiry) {
            inquiry = key;
        } else {
            inquiry = new Inquiry(key);
        }
        constraints?.(new ConstraintBuilder(inquiry));
        return this.handle(inquiry, true) ? inquiry.getResult(true) : [];
    },    
    /**
     * Looks up the key.
     * @method $lookup
     * @param   {Any}  key  -  key
     * @returns {Any}  value of key.
     * @for Handler
     */                                        
    $lookup(key) {
        let lookup;
        if (key instanceof Lookup) {
            lookup = key;
        } else {
            lookup = new Lookup(key);
        }        
        if (this.handle(lookup, false)) {
            return lookup.getResult(false);
        }
    },
    /**
     * Looks up the key greedily.
     * @method $lookupAll
     * @param   {Any}  key  -  key
     * @returns {Array}  value(s) of key.
     * @for Handler
     */                                                
    $lookupAll(key) {
        let lookup;
        if (key instanceof Lookup) {
            lookup = key;
        } else {
            lookup = new Lookup(key);
        }        
        return this.handle(lookup, true) ? lookup.getResult(true) : [];
    },
    /**
     * Creates an instance of the `type`.
     * @method $create
     * @param   {Function}  type  -  type
     * @returns {Any} instance of the type.
     * @for Handler
     */                        
    $create(type) {
        const creation = new Creation(type);
        if (!this.handle(creation, false)) {
            throw new NotHandledError(creation);
        }
        return creation.getResult(false);            
    },
    /**
     * Creates instances of the `type`.
     * @method $createAll
     * @param   {Function}  type  -  type
     * @returns {Any} instances of the type.
     * @for Handler
     */                                
    $createAll(type) {
        const creation = new Creation(type);
        if (!this.handle(creation, true)) {
            throw new NotHandledError(creation);
        }
        return creation.getResult(true);
    },      
    /**
     * Decorates the handler.
     * @method $decorate
     * @param   {Object}  decorations  -  decorations
     * @returns {Handler} decorated callback handler.
     * @for Handler
     */        
    $decorate(decorations) {
        return $decorate(this, decorations);
    },
    /**
     * Decorates the handler for filtering callbacks.
     * @method $filter
     * @param   {Function}  filter     -  filter
     * @param   {boolean}   reentrant  -  true if reentrant, false otherwise
     * @returns {Handler} filtered callback handler.
     * @for Handler
     */                                                        
    $filter(filter, reentrant) {
        if (!$isFunction(filter)) {
            throw new TypeError(`Invalid filter: ${filter} is not a function.`);
        }
        return this.$decorate({
            handleCallback(callback, greedy, composer) {
                if (!reentrant && (callback instanceof Composition)) {
                    return this.base(callback, greedy, composer);
                }
                const base = this.base;
                return filter(callback, greedy, composer, () =>
                    base.call(this, callback, greedy, composer));
            }
        });
    },
    /**
     * Accepts a callback explicitly.
     * @method $accepts
     * @param   {Any}       constraint  -  callback constraint
     * @param   {Function}  handler     -  callback handler
     * @returns {Handler} callback handler.
     * @for Handler
     */
    $accepts(constraint, handler) {
        handles.addHandler(this, constraint, handler);
        return this;
    },
    /**
     * Providesa callback explicitly.
     * @method $provides
     * @param  {Any}       constraint  -  callback constraint
     * @param  {Function}  provider    -  callback provider
     * @returns {Handler} callback provider.
     * @for Handler
     */
    $provides(constraint, provider) {
        provides.addHandler(this, constraint, provider);
        return this;
    },    
    /**
     * Decorates the handler for applying aspects to callbacks.
     * @method $aspect
     * @param   {Function}  before     -  before action.  Return false to reject
     * @param   {Function}  action     -  after action
     * @param   {boolean}   reentrant  -  true if reentrant, false otherwise
     * @returns {Handler}  callback handler aspect.
     * @throws  {RejectedError} An error if before returns an unaccepted promise.
     * @for Handler
     */
    $aspect(before, after, reentrant) {
        return this.$filter((callback, greedy, composer, proceed) => {
            if ($isFunction(before)) {
                const test = before(callback, composer);
                if ($isPromise(test)) {
                    const accept = test.then(accepted => {
                        if (accepted !== false) {
                            aspectProceed(callback, greedy, composer, proceed, after, accepted);
                            const getResult = callback.getResult;
                            return $isFunction(getResult)
                                 ? getResult.call(callback, greedy)
                                 : true;
                        }
                        return Promise.reject(new RejectedError(callback));
                    });
                    const setResult = callback.setResult;
                    if ($isFunction(setResult)) {
                        setResult.call(callback, accept);
                    }
                    return true;
                } else if (test === false) {
                    throw new RejectedError(callback);
                }
            }
            return aspectProceed(callback, greedy, composer, proceed, after);
        }, reentrant);
    },
    $resolveArgs(args) {
        if ($isNothing(args) || args.length === 0) {
            return [];
        }
        const resolved = [],
              promises = [];
        for (let i = 0; i < args.length; ++i) {     
            const arg = args[i];
            if ($isNothing(arg)) continue;

            const resolver = arg.keyResolver || defaultKeyResolver,
                  validate = resolver.validate;

            if ($isFunction(validate)) {
                validate.call(resolver, arg);
            }
            
            const dep = resolver.resolve(arg, this);
            if ($isNothing(dep)) return null;
            if ($optional.test(dep)) {
                resolved[i] = $contents(dep);
            } else if ($isPromise(dep)) {
                promises.push(dep.then(result => resolved[i] = result));
            } else {
                resolved[i] = dep;
            }
        }

        if (promises.length === 0) {
            return resolved;
        }
        if (promises.length === 1) {
            return promises[0].then(() => resolved);
        }
        return Promise.all(promises).then(() => resolved);       
    },
    /**
     * Decorates the handler to provide one or more values.
     * @method $with
     * @param   {Array}  ...values  -  values to provide
     * @returns {Handler}  decorated callback handler.
     * @for Handler
     */
    $with(...values) {
        values = $flatten(values, true);
        if (values.length > 0) {
            const provider = this.$decorate();
            values.forEach(value => provides.addHandler(provider, value));
            return provider;
        }
        return this;
    },
    $withKeyValues(keyValues) {
        if ($isPlainObject(keyValues)) {
            const provider = this.$decorate();
            for (let key in keyValues) {
                provides.addHandler(provider, key, keyValues[key]);
            }
            return provider;
        }
        if (keyValues instanceof Map) {
            const provider = this.$decorate();
            for (let [key, value] of keyValues) {
                provides.addHandler(provider, key, value);
            }
            return provider;
        }
        throw new TypeError("The keyValues must be an object literal or Map.");
    },
    $withBindings(target, keyValues) {
        if ($isNothing(target)) {
            throw new Error("The scope argument is required.");
        }
        if ($isPlainObject(keyValues)) {
            function getValue(inquiry, context) {
                if (inquiry.parent?.binding?.constraint === target) {
                    const value = keyValues[inquiry.key];
                    return $isFunction(value) ? value(inquiry, context) : value;
                }
            }
            const provider = this.$decorate();
            for (let key in keyValues) {
                provides.addHandler(provider, key, getValue);
            }
            return provider;
        }
        if (keyValues instanceof Map) {
            function getValue(inquiry) {
                if (inquiry.parent?.binding?.constraint === target) {
                    const value = keyValues.get(inquiry.key);
                    return $isFunction(value) ? value(inquiry, context) : value;
                }
            }            
            const provider = this.$decorate();
            for (let [key, value] of keyValues.keys) {
                provides.addHandler(provider, key, getValue);
            }
            return provider;
        }
        throw new TypeError("The keyValues must be an object literal or Map.");
    },    
    /**
     * Builds a handler chain.
     * @method next
     * @param   {Any}  [...handlers]  -  handler chain members
     * @returns {Handler}  chaining callback handler.
     * @for Handler
     */                                                                                
    $chain(...handlers) {
        switch(handlers.length) {
        case 0:  return this;
        case 1:  return new CascadeHandler(this, handlers[0])
        default: return new CompositeHandler(this, ...handlers);
        }
    },
    /**
     * Prevents continuous or concurrent handling on a target.
     * @method $guard
     * @param   {Object}  target              -  target to guard
     * @param   {string}  [property='guard']  -  property for guard state
     * @returns {Handler}  guarding callback handler.
     * @for Handler
     */        
    $guard(target, property) {
        if (target) {
            let guarded = false;
            property = property || "guarded";
            const propExists = property in target;
            return this.$aspect(() => {
                if ((guarded = target[property])) {
                    return false;
                }
                target[property] = true;
                return true;
            }, () => {
                if (!guarded) {
                    target[property] = undefined;
                    if (!propExists) {
                        delete target[property];
                    }
                }
            });
        }
        return this;
    },
    /**
     * Tracks the activity counts associated with a target. 
     * @method $activity
     * @param   {Object}  target                 -  target to track
     * @param   {Object}  [ms=50]                -  delay to wait before tracking
     * @param   {string}  [property='activity']  -  property for activity state
     * @returns {Handler}  activity callback handler.
     * @for Handler
     */                
    $activity(target, ms, property) {
        property = property || "$$activity";
        const propExists = property in target;            
        return this.$aspect(() => {
            const state = { enabled: false };
            setTimeout(() => {
                if ("enabled" in state) {
                    state.enabled = true;
                    let activity = target[property] || 0;
                    target[property] = ++activity;
                }
            }, !$isNothing(ms) ? ms : 50);
            return state;
        }, (_, composer, state) => {
            if (state.enabled) {
                let activity = target[property];
                if (!activity || activity === 1) {
                    target[property] = undefined;
                    if (!propExists) {
                        delete target[property];
                    }
                } else {
                    target[property] = --activity;
                }
            }
            delete state.enabled;
        });
    },
    /**
     * Ensures all return values are promises..
     * @method $promises
     * @returns {Handler}  promising callback handler.
     * @for Handler
     */                
    $promise() {
        return this.$filter((callback, greedy, composer, proceed) => {
            try {                
                const handled = proceed();
                if (handled) {
                    const result = callback.getResult(greedy);                    
                    callback.setResult($isPromise(result)
                        ? result : Promise.resolve(result));
                }
                return handled;
            } catch (ex) {
                callback.setResult(Promise.reject(ex));
                return true;
            }
        });
    },        
    /**
     * Configures the receiver to set timeouts on all promises.
     * @method $timeout
     * @param   {number}            ms       -  duration before promise times out
     * @param   {Function | Error}  [error]  -  error instance or custom error class
     * @returns {Handler}  timeout callback handler.
     * @for Handler
     */        
    $timeout(ms, error) {
        return this.$filter((callback, greedy, composer, proceed) => {
            const handled = proceed();
            if (handled) {
                const result = callback.getResult(greedy);
                if ($isPromise(result)) {
                    callback.setResult(new Promise(function (resolve, reject) {
                        let timeout;
                        result.then(res => {
                            if (timeout) {
                                clearTimeout(timeout);
                            }
                            resolve(res);
                        }, err => {
                            if (timeout) {
                                clearTimeout(timeout);
                            }
                            reject(err);                                
                        });
                        timeout = setTimeout(function () {
                            if (!error) {
                                error = new TimeoutError(callback);
                            } else if ($isFunction(error)) {
                                error = Reflect.construct(error, [callback]);
                            }
                            if ($isFunction(result.reject)) {
                                result.reject(error);  // TODO: cancel
                            }
                            reject(error);
                        }, ms);
                    }));
                }
            }
            return handled;
        });
    },
});

/**
 * Shortcut for handling a callback.
 * @method
 * @static
 * @param   {Any}       constraint  -  callback constraint
 * @param   {Function}  handler     -  callback handler
 * @returns {Handler} callback handler.
 * @for Handler
 */
Handler.$accepting = function (constraint, handler) {
    const accepting = new Handler();
    handles.addHandler(accepting, constraint, handler);
    return accepting;
};

/**
 * Shortcut for providing a callback.
 * @method
 * @static
 * @param  {Any}       constraint  -  callback constraint
 * @param  {Function}  provider    -  callback provider
 * @returns {Handler} callback provider.
 * @for Handler
 */
Handler.$providing = function (constraint, provider) {
    const providing = new Handler();
    provides.addHandler(providing, constraint, provider);
    return providing;
};

function aspectProceed(callback, greedy, composer, proceed, after, state) {
    let promise;
    try {
        const handled = proceed();
        if (handled) {
            const getResult = callback.getResult;
            if (!$isFunction(getResult)) {
                return handled;
            }
            const result = getResult.call(callback, greedy);
            if ($isPromise(result)) {
                promise = result;
                // Use 'fulfilled' or 'rejected' handlers instead of 'finally' to ensure
                // aspect boundary is consistent with synchronous invocations and avoid
                // reentrancy issues.
                if ($isFunction(after)) {
                    promise.then(result => after(callback, composer, state))
                           .catch(error => after(callback, composer, state));
                }
            }
        }
        return handled;
    } finally {
        if (!promise && $isFunction(after)) {
            after(callback, composer, state);
        }
    }
}
