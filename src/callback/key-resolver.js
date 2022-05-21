import { Base, $isNothing, $isPromise } from "core/base2";
import { conformsTo } from "core/protocol";
import { TypeFlags } from "core/type-info";
import { $optional } from "core/qualifier";
import { Inquiry } from "./inquiry";
import { KeyResolving } from "./key-resolving";

@conformsTo(KeyResolving)
export class KeyResolver extends Base {
    resolve(typeInfo, handler, parent) {
        const inquiry = this.createInquiry(typeInfo, parent);
        if (typeInfo.flags.hasFlag(TypeFlags.Lazy)) {
            return ((created, dep) => () => {
                if (!created) {
                    created = true;
                    dep = resolveKeyInfer.call(this, inquiry, typeInfo, handler);
                }
                return dep;
            })();
        }
        return resolveKeyInfer.call(this, inquiry, typeInfo, handler);
    }

    resolveKey(inquiry, typeInfo, handler) {
        return handler.resolve(inquiry, typeInfo.constraints);
    }

    resolveKeyAll(inquiry, typeInfo, handler) {
        return handler.resolveAll(inquiry, typeInfo.constraints);
    }

    createInquiry(typeInfo, parent) {
       return new Inquiry(typeInfo.type, parent);
    }
}

function resolveKeyInfer(inquiry, typeInfo, handler) {
    if (typeInfo.flags.hasFlag(TypeFlags.Array)) {
        return this.resolveKeyAll(inquiry, typeInfo, handler);
    } else {
        const optional = typeInfo.flags.hasFlag(TypeFlags.Optional),
              value    = this.resolveKey(inquiry, typeInfo, handler);
        if ($isNothing(value)) {
            return optional ? $optional(value) : value;
        } if ($isPromise(value)) {
            return value.then(result => {
                if ($isNothing(result) && !optional) {
                    throw new Error(`Unable to resolve key '${inquiry.key}'.`);
                }
                return result;
            });
        }
        return value;
    }
}

