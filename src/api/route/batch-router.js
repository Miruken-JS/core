import { $isNothing } from "core/base2";
import { createKey } from "core/privates";
import { conformsTo } from "core/protocol";
import { handles, $unhandled } from "callback/callback-policy";
import { Handler } from "callback/handler";
import { Command } from "callback/command";
import { unmanaged } from "callback/unmanaged";
import { Batching } from "callback/batch";
import { Concurrent, Publish } from "../schedule/scheduled";
import { Routed, BatchRouted } from "./routed";
import "../handler-api";

const _ = createKey();

@unmanaged
@conformsTo(Batching)
export class BatchRouter extends Handler {
    constructor() {
        super();
        _(this).groups = new Map();
    }

    @handles(BatchRouted)
    routeBatch(batched, { callback }) {
        return this.route(batched.routed, 
            { callback: batched.callback || callback });
    }

    @handles(Routed)
    route(routed, { callback }) {
        if (!callback instanceof Command) {
            return $unhandled;
        }
        const { groups } = _(this),
              { route, message } = routed;         
        let group = groups.get(route);
        if ($isNothing(group)) {
            group = [];
            groups.set(route, group);
        }
        const pending = callback.isMany ? new Publish(message) : message,
              request = new Pending(pending);
        group.push(request);
        return request.promise;
    }

    complete(composer) {
        const groups   = [..._(this).groups.entries()],
              complete = Promise.all(groups.map(([uri, requests]) => {
            const messages = requests.map(r => r.message);
            return Promise.resolve(
                composer.$send(new Concurrent(messages).routeTo(uri)))
                .then(result => {
                    const responses = result.responses;
                    // Cancel when available on Promise
                    // for (let i = responses.length; i < requests.length; ++i) {
                    //    requests[i].promise.cancel();
                    //}
                    return { uri, responses: responses
                        .map((response, i) => response.fold(
                            failure => {
                                requests[i].reject(failure);
                                return failure;
                            },
                            success => {
                                requests[i].resolve(success);
                                return success;
                            }))
                    };
            }).catch(reason => {
                // Cancel requests when available on Promise
                //requests.forEach(r => r.Promise.cancel());
                return Promise.reject(reason);
            });
        }));
        _(this).groups.clear();
        return complete;
    }    
}

class Pending {
    constructor(message) {
        this.message = message;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject  = reject;
        });
    }

    message;
    promise;
    resolve;
    reject;
}