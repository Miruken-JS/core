import { $isNothing } from "core/base2";
import { createKey } from "core/privates";
import { conformsTo } from "core/protocol";
import { FilteringProvider } from "../filter/filtering";
import { Filtering } from "../filter/filtering";
import { Stage } from "../stage";

import { BindingMetadata } from "./binding-metadata";
import { BindingConstraint } from "./binding-constraint";

const _ = createKey();

@conformsTo(Filtering)
export class ConstraintFilter {
    get order() { return Stage.Filter; }

    next(callback, { provider, next, abort }) {
        if (!(provider instanceof ConstraintProvider)) {
            return abort();
        }
        const metadata = callback.metadata;
        return !(metadata == null ||
            provider.constraint.matches(metadata)) ? abort() : next();
    }
}

const constraintFilter = [new ConstraintFilter()];

@conformsTo(FilteringProvider)
export class ConstraintProvider {
    constructor(constraint) {
        if ($isNothing(constraint)) {
            throw new Error("The constraint argument is required.")
        }
        if (!(constraint instanceof BindingConstraint)) {
            throw new TypeError("The constraint argument is not a BindingConstraint.");
        }        
        _(this).constraint = constraint;
    }

    get required() { return true; }

    get constraint() { return _(this).constraint; }

    appliesTo(callback) {
        return callback.metadata instanceof BindingMetadata;
    }

    getFilters(binding, callback, composer) {
        return constraintFilter;
    }
}

