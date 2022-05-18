import {
    instanceOf, emptyArray, $isNothing,
    $isFunction, $isSymbol, $isPlainObject,
    $classOf, getPropertyDescriptors
} from "../core/base2";

import { Enum } from "../core/enum";
import { Either } from "../core/either";
import { design } from "../core/design";
import { provides } from "../callback/callback-policy";
import { singleton } from "../callback/singleton-lifestyle";
import { mapping } from "./mapping";
import { AbstractMapping } from "./abstract-mapping";
import { mapsFrom, mapsTo, formats } from "./maps";
import { MapOptions } from "./map-options";
import { AnyObject } from "./any-object";
import { options } from "../callback/options";

import { 
    TypeIdHandling, typeInfo, typeId
} from "../api/type-id";

export const JsonFormat = Symbol("json"),
             DefaultTypeIdProperty = "$type";

/**
 * Handler for mapping to or from json values.
 * @class JsonMapping
 * @extends AbstractMapping
 */
@provides() @singleton()
@formats(JsonFormat, /application[/]json/)
export class JsonMapping extends AbstractMapping {
    @mapsFrom(Date)
    mapFromDate(date) {
        return date.toJSON();
    }

    @mapsFrom(RegExp)
    mapFromRegExp(regExp) {
        return regExp.toString();
    }

    @mapsFrom(Either)
    mapFromEither(
        either,
        @options(MapOptions) options,
        { callback: mapFrom, composer }
    ) {
        const { format, seen } = mapFrom,
              { strategy }     = options || {};
        function mapValue(value) {
            return $isNothing(value) ? null
                 : composer.$mapFrom(value, format, [...seen, either]);
        }
        const isLeftProperty = getProperty(either, "isLeft", null, strategy),
              valueProperty  = getProperty(either, "value", null, strategy);
        return either.fold(
            left => ({
                [isLeftProperty]: true,
                [valueProperty]:  mapValue(left)
            }),
            right => ({
                [isLeftProperty]: false,
                [valueProperty]:  mapValue(right)
            }));
    }

    @mapsFrom(Array)
    mapFromArray(arr, { callback: mapFrom, composer }) {
        const { format, seen } = mapFrom,
                seenArray      = [...seen, arr];
        return arr.map(elem => composer.$mapFrom(elem, format, seenArray)); 
    }
    
    mapsFrom(mapFrom, options, { composer }) {
        let { source } = mapFrom;
        if (!canMapJson(source)) return;
        if (this.isPrimitiveValue(source)) {
            return source?.valueOf();
        }

        if ($isFunction(source.toJSON)) {
            return source.toJSON();
        }

        source = this.mapSurrogate(source, composer) || source;

        const { format, seen } = mapFrom,
              { fields, strategy, type, typeIdHandling } = options || {},
                allFields = $isNothing(fields) || fields === true;

        if (!(allFields || $isPlainObject(fields))) {
            throw new Error(`Invalid map fields specifier ${fields}.`);
        }

        const json    = {},
              isPlain = $isPlainObject(source);

        if (!isPlain && shouldEmitTypeId(source, type, typeIdHandling)) {
            const id = typeId.getId(source);
            if (!$isNothing(id)) {
                const type = $classOf(source),
                typeIdProp = typeInfo.get(type)?.typeIdProperty
                          || strategy?.getTypeIdProperty?.(type)
                          || DefaultTypeIdProperty;
                json[typeIdProp] = id;
            }
        }

        const descriptors = getPropertyDescriptors(source),
              seenObject  = [...seen, source];

        Reflect.ownKeys(descriptors).forEach(key => {
            if (allFields || (key in fields)) {
                const map = !isPlain ? mapping.get(source, key) : null,
                      property = getProperty(source, key, map, strategy),
                      keyValue = source[key];
                if (!canMapJson(keyValue)) return;
                if (map?.ignore) return;
                if (this.isPrimitiveValue(keyValue)) {
                    json[property] = keyValue?.valueOf();
                    return;
                }

                let keyFields;
                if (!allFields) {
                    keyFields = fields[key];
                    if (keyFields === false) return;
                    if (!$isPlainObject(keyFields)) {
                        keyFields = undefined;;
                    }
                }

                const keyJson = composer.$mapOptions({
                    fields: keyFields,
                    type:   typeIdHandling === TypeIdHandling.Auto
                            ? design.get(source, key)?.propertyType?.type
                            : null
                }).$mapFrom(keyValue, format, seenObject);

                if (map?.root) {
                    Object.assign(json, keyJson);
                } else {                 
                    json[property] = keyJson;
                }
            }
        });

        return json;
    }

    @mapsTo(Date)
    mapToDate(date) {
        return instanceOf(date, Date) ? date : Date.parse(date);
    }

    @mapsTo(RegExp)
    mapToRegExp(regExp) {
        const fragments = regExp.match(/\/(.*?)\/([gimy])?$/);              
        return new RegExp(fragments[1], fragments[2] || "")
    }

