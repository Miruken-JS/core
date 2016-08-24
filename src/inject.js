import { decorate } from './decorate';
import { metadata } from './metadata';
import { $flatten } from './util';
import { $meta } from './meta';

const injectKey      = Symbol(),
      injectCriteria = { [injectKey]: undefined },
      noDependencies = Object.freeze([]);

export function inject(...dependencies) {
    return decorate(_inject, dependencies);
}
inject.get = function () {
    return metadata.get(injectKey, injectCriteria, ...arguments)
        || noDependencies;
}

function _inject(target, key, descriptor, dependencies) {
    dependencies = $flatten(dependencies);
    if (dependencies.length > 0) {
        const meta = $meta(target);
        if (meta) {
            meta.addMetadata(key, { [injectKey]: dependencies });
        }
    }
}

export default inject;