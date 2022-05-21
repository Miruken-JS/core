import {
    Undefined,
    $isNothing,
    $isFunction,
    $classOf,
    $lift
} from "../core/base2";

import { createKey } from "core/privates";
import { Variance } from "core/core";
import { design } from "core/design";
import { $contents } from "core/qualifier";
import { decorate, isDescriptor } from "core/decorate";
import { HandlerDescriptor } from "./handler-descriptor";
import { FilteredScope } from "./filter/filtered-scope";

const _ = createKey();

/**
 * Sentinel indicating callback not handled.
 */
export function $unhandled(result) {
    return result === $unhandled;
}

export class CallbackPolicy extends FilteredScope {
    /**
     * Constructs a callback policy.
     * @method create
     * @param   {Variance}  variance -  policy variance
     * @param   {String}    name     -  policy name 
     */
    constructor(variance, name) {
        super();
        if (new.target === CallbackPolicy) {
            throw new Error("CallbackPolicy cannot be instantiated.  Use CovariantPolicy, ContravariantPolicy, or InvariantPolicy.");
        }
        _(this).variance = variance;
        _(this).name = name;
    }

    get variance() { return _(this).variance; }
    get name() { return _(this).name; }

    /**
     * Registers the handler for the specified constraint.
     * @method addHandler
     * @param   {Any}       owner       -  instance of class handler.
     * @param   {Any}       constraint  -  the constraint to handle.
     * @param   {Function}  handler     -  the handling function.
     * @param   {String}    [key]       -  optional handler key.
     * @param   {Function}  [removed]   -  optional function called on removal.
     * @return  {Function}  returns true if the result satisfies the variance.
     */
    addHandler(owner, constraint, handler, key, removed) {
        if ($isNothing(owner)) {
            throw new Error("The owner argument is required");
        } else if ($isNothing(handler)) {
            handler = constraint;
            constraint = $classOf($contents(constraint));
        }
        if ($isNothing(handler)) {
            throw new Error("The handler argument is required");
        }
        if (Array.isArray(constraint)) {
            if (constraint.length == 1) {
                constraint = constraint[0];
            } else {
                return constraint.reduce((result, c) => {
                    const undefine = addHandler.call(this, owner, c, handler, key, removed);
                    return notifyRemoved => {
                        result(notifyRemoved);
                        undefine(notifyRemoved);
                    };
                }, Undefined);
            }
        }
        return addHandler.call(this, owner, constraint, handler, key, removed);
    }

    /**
     * Removes all handlers for the specified owner.
     * @method removeHandlers
     * @param   {Any} owner  -  handler owner.
     */
    removeHandlers(owner) {
        const descriptor = HandlerDescriptor.get(owner);
        if (descriptor) {
            descriptor.removeBindings(this);
        }
    }

    dispatch(handler, callback, constraint, composer, greedy) {
        const dispatchPolicy = handler.dispatchPolicy;
        if ($isFunction(dispatchPolicy)) {
            return dispatchPolicy.call(handler, this, callback,
                constraint, composer, greedy);
        }
        const descriptor = HandlerDescriptor.get(handler, true);
        return descriptor.dispatch(this, handler, callback,
            constraint, composer, greedy);
    }

    /**
     * Determines if the callback result is valid for the variance.
     * @method acceptResult
     * @param   {Any}    result  -  the callback result
     * @return  {Function}  returns true if the result satisfies the variance.
     */
    acceptResult(result) {
        throw new Error("CallbackPolicy.acceptResult not implemented.");
    }

    /**
     * Defines the relative ordering of bindings.
     * @method compareBinding
     * @param   {Binding}    binding       -  the first binding
     * @param   {Binding}    otherBinding  -  the other binding to compare with.
     * @return  {Function}  0, -1, 1 according to standard comparisons.
     */
    compareBinding(binding, otherBinding) {
        throw new Error("CallbackPolicy.compareBinding not implemented.");
    }

    /**
     * Creates a decorator for the implied policy.
     * @method createDecorator
     * @param  {String}  name       -  the name of the policy
     * @param  {Object}  [options]  -  true to allow property handlers
     */
    static createDecorator(name, options) {
        const policy  = new this(name),
              members = options?.allowClasses === true ? new WeakSet() : null;

        function decorator(...args) {
            return decorate(registerHandlers(name, policy, members, options), args);
        }
        decorator.policy = policy;
        decorator.addHandler = function(...args) {
            return policy.addHandler.apply(policy, args);
        };
        decorator.dispatch = function(...args) {
            return policy.dispatch.apply(policy, args);
        };
        if (!$isNothing(members)) {
            decorator.isDefined = function(target) {
                return members.has(target);
            }
        }
        return decorator;
    }

    static dispatch(handler, callback, greedy, composer) {
        if ($isFunction(callback.dispatch)) {
            return callback.dispatch(handler, greedy, composer);
        }
        return handles.dispatch(handler, callback, null, composer, greedy);
    }
}

export class CovariantPolicy extends CallbackPolicy {
    constructor(name) {
        super(Variance.Covariant, name);
    }

    acceptResult(result) {
        return (result != null) && (result !== $unhandled);
    }

    compareBinding(binding, otherBinding) {
        validateComparer(binding, otherBinding);
        if (otherBinding.match(binding.constraint, Variance.Invariant)) {
            return 0;
        } else if (otherBinding.match(binding.constraint, Variance.Covariant)) {
            return -1;
        }
        return 1;
    }
}

