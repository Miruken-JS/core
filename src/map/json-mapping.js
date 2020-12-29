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
    mapFromDate({ object }) {
        return object.toJSON();
    }

    @mapsFrom(RegExp)
    mapFromRegExp({ object }) {
        return object.toString();
    }

    @mapsFrom(Either)
    mapFromEither(mapFrom, @options(MapOptions) options, { composer }) {
        const { object, format, seen } = mapFrom,
              { strategy } = options || {};
        function mapValue(value) {
            return $isNothing(value) ? null
                 : composer.$mapFrom(value, format, [...seen, object]);
        }
        const isLeftProperty = getProperty(object, "isLeft", null, strategy),
              valueProperty  = getProperty(object, "value", null, strategy);
        return object.fold(
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
    mapFromArray(mapFrom, { composer }) {
        const { object, format, seen } = mapFrom,
                seenArray = [...seen, object];
        return object.map(elem => composer.$mapFrom(elem, format, seenArray)); 
    }
    
    mapsFrom(mapFrom, options, { composer }) {
        let { object } = mapFrom;
        if (!canMapJson(object)) return;
        if (this.isPrimitiveValue(object)) {
            return object?.valueOf();
        }

        if ($isFunction(object.toJSON)) {
            return object.toJSON();
        }

        object = this.mapSurrogate(object, composer) || object;

        const { format, seen } = mapFrom,
              { fields, strategy, type, typeIdHandling } = options || {},
                allFields = $isNothing(fields) || fields === true;

        if (!(allFields || $isPlainObject(fields))) {
            throw new Error(`Invalid map fields specifier ${fields}.`);
        }

        const json    = {},
              isPlain = $isPlainObject(object);

        if (!isPlain && shouldEmitTypeId(object, type, typeIdHandling)) {
            const id = typeId.getId(object);
            if (!$isNothing(id)) {
                const type = $classOf(object),
                typeIdProp = typeInfo.get(type)?.typeIdProperty
                          || strategy?.getTypeIdProperty?.(type)
                          || DefaultTypeIdProperty;
                json[typeIdProp] = id;
            }
        }

        const descriptors = getPropertyDescriptors(object),
              seenObject  = [...seen, object];

        Reflect.ownKeys(descriptors).forEach(key => {
            if (allFields || (key in fields)) {
                const map = !isPlain ? mapping.get(object, key) : null,
                      property = getProperty(object, key, map, strategy),
                      keyValue = object[key];
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
                            ? design.get(object, key)?.propertyType?.type
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
    mapToDate({ value }) {
        return instanceOf(value, Date) ? value : Date.parse(value);
    }

    @mapsTo(RegExp)
    mapToRegExp({ value }) {
        const fragments = value.match(/\/(.*?)\/([gimy])?$/);              
        return new RegExp(fragments[1], fragments[2] || "")
    }

    @mapsTo(Either)
    mapToEither(mapTo, @options(MapOptions) options, { composer }) {
        const { classOrInstance, seen } = mapTo;
        if (!$isFunction(classOrInstance)) {
            throw new Error("Either is immutable and cannot be mapped onto.");
        }
        const { value, format } = mapTo,
              { strategy }      = options || {},
                isLeftProperty  = getProperty(Either, "isLeft", null, strategy),
                valueProperty   = getProperty(Either, "value", null, strategy),
                eitherValue     = value[valueProperty];
        const eitherObject = $isNothing(eitherValue) ? null
              : composer.$mapTo(eitherValue, format, null, [...seen, value]);
        return value[isLeftProperty] === true
             ? Either.left(eitherObject)
             : Either.right(eitherObject);
    }

    @mapsTo(Array)
    mapToArray(mapTo, { composer }) {
        const { value, format, seen } = mapTo,
                seenArray = [...seen, value];
        let type = mapTo.classOrInstance;
        type = Array.isArray(type) ? type[0] : undefined;
        return value.map(elem => composer.$mapTo(elem, format, type, seenArray)); 
    }

    mapsTo(mapTo, options, { composer }) {
        const { value } = mapTo;
        if (!canMapJson(value)) return;
        const { format, classOrInstance, seen } = mapTo,
                strategy = options?.strategy;
        if (this.isPrimitiveValue(value)) {
            if (classOrInstance instanceof Enum) {
                throw new Error("Enum is immutable and cannot be mapped onto.");
            }
            if (classOrInstance?.prototype instanceof Enum) {
                return strategy?.shouldUseEnumName(classOrInstance)
                     ? classOrInstance.fromName(value)
                     : classOrInstance.fromValue(value);
            }
            return value;
        }

        const object      = getOrCreateObject(value, classOrInstance, strategy),
              type        = $classOf(object),
              seenValue   = [...seen, value],
              descriptors = type === Object
                          ? getPropertyDescriptors(value)
                          : getPropertyDescriptors(object);

        Reflect.ownKeys(descriptors).forEach(key => {
            const descriptor = descriptors[key];
            if (this.canSetProperty(descriptor)) {
                const map = type !== Object ? mapping.get(object, key) : null,
                      property = getProperty(type, key, map, strategy);
                if (map?.root) {
                    mapKey.call(this, object, key, value, format, map, strategy, seen, composer);
                } else if (!map?.ignore) {
                    const keyValue = value[property];
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
