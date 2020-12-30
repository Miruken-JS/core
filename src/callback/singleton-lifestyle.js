import { $isNothing, $isPromise } from "core/base2";
import { createKey } from "core/privates";
import { Lifestyle, LifestyleProvider } from "./lifestyle";
import { createFilterDecorator } from "./filter/filter";

const _ = createKey();

export class SingletonLifestyle extends Lifestyle {
    getInstance(inquiry, { next }) {
        let instance = _(this).instance;
        if ($isNothing(instance)) {
            instance = _(this).instance = next();
            if ($isPromise(instance)) {
                _(this).instance = instance = instance
                    .then(result => _(this).instance = result)
                    .catch(() => _(this).instance = null);
            }
        }
        return instance;
    }
}

export class SingletonLifestyleProvider extends LifestyleProvider {
    constructor() {
        super(new SingletonLifestyle());
    }
}

export const singleton = createFilterDecorator(
    () => new SingletonLifestyleProvider());

