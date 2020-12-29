import { $isNothing } from "../../core/base2";
import { Protocol, conformsTo } from "../../core/protocol";
import { $composer } from "../handler";
import { ContextState } from "./context";

const ContextField = Symbol();

export const Contextual = Protocol.extend({
    get context() {},
    set context(value) {}
});

/**
 * Decorator/mixin to make classes contextual.<br/>
 * <pre>
 *    @contextual
 *    class Controller extends Base {
 *       action: function () {}
 *    }
 * </pre>
 * would give the Controller class contextual support.
 * @method contextual
 * @param {Function}  target  -  target to contextualize
 */ 
export const contextual = Base =>
    @conformsTo(Contextual) class extends Base {
        /**
         * The context associated with the receiver.
         * @property {Context} context
         */        
        get context() { return this[ContextField]; }
        set context(context) {
            const field = this[ContextField];
            if (field === context) return;
            if (field) {
                field.removeHandlers(this);
            }
            if (context) {
                this[ContextField] = context;
                context.insertHandlers(0, this);
            } else {
                delete this[ContextField];
            }
        }

        /**
         * Determines if the receivers context is active.
         * @property {boolean} isActiveContext
         * @readOnly
         */        
        get isActiveContext() {
            const field = this[ContextField];
            return field && (field.state === ContextState.Active);
        }

        /**
         * Ends the callers context.
         * @method endCallingContext
         */
        endCallingContext() {
            const composer = $composer;
            if ($isNothing(composer)) return;
            const context = composer.resolve(Context);
            if (context && (context !== this.context)) {
                context.End();
            }
        }
        
        /**
         * Ends the receivers context.
         * @method endContext
         */                
        endContext() {
            const field = this[ContextField];        
            if (field) field.end();
        }      
    };
    
