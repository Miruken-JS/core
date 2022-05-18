import { $isNothing, $flatten } from "core/base2";
import { createKey } from "core/privates";
import { conformsTo } from "core/protocol";
import { Filtering, FilteringProvider } from "callback/filter/filtering";
import { createFilterDecorator } from "callback/filter/filter";
import { Stage } from "callback/stage";
import { BatchRouted } from "./routed";
import { BatchRouter } from "./batch-router";

const _ = createKey();

@conformsTo(Filtering)
class RoutesFilter {
    constructor(schemes) {
        _(this).schemes = schemes;
    }

    get order() { return Stage.Logging - 1; }

    next(routed, { composer, callback, next }) {
        const matches = _(this).schemes.includes(getScheme(routed));
        if (matches) {
            const batcher = composer.$getBatcher(BatchRouter);
            if (!$isNothing(batcher)) {
                return composer.$enableFilters().$command(
                    new BatchRouted(routed, callback));
            }
        }
        return next(composer.$enableFilters(), matches);
    }
}


@conformsTo(FilteringProvider)
export class RoutesProvider {
    constructor(schemes) {
        if ($isNothing(schemes) || schemes.length === 0) {
            throw new Error("The schemes argument cannot be empty.");
        }
        _(this).filters = [new RoutesFilter(schemes)];
    }

    get required() { return true; }

    getFilters(binding, callback, composer) {
        return _(this).filters;
    }
}

export const routes = createFilterDecorator(
    (target, key, descriptor, schemes) =>
        new RoutesProvider($flatten(schemes, true)), true);

function getScheme(routed) {
    const { route } = routed;
    try {
        const uri = new URL(route);
        return uri.protocol.slice(0, -1);
    } catch {
        return route;
    }
}