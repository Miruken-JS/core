import { Base, $isNothing } from "../../core/base2";
import { createKeyChain } from "../../core/privates";
import { conformsTo } from "../../core/protocol";
import { FilteringProvider } from "./filtering";

const _ = createKeyChain();

@conformsTo(FilteringProvider)
export class FilterInstanceProvider extends Base {
    constructor(filters, required) {
        if ($isNothing(filters) || filters.length === 0) {
            throw new Error("At least one filter must be provided.");
        }
        super();
        _(this).required = required === true; 
        _(this).filters  = [...new Set(filters)];
    }

    get required() { return _(this).required; }

    getFilters(binding, callback, composer) {
        return _(this).filters;
    }
}

