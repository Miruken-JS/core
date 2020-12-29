import { Enum } from "../core/enum";

/**
 * Standard filter precedence.
 * @class Stage
 * @extends Enum
 */
export const Stage = Enum({
    /**
     * Normal filters
     * @property {number} Filter
     */
    Filter: 0,
    /**
     * Logging filters
     * @property {number} Logging
     */    
    Logging: 10,
    /**
     * Authorization filters
     * @property {number} Authorization
     */        
    Authorization: 30,
    /**
     * Validation filters
     * @property {number} Validation
     */        
    Validation: 50
});

