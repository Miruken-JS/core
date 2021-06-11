import { 
    $isNothing, $isFunction, $isString,
    $classOf, assignID
} from "core/base2";

import { Variance } from "core/core";
import { $isProtocol } from "core/protocol";
import { $eq, $eval, $contents } from "core/qualifier";

export class Binding {
    constructor(constraint, owner, handler, key, removed) {
        if (new.target === Binding) {
             throw new Error("Binding cannot be instantiated.  Use Binding.create().");
        }
        this.constraint = constraint;
        this.owner      = owner;
        this.handler    = handler;
        this.key        = key;
        if (!$isNothing(removed)) {
            if (!$isFunction(removed))
                throw new Error("The removed argument is not a function.");
            this.removed = removed;
        }
    }

    createIndex(variance) {}

    getMetadata(metadata) {
        if ($isNothing(metadata)) {
            throw new Error("The metadata is required.");
        }
        const get = metadata.get;
        if (!$isFunction(get)) {
            throw new Error("The metadata.get method is missing.");
        }
        const key = this.key;
        if ($isNothing(key)) return;
        const owner = this.owner;
        if ($isNothing(owner)) return;
        return get.call(metadata, owner, key);
    }

    getParentMetadata(metadata) {
        if ($isNothing(metadata)) {
            throw new Error("The metadata is required.");
        }
        const get = metadata.get;
        if (!$isFunction(get)) {
            throw new Error("The metadata.get method is missing.");
        }
        const key = this.key;
        if ($isNothing(key)) return;
        const owner  = this.owner,
              parent = $isFunction(owner) ? owner : $classOf(owner);
        return get.call(metadata, parent); 
    }

    static create(constraint, owner, handler, key, removed) {
        let bindingType;
        const invariant = $eq.test(constraint),
              custom    = $eval.test(constraint);
        constraint = $contents(constraint);
        if ($isNothing(constraint)) {
            bindingType = invariant ? BindingNone : BindingEverything;
        } else if (custom) {
            bindingType = BindingCustom;
        } else if ($isProtocol(constraint)) {
            bindingType = invariant ? BindingInvariant : BindingProtocol;
        } else if ($isFunction(constraint)) {
            bindingType = invariant ? BindingInvariant : BindingClass;
        } else if ($isString(constraint)) {
            bindingType = BindingString;
        } else if (constraint instanceof RegExp) {
            bindingType = invariant ? BindingNone : BindingRegExp;
        } else {
            bindingType = BindingNone;
        }
        return new bindingType(constraint, owner, handler, key, removed);
    }
}

class BindingNone extends Binding {
    match() { return false; }
}

class BindingInvariant extends Binding {
    match(match) {
        return this.constraint === match;
    }
    
    createIndex(variance) {
        return assignID(this.constraint);
    }
}

class BindingEverything extends Binding {
    match(match, variance) {
        return variance !== Variance.Invariant;
    }
}

class BindingProtocol extends Binding {
    match(match, variance) {
        const constraint = this.constraint;
        if (constraint === match)return true;
        if (variance === Variance.Covariant) {
            return $isProtocol(match) && match.isAdoptedBy(constraint);
        }
        if (variance === Variance.Contravariant) {
            return !$isString(match) && constraint.isAdoptedBy(match);
        }
        return false;
    }

    createIndex(variance) {
        return assignID(this.constraint);
    }
}

class BindingClass extends Binding {
    match(match, variance) {
        const constraint = this.constraint;
        if (constraint === match) return true;
        if (variance === Variance.Contravariant) {
            return match.prototype instanceof constraint;
        }
        if (variance === Variance.Covariant) {
            return match.prototype &&
                (constraint.prototype instanceof match
                || ($isProtocol(match) && match.isAdoptedBy(constraint)));
        }
        return false;
    }

    createIndex(variance) {
        return assignID(this.constraint);
    }
}

class BindingString extends Binding {
    match(match, variance) {
        if (!$isString(match)) return false;
        return variance === Variance.Invariant
             ? this.constraint == match
             : this.constraint.toLowerCase() == match.toLowerCase();   
    }

    createIndex(variance) {
        return this.constraint;
    }
}

class BindingRegExp extends Binding {
    match(match, variance) {
        return (variance !== Variance.Invariant) && this.constraint.test(match);
    }
}

class BindingCustom extends Binding {
    match(match, variance) {
        return this.constraint.call(this, match, variance);
    }
}