    @mapsTo(Either)
    mapToEither(
        either,
        @options(MapOptions) options,
        { callback: mapTo, composer }
    ) {
        const { format, classOrInstance, seen } = mapTo;
        if (!$isFunction(classOrInstance)) {
            throw new Error("Either is immutable and cannot be mapped onto.");
        }
        const { strategy }      = options || {},
                isLeftProperty  = getProperty(Either, "isLeft", null, strategy),
                valueProperty   = getProperty(Either, "value", null, strategy),
                eitherValue     = either[valueProperty];
        const eitherObject = $isNothing(eitherValue) ? null
              : composer.$mapTo(eitherValue, format, null, [...seen, either]);
        return either[isLeftProperty] === true
             ? Either.left(eitherObject)
             : Either.right(eitherObject);
    }

    @mapsTo(Array)
    mapToArray(arr, { callback: mapTo, composer }) {
        const { format, seen } = mapTo,
                seenArray      = [...seen, arr];
        let type = mapTo.classOrInstance;
        type = Array.isArray(type) ? type[0] : undefined;
        return arr.map(elem => composer.$mapTo(elem, format, type, seenArray)); 
    }

    mapsTo(mapTo, options, { composer }) {
        const { source } = mapTo;
        if (!canMapJson(source)) return;
        const { format, classOrInstance, seen } = mapTo,
                strategy = options?.strategy;
        if (this.isPrimitiveValue(source)) {
            if (classOrInstance instanceof Enum) {
                throw new Error("Enum is immutable and cannot be mapped onto.");
            }
            if (classOrInstance?.prototype instanceof Enum) {
                return strategy?.shouldUseEnumName(classOrInstance)
                     ? classOrInstance.fromName(source)
                     : classOrInstance.fromValue(source);
            }
            return source;
        }

        const object      = getOrCreateObject(source, classOrInstance, strategy),
              type        = $classOf(object),
              seenValue   = [...seen, source],
              descriptors = type === Object
                          ? getPropertyDescriptors(source)
                          : getPropertyDescriptors(object);

        Reflect.ownKeys(descriptors).forEach(key => {
            const descriptor = descriptors[key];
            if (this.canSetProperty(descriptor)) {
                const map = type !== Object ? mapping.get(object, key) : null,
                      property = getProperty(type, key, map, strategy);
                if (map?.root) {
                    mapKey.call(this, object, key, source, format, map, strategy, seen, composer);
                } else if (!map?.ignore) {
                    const keyValue = source[property];
                    if (keyValue !== undefined) {
                        mapKey.call(this, object, key, keyValue, format, map, strategy, seenValue, composer);
                    }
                }
            }
        });

        return this.mapSurrogate(object, composer) || object;
    }
}

function canMapJson(value) {
    return value !== undefined && !$isFunction(value) && !$isSymbol(value);
}

function getProperty(target, key, map, strategy, reading) {
    return map?.property || 
           strategy?.getPropertyName(target, key, reading) ||
           key;
}

function shouldEmitTypeId(object, type, typeIdHandling) {
    return typeIdHandling === TypeIdHandling.Always ||
           (typeIdHandling === TypeIdHandling.Auto  &&
            $classOf(object) !== type);
}

function getOrCreateObject(value, classOrInstance, strategy) {
    const isClass        = $isFunction(classOrInstance),
          type           = isClass ? classOrInstance : $classOf(classOrInstance),
          typeIdProperty = typeInfo.get(type)
                        || strategy?.getTypeIdProperty?.(type)
                        || DefaultTypeIdProperty,
          id             = value[typeIdProperty];

    if ($isNothing(id)) {
        return $isNothing(type) || type === AnyObject ? {}
             : isClass ? Reflect.construct(type, emptyArray) : classOrInstance;
    }

    const desiredType = strategy?.resolveTypeWithId?.(id)
                     || typeId.getType(id)
                     || type;
   
    if ($isNothing(desiredType) || desiredType === AnyObject) {
        throw new TypeError(`The type with id '${id}' could not be resolved and no fallback type was provided.`);
    }

    if (isClass) {
        return Reflect.construct(desiredType, emptyArray)
    }

    if (!(classOrInstance instanceof desiredType)) {
        throw new TypeError(`Expected instance of type '${desiredType.name}', but received '${type.name}'.`);
    }

    return classOrInstance;
}

function mapKey(target, key, value, format, map, strategy, seen, composer) {
    const type = design.get(target, key)?.propertyType?.type;
    if ($isNothing(type)) {
        if (this.isPrimitiveValue(value)) {
            target[key] = value?.valueOf();
            return;
        }
    } else if (type.prototype instanceof Enum) {
        let useEnumName = map?.useEnumName;
        if ($isNothing(useEnumName)) {
            useEnumName = strategy?.shouldUseEnumName(type);
        }
        target[key] = useEnumName ? type.fromName(value) : type.fromValue(value);
        return;
    }
    target[key] = composer.$mapTo(value, format, type, seen);
}
