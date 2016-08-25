import { decorate } from './decorate';
import { $isFunction } from './util';
import { $meta } from './meta';

/**
 * Registers metadata for properties and methods.
 * @method metadata
 */
export function metadata(...args) {
    return decorate(_metadata, args);
}

metadata.get = function (metaKey, criteria, source, key, fn) {
    if (!fn && $isFunction(key)) {
        [key, fn] = [null, key];
    }
    if (!fn) return;
    const meta = $meta(source);
    if (meta) {
        const match = meta.getMetadata(key, criteria);
        if (match) {
            if (key) {
                fn(match[metaKey], key);
            } else {
                Reflect.ownKeys(match).forEach(k => fn(match[k][metaKey], k));
            }
        }
    }
}

function _metadata(target, key, descriptor, [keyMetadata]) {
    if (keyMetadata) {
        const meta = $meta(target);
        if (meta) {
            meta.defineMetadata(key, keyMetadata);
        }
    }
}

export default metadata;
