import { 
    typeOf, $isFunction, $isNothing,
    $isObject, $classOf
} from "../core/base2";

import { Handler } from "../callback/handler";
import { $unhandled } from "../callback/callback-policy";
import { mapsFrom, mapsTo } from "./maps";
import { MapOptions } from "./map-options";
import { unmanaged } from "../callback/unmanaged";
import { surrogate } from "./surrogate";
import { options } from "../callback/options";

/**
 * Abstract mapping.
 * @class Abstract mapping
 * @extends Handler
 */ 
@unmanaged
export class AbstractMapping extends Handler {
    @mapsFrom
    mapsFrom(mapsFrom, @options(MapOptions) options) {
        return $unhandled;
    }

    @mapsTo
    mapsTo(mapsTo, @options(MapOptions) options) {}

    canSetProperty(descriptor) {
        return !$isFunction(descriptor.value);        
    }

    isPrimitiveValue(value) {
        switch (typeOf(value)) {
            case "null":
            case "number":
            case "string":
            case "boolean":   
            return true;
        }
        return false;        
    }

    mapSurrogate(source, composer) {
        if ($isObject(source)) {
            const surrogateType = surrogate.get($classOf(source));
            if (!$isNothing(surrogateType)) {
                return composer.$bestEffort().$mapFrom(source, surrogateType)
            }
        }
    }
}