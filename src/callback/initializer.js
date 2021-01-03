import { $isNothing, $isFunction, $isPromise } from "core/base2";
import { createKey } from "core/privates";
import { conformsTo } from "core/protocol";
import { isDescriptor } from "core/decorate";
import { Inquiry } from "./inquiry";
import { Creation } from "./creation";

import { Filtering, FilteringProvider } from "./filter/filtering";
import { FilteredScope } from "./filter/filtered-scope";
import { filter } from "./filter/filter";

const _ = createKey();

@conformsTo(Filtering)
export class Initializer {
    constructor(initializer) {
        if (!$isFunction(initializer)) {
            throw new Error("The initializer must be a function.");
        }
        _(this).initializer = initializer;
    }

    get order() { return Number.MAX_SAFE_INTEGER - 100; }

    next(callback, { next }) {
        const instance = next();
        return $isPromise(instance)
             ? instance.then(result => _initialize.call(this, result))
             : _initialize.call(this, instance);
    }
}

function _initialize(instance) {
    const initializer = _(this).initializer,
          promise     = initializer.call(instance);
    return $isPromise(promise)
         ? promise.then(() => instance)
         : instance;
}

@conformsTo(FilteringProvider)
export class InitializerProvider {
    constructor(initializer) {
        _(this).initializer = [new Initializer(initializer)];
    }

    get required() { return true; }

    appliesTo(callback) {
        return callback instanceof Inquiry ||
               callback instanceof Creation;
    }

    getFilters(binding, callback, composer) {
        return _(this).initializer;
    }    
}

export function initialize(target, key, descriptor) {
    if (!isDescriptor(descriptor)) {  
        throw new SyntaxError("@initialize cannot be applied to classes.");
    }
    const { value } = descriptor;
    if (!$isFunction(value)) {
        throw new SyntaxError("@initialize can only be applied to methods.");
    }
    descriptor.value = cannotCallInitializer;
    const constructor = target.constructor, 
          filters     = filter.getOrCreateOwn(target, "constructor", () => new FilteredScope());
    if (constructor?.prototype === target) {
        filter.getOrCreateOwn(constructor, "constructor", () => filters);
    }
    filters.addFilters(new InitializerProvider(value));
    return descriptor;
}

function cannotCallInitializer() {
    throw new Error("An @initialize method cannot be called directly.");
}

