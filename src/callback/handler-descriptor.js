import { 
    Base, Abstract, $isNothing,
    $isFunction, $isString, $isPromise,
    $classOf, $isObject, pcopy
} from "core/base2";

import { createKey } from "core/privates";
import { Variance } from "core/core";
import { IndexedList } from "core/util";
import { Metadata } from "core/metadata";
import { TypeFlags } from "core/type-info";
import { design } from "core/design";
import { $eq, $optional, $contents } from "core/qualifier";
import { Binding } from "./binding/binding";
import { Inquiry } from "./inquiry";
import { KeyResolver } from "./key-resolver";
import { Filtering } from "./filter/filtering";
import { FilteredScope } from "./filter/filtered-scope";
import { FilterInstanceProvider } from "./filter/filter-instance-provider";
import { filter } from "./filter/filter";
import { NotHandledError } from "./errors";

const _ = createKey(),
      defaultKeyResolver = new KeyResolver(),
      descriptorMetadataKey = Symbol("descriptor-metadata");

export class HandlerDescriptor extends FilteredScope {
    constructor(owner) {
        if ($isNothing(owner)) {
            throw new Error("The owner argument is required.");
        }
        super();
        _(this).owner    = owner;
        _(this).bindings = new Map();
    }

    get owner()    { return _(this).owner; }
    get policies() { return [..._(this).bindings.keys()]; }
    get bindings() { return [..._(this).bindings.entries()]; }

    getBindings(policy) {
        requireValidPolicy(policy);
        return _(this).bindings.get(policy);
    }

    addBinding(policy, constraint, handler, key, removed) {
        requireValidPolicy(policy);
        const binding = constraint instanceof Binding ? constraint
            : Binding.create(constraint, this.owner, handler, key, removed);
        return addBinding.call(this, policy, binding);
    }

    removeBindings(policy) {
        requireValidPolicy(policy);

        const owner          = this.owner,
              bindings       = _(this).bindings,
              policyBindings = bindings.get(policy);
        if (policyBindings == null) return;

        for (const binding of policyBindings) {
            if ($isFunction(binding.removed)) {
                binding.removed(owner);
            }
        }

        bindings.delete(policy);
    }

    dispatch(
        policy, 
        handler,
        callback,
        constraint,
        composer,
        greedy
    ) {
        requireValidPolicy(policy);

        let variance = policy.variance;
        constraint = constraint || callback.source || callback;
         
        if (constraint) {
            if ($eq.test(constraint)) {
                variance = Variance.Invariant;
            }
            constraint = $contents(constraint);
            if ($isObject(constraint)) {
                constraint = $classOf(constraint);
            }
        }

        const binding = Binding.create(constraint),
              index   = binding.createIndex(variance);

        let dispatched = false;
        for (const descriptor of this.getDescriptorChain(true)) {
            dispatched = dispatch.call(descriptor, policy, handler, callback,
                constraint, index, variance, composer, greedy)
                      || dispatched;
            if (dispatched && !greedy) return true;
        }
        
        return dispatched; 
    }

    *getDescriptorChain(includeSelf) {
        if (includeSelf) yield this;
        yield* HandlerDescriptor.getChain(Object.getPrototypeOf(this.owner));
    }

    /**
     * Metadata management methods.
     * The following methods are used to support the metadata
     * system when base2 classes are used.  The instance and
     * static object literals will be decorated first so it
     * is necessary to copy or merge their metadata on to
     * the correct classes or prototypes.
     */

    copyMetadata(target, source, sourceKey) {
        if (sourceKey) return;
        const targetDescriptor = HandlerDescriptor.get(target, true);
         for (const [policy, bindings] of this.bindings) {
            for (const binding of bindings) {
                // Base2 classes can have constructor decorators.
                if (binding.constraint == "#constructor") {
                    const clazz           = $classOf(target),
                          classDescriptor = HandlerDescriptor.get(clazz, true),
                          constructor     = Binding.create(
                              clazz, target, binding.handler.bind(clazz), "constructor");
                    addBinding.call(classDescriptor, policy, constructor);
                } else {
                    binding.owner = target;
                    addBinding.call(targetDescriptor, policy, binding);
                }
            }
        }
        return targetDescriptor;
    }

    mergeMetadata(sourceDescriptor, target, source, sourceKey) {
        if ($classOf(sourceDescriptor) !== $classOf(this)) {
            throw new TypeError("mergeMetadata expects a HandlerDescriptor.");
        }
        if (sourceKey) return;
        for (const [policy, bindings] of sourceDescriptor.bindings) {
            for (const binding of bindings) {
                binding.owner = target;
                addBinding.call(this, policy, binding);
            }
        }
    }

    static get(owner, create) {
        if (create) {
            return Metadata.getOrCreateOwn(
                descriptorMetadataKey, owner, () => new this(owner));
        }
        return Metadata.getOwn(descriptorMetadataKey, owner);
    }

    static *getChain(target) {
        while (target && target !== Base.prototype &&
               target !== Object.prototype && target !== Abstract.prototype) {
            const descriptor = HandlerDescriptor.get(target);
            if (descriptor) yield descriptor;
            target = Object.getPrototypeOf(target);
        }
    }

    static remove(owner) {
        return Metadata.remove(descriptorMetadataKey, owner);
    }
}

