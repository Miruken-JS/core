import { 
    Base, Module, $isNothing,
    $isFunction, $isObject, $flatten
} from "./base2";

import { 
    Protocol, StrictProtocol, protocol,
    conformsTo, $isProtocol
} from "./protocol";

import { Enum } from "./enum";
import { Metadata } from "./metadata";
import "reflect-metadata";

const baseExtend      = Base.extend,
      baseImplement   = Base.implement,
      baseProtoExtend = Base.prototype.extend;

/**
 * Type of property method.
 * @class PropertyType
 * @extends Enum
 */
export const MethodType = Enum({
    /**
     * Getter property method
     * @property {number} Get
     */
    Get: 1,
    /**
     * Setter property method
     * @property {number} Set
     */    
    Set: 2,
    /**
     * Method invocation
     * @property {number} Invoke
     */        
    Invoke: 3
});

/**
 * Variance enum
 * @class Variance
 * @extends Enum
 */
export const Variance = Enum({
    /**
     * Matches a more specific type than originally specified.
     * @property {number} Covariant
     */
    Covariant: 1,
    /**
     * Matches a more generic (less derived) type than originally specified.
     * @property {number} Contravariant
     */        
    Contravariant: 2,
    /**
     * Matches only the type originally specified.
     * @property {number} Invariant
     */        
    Invariant: 3
});

Base.extend = function (...args) {
    let constraints = args, decorators = [];
    if (this === Protocol) {
        decorators.push(protocol);
    } else if ($isProtocol(this)) {
        decorators.push(protocol, conformsTo(this));
    }
    if (args.length > 0 && Array.isArray(args[0])) {
        constraints = args.shift();
    }
    while (constraints.length > 0) {
        const constraint = constraints[0];
        if (!constraint) {
            break;
        } else if ($isProtocol(constraint)) {
            decorators.push(conformsTo(constraint));
        } else if (constraint.prototype instanceof Base ||
                   constraint.prototype instanceof Module) {
            decorators.push(mixin(constraint));
        } else if ($isFunction(constraint)) {
            decorators.push(constraint);
        } else {
            break;
        }
        constraints.shift();
    }
    let members      = args.shift() || {},
        classMembers = args.shift() || {},
        derived      = baseExtend.call(this, members, classMembers);
    Metadata.copyOwn(derived, classMembers);
    Metadata.copyOwn(derived.prototype, members);
    if (decorators.length > 0) {
        derived = Reflect.decorate(decorators, derived);
    }
    return derived;                    
};

Base.implement = function (source) {
    if (source && $isProtocol(this) && $isObject(source)) {
        source = protocol(source) || source;
    }
    var type = baseImplement.call(this, source);
    Metadata.mergeOwn(type.prototype, source);
    return type;
}

Base.prototype.extend = function (key, value) {
    if (!key) return this;
    const numArgs = arguments.length;
    if (numArgs === 1) {
        if (this instanceof Protocol) {
            key = protocol(key) || key;
        }
        const instance = baseProtoExtend.call(this, key);
        Metadata.mergeOwn(instance, key);            
        return instance;
    }
    return baseProtoExtend.call(this, key, value);
}

/**
 * Decorates a class with behaviors to mix in.
 * @method mixin
 * @param    {Array}    ...behaviors  -  behaviors
 * @returns  {Function} the mixin decorator.
 */
export function mixin(...behaviors) {
    behaviors = $flatten(behaviors, true);
    return function (target) {
        if (behaviors.length > 0 && $isFunction(target.implement)) {
            behaviors.forEach(b => target.implement(b));
        }
    };
}

/**
 * Protocol for targets that manage initialization.
 * @class Initializing
 * @extends Protocol
 */
export const Initializing = Protocol.extend({
    /**
     * Perform any initialization after construction..
     */
    initialize() {}
});

/**
 * Protocol for targets that have parent/child relationships.
 * @class Parenting
 * @extends Protocol
 */
export const Parenting = Protocol.extend({
    /**
     * Creates a new child of the parent.
     * @method newChild
     * @returns {Object} the new child.
     */
    newChild() {}
});

/**
 * Protocol for targets that can be started.
 * @class Starting
 * @extends Protocol
 */
export const Starting = Protocol.extend({
    /**
     * Starts the reciever.
     * @method start
     */
    start() {}
});

/**
 * Base class for startable targets.
 * @class Startup
 * @uses Starting
 * @extends Base
 */
@conformsTo(Starting)
export class Startup extends Base {
    start() {}
}

/**
 * Creates a decorator builder.<br/>
 * See [Decorator Pattern](http://en.wikipedia.org/wiki/Decorator_pattern)
 * @method
 * @param   {Object}   decorations  -  object defining decorations
 * @erturns {Function} function to build decorators.
 */
export function $decorator(decorations) {
    return function (decoratee) {
        if ($isNothing(decoratee)) {
            throw new TypeError("No decoratee specified.");
        }
        const decorator = Object.create(decoratee);
        Object.defineProperty(decorator, "getDecoratee", {
            configurable: false,
            value:        () => decoratee
        });
        if (decorations && $isFunction(decorator.extend)) {
            decorator.extend(decorations);
        }
        return decorator;
    }
}

/**
 * Decorates an instance using the 
 * [Decorator Pattern](http://en.wikipedia.org/wiki/Decorator_pattern).
 * @method
 * @param   {Object}   decoratee    -  decoratee
 * @param   {Object}   decorations  -  object defining decorations
 * @erturns {Function} function to build decorators.
 */
export function $decorate(decoratee, decorations) {
    return $decorator(decorations)(decoratee);
}

/**
 * Gets the decoratee used in the  
 * [Decorator Pattern](http://en.wikipedia.org/wiki/Decorator_pattern).
 * @method
 * @param   {Object}   decorator  -  possible decorator
 * @param   {boolean}  deepest    -  true if deepest decoratee, false if nearest.
 * @erturns {Object}   decoratee if present, otherwise decorator.
 */
export function $decorated(decorator, deepest) {
    let getDecoratee, decoratee;
    while (decorator &&
           (getDecoratee = decorator.getDecoratee) &&
           $isFunction(getDecoratee) &&
           (decoratee = getDecoratee())) {
        if (!deepest) return decoratee;
        decorator = decoratee;
    }
    return decorator;
}

export const $compose2 = (f, g)   => (...args) => f(g(...args))
export const $compose  = (...fns) => fns.reduce($compose2);
export const $pipe     = (...fns) => fns.reduceRight($compose2);

function isUpperCase(char) {
    return char.toUpperCase() === char;
}
