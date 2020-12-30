import { emptyArray, $isNothing } from "core/base2";
import { createKey } from "core/privates";
import { conformsTo } from "core/protocol";
import { FilteringProvider } from "./filtering";

const _ = createKey();

@conformsTo(FilteringProvider)
export class FilterSpecProvider {
    constructor(filterSpec) {
        if ($isNothing(filterSpec)) {
            throw new Error("The filterSpec is required.")
        }
        _(this).filterSpec = filterSpec;
    }

    get filterSpec() { return _(this).filterSpec; }
    get filterType() { return this.filterSpec.filterType; }
    get required() { return this.filterSpec.required; }

    getFilters(binding, callback, composer) {
        const spec   = _(this).filterSpec,
              filter = composer.resolve(spec.filterType);
        if ($isNothing(filter)) return emptyArray;
        if (!$isNothing(spec.order)) {
            filter.order = order;
        }
        return [filter];
    }
}

