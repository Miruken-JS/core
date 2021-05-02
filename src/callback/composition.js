import { $isNothing } from "core/base2";
import { Trampoline } from "./trampoline";

/**
 * Container for composition.
 * @class Composition
 * @extends Trampoline
 */
export class Composition extends Trampoline {
    get canBatch() {
        const callback = this.callback;
        return $isNothing(callback) || callback.canBatch !== false;
    }

    get canFilter() {
        const callback = this.callback;
        return $isNothing(callback) || callback.canFilter !== false;
    }

    get canInfer() {
        const callback = this.callback;
        return $isNothing(callback) || callback.canInfer !== false;
    }

    static isComposed(callback, type) {
        return callback instanceof this && callback.callback instanceof type;
    }
}

