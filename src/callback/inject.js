import { $isNothing } from "core/base2";
import { createKey } from "core/privates";
import { TypeFlags } from "core/type-info";
import { createTypeInfoDecorator } from "core/design";
import { Inquiry } from "./inquiry";
import { KeyResolver } from "./key-resolver";

const _ = createKey();

export class InjectResolver extends KeyResolver {
    constructor(key) {
        if ($isNothing(key)) {
            throw new Error("The key argument is required.");
        }
        super();
        _(this).key = key;
    }

    get key() { return _(this).key; }

    createInquiry(typeInfo, parent) {
       return new Inquiry(this.key, parent);
    }
}

export const inject = createTypeInfoDecorator((key, typeInfo, [actualKey]) => {
    typeInfo.keyResolver = new InjectResolver(actualKey || key);
});