function addBinding(policy, binding) {
    const owner    = _(this).owner,
          bindings = _(this).bindings;
          
    let policyBindings = bindings.get(policy);
    if (policyBindings == null) {
        policyBindings = new IndexedList(policy.compareBinding.bind(policy));
        bindings.set(policy, policyBindings);
    }

    const index = binding.createIndex(policy.variance);
    policyBindings.insert(binding, index);

    return function (notifyRemoved) {
        policyBindings.remove(binding);
        if (policyBindings.isEmpty) {
            bindings.delete(policy);
        }
        if ($isFunction(binding.removed) && (notifyRemoved !== false)) {
            binding.removed(owner);
        }
    };
}

function dispatch(
    policy,
    target,
    callback,
    constraint,
    index,
    variance,
    composer,
    greedy    
) {
    let dispatched = false;
    const bindings = this.getBindings(policy);
    if (bindings == null) return false;
    const invariant = (variance === Variance.Invariant);
    if (!invariant || index) {
        for (let binding of bindings.fromIndex(index)) {
            if (binding.match(constraint, variance)) {
                let reset;
                const guardDispatch = callback.guardDispatch;
                if ($isFunction(guardDispatch)) {
                    reset = guardDispatch.call(callback, target, binding);
                    if (!reset) continue;
                }
                try {
                    let filters, result, completed = true;
                    if (callback.canFilter !== false) {
                        filters = resolveFilters.call(
                            this, policy, target, callback, binding, composer);
                        if ($isNothing(filters)) continue;
                    }
                    if ($isNothing(filters) || filters.length == 0) {
                        const signature = binding.getMetadata(design),
                              args      = resolveArgs.call(this, callback, binding, signature, composer);
                        if ($isNothing(args)) continue;
                        const context = { constraint, binding, callback, greedy, composer },
                              handler = binding.handler;
                        result = $isPromise(args)
                               ? args.then(a => handler.call(target, ...a, context))
                               : handler.call(target, ...args, context);
                    } else {
                        result = filters.reduceRight((next, pipeline) => (comp, proceed) => {
                            if (proceed) {
                                const filter    = pipeline.filter,
                                      signature = design.get(filter, "next"),
                                      args      = resolveArgs.call(this, callback, binding, signature, comp);
                                if (!$isNothing(args)) {
                                    const provider = pipeline.provider, context  = {
                                        binding, callback, provider, composer: comp,
                                        next: (c, p) => next(
                                            c != null ? c : comp, 
                                            p != null ? p : true),
                                        abort: () => next(null, false)
                                    };
                                    return $isPromise(args)
                                         ? args.then(a => filter.next(...a, context))
                                         : filter.next(...args, context);
                                }
                            }
                            completed = false;
                        }, (comp, proceed) => {
                            if (proceed) {
                                const signature = binding.getMetadata(design),
                                      args      = resolveArgs.call(this, callback, binding, signature, comp);
                                if ($isNothing(args)) {
                                    completed = false;
                                    return Promise.reject(new NotHandledError(callback,
                                        `'${binding.key}' is missing one or more dependencies.`));
                                }
                                const context = { constraint, binding, callback, composer: comp },
                                      handler = binding.handler;
                                return $isPromise(args)
                                     ? args.then(a => handler.call(target, ...a, context))
                                     : handler.call(target, ...args, context); 
                            }
                            completed = false;
                        })(composer, true);
                    }
                    if (completed && policy.acceptResult(result)) {
                        if ($isNothing(result) ||
                            callback.receiveResult(result, null, composer) !== false) {
                            if (!greedy) return true;
                            dispatched = true;
                        }
                    }
                } finally {
                    if ($isFunction(reset)) {
                        reset.call();
                    }
                }
            } else if (invariant) {
                break;  // stop matching if invariant not satisifed
            }
        }
    }
    return dispatched;
}

function resolveFilters(policy, target, callback, binding, composer) {
    const targetFilter = Filtering.isAdoptedBy(target)
                       ? new FilterInstanceProvider([target], true)
                       : null;
    return composer.$getOrderedFilters(binding, callback, [
        binding.getMetadata(filter), binding.getParentMetadata(filter),
        this, policy, targetFilter
    ]);
}

function resolveArgs(callback, binding, signature, composer) {
    // prefer callback if unconstrained binding
    const source = binding.constraint == null
                 ? callback : callback.source || callback;

    if ($isNothing(signature)) {
        return [source];
    }
    const { args } = signature;
    if ($isNothing(args) || args.length === 0) {
        return [source];
    }

    const resolved = [], promises = [];

    for (let i = 0; i < args.length; ++i) {     
        const arg = args[i];
        if ($isNothing(arg)) {
            if (i === 0) {
                resolved[0] = source;
            }
            continue;
        }

        if (i === 0 && $isNothing(arg.keyResolver)) {
            if (arg.validate(source)) {
                resolved[0] = source;
                continue;
            }
            if (arg.validate(callback)) {
                resolved[0] = callback;
                continue;
            }
        }

        const resolver = arg.keyResolver || defaultKeyResolver,
              validate = resolver.validate;

        if ($isFunction(validate)) {
            validate.call(resolver, arg);
        }
        
        const parent = callback instanceof Inquiry ? callback : null,
              dep    = resolver.resolve(arg, composer, parent);
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
}

function requireValidPolicy(policy) {
    if ($isNothing(policy)) {
        throw new Error("The policy argument is required.")
    }
}
