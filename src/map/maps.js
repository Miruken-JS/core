import {
    $isNothing, $isFunction, $isString, $equals
} from "../core/base2";

import { Metadata } from "../core/metadata";

import { 
    CovariantPolicy, ContravariantPolicy
} from "../callback/callback-policy";

const formatMetadataKey = Symbol("map-format");

/**
 * Policy for mapping a value to a format.
 * @property {Function} mapsFrom
 */   
export const mapsFrom = ContravariantPolicy.createDecorator(
    "mapsFrom", { filter: filterFormat });

/**
 * Policy for mapping from a formatted value.
 * @property {Function} mapsTo
 */   
export const mapsTo = ContravariantPolicy.createDecorator(
    "mapsTo", { filter: filterFormat });

/**
 * Mapping formats supported.
 * @method formats
 * @param {Array}  ...supported  -  supported formats 
 */
export const formats = Metadata.decorator(formatMetadataKey,
    (target, key, descriptor, supported) => {
        supported = supported.flat();
        if (supported.length === 0) return;
        const metadata = $isNothing(descriptor)
            ? formats.getOrCreateOwn(target.prototype, () => new Set())
            : formats.getOrCreateOwn(target, key, () => new Set());
        supported.forEach(format => metadata.add(format));
    });

function filterFormat(key, ...rest) {
    const prototype = Object.getPrototypeOf(this);
    let supported = formats.get(prototype, key);
    if ($isNothing(supported) || supported.size === 0) {
        supported = formats.get(prototype);        
    }
    return !supported || supported.size === 0 ||
        [...supported].some(f => {
            const context = rest[rest.length-1],
                  format  = context.callback.format;
            if (f instanceof RegExp) {
                return $isString(format) && f.test(format)
            }
            return $equals(format, f);
        });
}
