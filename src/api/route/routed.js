import { $isNothing } from "core/base2";
import { Request } from "../request";
import { Message, MessageWrapper } from "../message";
import { response } from "../response";
import { typeId } from "../type-id";

export class Routed extends MessageWrapper {
    route;
    tag;

    @typeId
    get typeId() {
        const responseType = response.get(this.message);
        if ($isNothing(responseType)) {
            return `Miruken.Api.Route.Routed, Miruken`;
        }
        const responseTypeId = typeId.getId(responseType);
        if ($isNothing(responseTypeId)) return;
        return `Miruken.Api.Route.Routed\`1[[${responseTypeId}]], Miruken`;
    }
}

export class BatchRouted {
    constructor(routed, callback) {
        this.routed   = routed;
        this.callback = callback;
    }

    routed;
    callback;
}

Request.implement({
    routeTo(route, tag) {
        const routed = new Routed(this);
        routed.route = route;
        routed.tag   = tag;
        return routed;
    }
});

Message.implement({
    routeTo(route, tag) {
        const routed = new Routed(this);
        routed.route = route;
        routed.tag   = tag;
        return routed;
    }
});
