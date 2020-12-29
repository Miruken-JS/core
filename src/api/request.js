import {
    Base, $isNothing, $classOf, assignID
} from "../core/base2";

export class Request extends Base {
    getCacheKey() {
        return JSON.stringify(this);
    }

    toString() {
        return `${$classOf(this).name} ${JSON.stringify(this)}`;
    }  
}

export class RequestWrapper extends Request {
    constructor(request) {
        if (new.target === RequestWrapper) {
            throw new TypeError("RequestWrapper cannot be instantiated.");
        }
        super();
        this.request = request;
    }

    request;

    getCacheKey() {
        const request    = this.request,
              requestKey = request?.getCacheKey?.();
        if (!$isNothing(requestKey)) {
            return JSON.stringify(this, (name, value) =>
                name === "request"
                ? `${assignID($classOf(request))}#${requestKey}`
                : value
            );
        }
    }
}

