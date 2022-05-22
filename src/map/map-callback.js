import {
    $isNothing,
    $isObject,
    $isString,
    $classOf
} from "../core/base2";

import { CallbackBase } from "../callback/callback";
import { mapsFrom, mapsTo } from "./maps";
import { AnyObject } from "./any-object";
import { createKeyChain } from "../core/privates";

const _ = createKeyChain();

/**
 * Base callback for mapping.
 * @class MapCallback
 * @constructor
 * @param   {Any}   format  -  format specifier
 * @param   {Array} seen    -  array of seen objects
 * @extends CallbackBase
 */
export class MapCallback extends CallbackBase {
    constructor(source, format, seen) {
        if (new.target === MapCallback) {
            throw new Error("MapCallback is abstract and cannot be instantiated.");
        }
        super(source);
        const _this = _(this);
        _this.format = format;
        _this.seen   = seen || [];
    }

    get format() { return _(this).format; }
    get strict() { return true; }
    get seen() { return _(this).seen; }
}

/**
 * Callback to map `source` to `format`.
 * @class MapFrom
 * @constructor
 * @param   {Any}    source  -  object to map
 * @param   {Any}    format  -  format specifier
 * @param   {Array}  seen    -  array of seen objects
 * @extends MapCallback
 */
export class MapFrom extends MapCallback {
    constructor(source, format, seen) {
        if ($isNothing(source)) {
            throw new TypeError("Missing source to map.");
        }
        if (checkCircularity(source, seen)) {
            throw new Error(`Circularity detected: MapFrom ${source} in progress.`);
        }
        super(source, format, seen);
    }

    get policy() { return mapsFrom.policy; }

    dispatch(handler, greedy, composer) {
        const source = this.source,
              type   = $classOf(source);
        if ($isNothing(type)) return false;
        const count = this.resultCount;
        return mapsFrom.dispatch(handler, this, type, composer, greedy) 
            || this.resultCount > count; 
    }

    toString() {
        return `MapFrom | ${this.source} to ${String(this.format)}`;
    }       
}

/**
 * Callback to map a formatted `value` into an object.
 * @class MapTo
 * @constructor
 * @param   {Any}              source           -  formatted source
 * @param   {Any}              format           -  format specifier
 * @param   {Function|Object}  classOrInstance  -  instance or class to unmap
 * @param   {Array}            seen             -  array of seen objects
 * @extends MapCallback
 */
export class MapTo extends MapCallback {
    constructor(source, format, classOrInstance, seen) {
        if ($isNothing(source)) {
            throw new TypeError("Missing source to map.");
        }     
        if (checkCircularity(source, seen)) {
            throw new Error(`Circularity detected: MapTo ${source} in progress.`);
        }   
        super(source, format, seen);
        if ($isNothing(classOrInstance) && !$isString(source)) {
            classOrInstance = $classOf(source);
            if (classOrInstance === Object) {
                classOrInstance = AnyObject;
            }
        }
        const _this = _(this);
        _this.classOrInstance = classOrInstance;
    }

    get policy() { return mapsTo.policy; }                              
    get classOrInstance() { return _(this).classOrInstance; }

    dispatch(handler, greedy, composer) {
        const count   = this.resultCount,
              source  = this.classOrInstance || this.source;
        return mapsTo.dispatch(handler, this, source, composer, false)
            || this.resultCount > count;
    }

    toString() {
        return `MapTo | ${String(this.format)} ${this.source}`;
    }
}

function checkCircularity(object, seen) {
    return $isObject(object) && seen?.includes(object);
}
