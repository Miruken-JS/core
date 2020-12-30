import { createKeyChain } from "core/privates";
import { $flatten } from "core/base2";
import { Handler, HandlerAdapter } from "./handler";
import { unmanaged } from "./unmanaged";

const _ = createKeyChain();

/**
 * Encapsulates zero or more
 * {{#crossLink "Handler"}}{{/crossLink}}.<br/>
 * See [Composite Pattern](http://en.wikipedia.org/wiki/Composite_pattern)
 * @class CompositeHandler
 * @constructor
 * @param  {Any}  [...handlers]  -  callback handlers
 * @extends Handler
 */
@unmanaged
export class CompositeHandler extends Handler {
    constructor(...handlers) {
        super();
        _(this).handlers = [];
        this.addHandlers(handlers);
    }

    getHandlers() { 
        return _(this).handlers.slice();
    }

    addHandlers(...handlers) {
        handlers = $flatten(handlers, true)
            .filter(h => this.findHandler(h) == null)
            .map(Handler.for);
        _(this).handlers.push(...handlers);
        return this;
    }

    insertHandlers(atIndex, ...handlers) {
        handlers = $flatten(handlers, true)
            .filter(h => this.findHandler(h) == null)
            .map(Handler.for);
        _(this).handlers.splice(atIndex, 0, ...handlers);                
        return this;                    
    }

    removeHandlers(...handlers) {
        $flatten(handlers, true).forEach(handler => {
            const handlers = _(this).handlers,
                  count    = handlers.length;
            for (let idx = 0; idx < count; ++idx) {
                const testHandler = handlers[idx];
                if (testHandler === handler || 
                    (testHandler instanceof HandlerAdapter &&
                        testHandler.handler === handler)) {
                    handlers.splice(idx, 1);
                    return;
                }
            }
        });
        return this;
    }

    findHandler(handler) {
        for (const h of _(this).handlers) {
            if (h === handler) return h;
            if (h instanceof HandlerAdapter && h.handler === handler) {
                return h;
            }
        }
    }

    handleCallback(callback, greedy, composer) {
        let handled = super.handleCallback(callback, greedy, composer);
        if (handled && !greedy) return true;
        for (const handler of _(this).handlers) {
            if (handler.handle(callback, greedy, composer)) {
                if (!greedy) return true;
                handled = true;
            }
        }
        return handled;
    }
}

