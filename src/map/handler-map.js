import { $isNothing, $isFunction } from "../core/base2";
import { Handler } from "../callback/handler";
import { MapTo, MapFrom } from "./map-callback";
import { NotHandledError } from "../callback/errors";
import "./map-options";

Handler.implement({
    /**
     * Maps the `object` to a value in `format`.
     * @method $mapFrom
     * @param   {Object}  source  -  object to map
     * @param   {Any}     format  -  format specifier
     * @param   {Array}   seen    -  array of seen objects
     * @returns {Any}  mapped value.
     * @for Handler
     */
    $mapFrom(source, format, seen) {
        if ($isNothing(source)) {
            throw new TypeError("The object argument is required.");
        }
        const mapFrom = new MapFrom(source, format, seen);
        if (!this.handle(mapFrom)) {
            throw new NotHandledError(mapFrom);
        }
        return mapFrom.callbackResult;
    },
    /**
     * Maps the formatted `source` in `format` to `classOrInstance`.
     * @method $mapTo 
     * @param   {Any}              source           -  formatted source
     * @param   {Any}              format           -  format specifier
     * @param   {Function|Object}  classOrInstance  -  instance or class to unmap
     * @param   {Array}            seen             -  array of seen objects
     * @return  {Object}  unmapped instance.
     * @for Handler
     */    
    $mapTo(source, format, classOrInstance, seen) {
        if ($isNothing(source)) {
             throw new TypeError("The object argument is required.");
        }
        if (Array.isArray(classOrInstance)) {
            const type = classOrInstance[0];
            if (type && !$isFunction(type) && !Array.isArray(type)) {
                throw new TypeError("Cannot infer array type.");
            }
        } else if (Array.isArray(source) && $isFunction(classOrInstance)) {
            classOrInstance = [classOrInstance];
        }
        const mapTo = new MapTo(source, format, classOrInstance, seen);
        if (!this.handle(mapTo)) {
            throw new NotHandledError(mapTo);
        }
        return mapTo.callbackResult; 
    }    
});