export class ContravariantPolicy extends CallbackPolicy {
    constructor(name) {
        super(Variance.Contravariant, name);
    }

    acceptResult(result) {
        return result !== $unhandled;
    }

    compareBinding(binding, otherBinding) {
        validateComparer(binding, otherBinding);
        if (otherBinding.match(binding.constraint, Variance.Invariant)) {
            return 0;
        } else if (otherBinding.match(binding.constraint, Variance.Contravariant)) {
            return -1;
        }
        return 1;
    }
}

export class InvariantPolicy extends CallbackPolicy {
    constructor(name) {
        super(Variance.Invariant, name);
    }

    acceptResult(result) {
        return (result != null) && (result !== $unhandled);
    }

    compareBinding(binding, otherBinding) {
        validateComparer(binding, otherBinding);
        return otherBinding.match(binding.constraint, Variance.Invariant) ? 0 : -1;
    }
}

function addHandler(owner, constraint, handler, key, removed) {
    if ($isNothing(owner)) {
        throw new Error("The owner argument is required.");
    } else if ($isNothing(handler)) {
        handler = constraint;
        constraint = $classOf($contents(constraint));
    }
    if ($isNothing(handler)) {
        throw new Error("The handler argument is required.");
    }
    if (removed && !$isFunction(removed)) {
        throw new TypeError("The removed argument is not a function.");
    }
    if (!$isFunction(handler)) {
        handler = $lift($contents(handler));
    }
    const descriptor = HandlerDescriptor.get(owner, true);
    return descriptor.addBinding(this, constraint, handler, key, removed);
};

function validateComparer(binding, otherBinding) {
    if ($isNothing(binding)) {
        throw new Error("The binding argument is required.");
    }
    if ($isNothing(otherBinding)) {
        throw new Error("The otherBinding argument is required.");
    }
}

/**
 * Registers methods and properties as handlers.
 * @method registerHandlers
 * @param  {String}         name          -  policy name
 * @param  {CallbackPolicy} policy        -  the policy
 * @param  {WeakSet}        members       -  the set of registered classes
 * @param  {Boolean}        allowClasses  -  true to allow on classes
 * @param  {Boolean}        allowGets     -  true to allow property handlers
 * @param  {Function}       filter        -  optional callback filter
 */
function registerHandlers(name, policy, members, { allowClasses, allowGets, filter } = {}) {
    if ($isNothing(policy)) {
        throw new Error(`The policy for @${name} is required.`);
    }
    return (target, key, descriptor, constraints) => {
        // Base2 classes can have constructor decorators, but real classes
        // can't.  Therefore, we must allow decorators on classes too.
        if ($isNothing(descriptor)) {
            if (!allowClasses) {
                throw new SyntaxError(`@${name} is not allowed on classes.`);
            }
            if (constraints.length > 0) {
                throw new SyntaxError(`@${name} expects no arguments if applied to a class.`);
            }
            if (members?.has(target) !== true) {
                policy.addHandler(target, target, instantiate, "constructor");
                members?.add(target);
            }
            return;
        }
        if (key === "constructor") {
            if (!allowClasses) {
                throw new SyntaxError(`@${name} is not allowed on constructors.`);
            }
            if (constraints.length > 0) {
                throw new SyntaxError(`@${name} expects no arguments if applied to a constructor.`);
            }
            if (members?.has(target) !== true) {
                policy.addHandler(target, "#constructor", instantiate, key);
                members?.add(target);
            }
            return;
        }
        const {get, value } = descriptor;
        if (!$isFunction(value)) {
            if (allowGets) {
                if (!$isFunction(get)) {
                    throw new SyntaxError(`@${name} can only be applied to methods and getters.`);
                }
            } else {
                throw new SyntaxError(`@${name} can only be applied to methods.`);
            }
        }
        if (constraints.length == 0) {
            constraints = null;
            const signature = design.get(target, key);
            if (signature) {
                if (policy.variance === Variance.Contravariant) {
                    const args = signature.args;
                    constraints = args && args.length > 0 ? args[0]?.type : null;
                } else if (policy.variance === Variance.Covariant ||
                    policy.variance === Variance.Invariant) {
                    const typeInfo = signature.returnType || signature.propertyType;
                    if (typeInfo) {
                        constraints = typeInfo.type;
                    }
                }
            }
        }

        function lateBinding() {
            const result = this[key];
            if ($isFunction(result)) {
                return result.apply(this, arguments);
            }
            return allowGets ? result : $unhandled;
        }
        const handler = $isFunction(filter) ? function() {
            return filter.apply(this, [key, ...arguments]) === false ?
                $unhandled :
                lateBinding.apply(this, arguments);
        } : lateBinding;
        policy.addHandler(target, constraints, handler, key);
    };
}

function instantiate() {
    return Reflect.construct(this, arguments);
}

/**
 * Policy for handling callbacks contravariantly.
 * @property {Function} handles
 */
export const handles = ContravariantPolicy.createDecorator("handles");

/**
 * Policy for providing instances covariantly.
 * @property {Function} provides
 */
export const provides = CovariantPolicy.createDecorator("provides", {
    allowClasses: true,
    allowGets: true
});

/**
 * Policy for matching instances invariantly.
 * @property {Function} looksup
 */
export const looksup = InvariantPolicy.createDecorator("looksup", {
    allowClasses: true,
    allowGets: true
});

/**
 * Policy for creating instances covariantly.
 * @property {Function} provides
 */
export const creates = CovariantPolicy.createDecorator("creates");