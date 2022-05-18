import { 
    Undefined, pcopy, $isNothing, $isPromise
} from "core/base2";

import { HandlerDescriptor } from "./handler-descriptor";
import { Handler } from "./handler";
import { Resolving } from "./resolving";
import { $unhandled } from "./callback-policy";
import { NotHandledError } from "./errors";

export class InferenceHandler extends Handler {
    constructor(...types) {
        super();
        const owners     = new Set(),
              descriptor = HandlerDescriptor.get(this, true);  
        for (const type of types.flat()) {
            addStaticBindings(type, descriptor);
            addInstanceBindings(type, descriptor, owners);
        }
        this.extend({
            dispatchPolicy(policy, callback, constraint, composer, greedy, results) {
                const infer = pcopy(this)
                infer.greedy = greedy;
                return descriptor.dispatch(policy, infer, callback,
                    constraint, composer, greedy, results);
            }
        });
    }
}

function addStaticBindings(type, inferDescriptor) {
    const typeDescriptor = HandlerDescriptor.get(type);
    if (!$isNothing(typeDescriptor)) {
        for (const [policy, bindings] of typeDescriptor.bindings) {
            for (const binding of bindings) {
                const typeBinding = pcopy(binding);
                typeBinding.handler = binding.handler.bind(type);
                inferDescriptor.addBinding(policy, typeBinding);
            }
        }
    }
}

function addInstanceBindings(type, inferDescriptor, owners) {
    const prototype = type.prototype;
    if ($isNothing(prototype) || owners.has(prototype)) return;
    function inferShim(...args) {
        return infer.call(this, type, ...args);
    }
    for (const descriptor of HandlerDescriptor.getChain(prototype)) {
        if (!owners.add(descriptor.owner)) break;
        for (const [policy, bindings] of descriptor.bindings) {
            const indexes = new Set()
            for (const binding of bindings) {
                const index = binding.createIndex(policy.variance);
                if (indexes.has(index)) continue;
                indexes.add(index);
                const instanceBinding = pcopy(binding);
                instanceBinding.handler           = inferShim;
                instanceBinding.getMetadata       = Undefined;
                instanceBinding.getParentMetadata = Undefined;
                instanceBinding.skipFilters       = true;
                inferDescriptor.addBinding(policy, instanceBinding);
            }
        }
    }
}

function infer(type, _, { callback, composer, results }) {
    if (callback.canInfer === false) {
        return $unhandled;
    }
    let resolved = this.resolved;
    if (resolved == null) {
        this.resolved = resolved = new Set();
        resolved.add(type)
    } else if (!resolved.has(type)) {
         resolved.add(type)
    } else {
         return $unhandled;
    }
    const resolving = new Resolving(type, callback, this.greedy);
    if (!composer.handle(resolving)) {
        return $unhandled;
    }
    if (results) {
        const result = resolving.callbackResult;
        if ($isPromise(result)) {
            results(result.then(() => {
                if (!resolving.succeeded) {
                    throw new NotHandledError(callback);
                }
            }));
        }
    }
}
