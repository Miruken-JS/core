/**
 * Annotates invariance.
 * @attribute $eq
 * @for miruken.Modifier
 */
export const $eq = $createModifier();

/**
 * Annotates use value as is.
 * @attribute $use
 * @for miruken.Modifier
 */    
export const $use = $createModifier();

/**
 * Annotates copy semantics.
 * @attribute $copy
 * @for miruken.Modifier
 */        
export const $copy = $createModifier();

/**
 * Annotates lazy semantics.
 * @attribute $lazy
 * @for miruken.Modifier
 */            
export const $lazy = $createModifier();

/**
 * Annotates function to be evaluated.
 * @attribute $eval
 * @for miruken.Modifier
 */                
export const $eval = $createModifier();

/**
 * Annotates zero or more semantics.
 * @attribute $every
 * @for miruken.Modifier
 */                    
export const $every = $createModifier();

/**
 * Annotates 
 * @attribute use {{#crossLink "miruken.Parenting"}}{{/crossLink}} protocol.
 * @attribute $child
 * @for miruken.Modifier
 */                        
export const $child = $createModifier();

/**
 * Annotates optional semantics.
 * @attribute $optional
 * @for miruken.Modifier
 */                        
export const $optional = $createModifier();

/**
 * Annotates Promise expectation.
 * @attribute $promise
 * @for miruken.Modifier
 */                            
export const $promise = $createModifier();

/**
 * Annotates synchronous.
 * @attribute $instant
 * @for miruken.Modifier
 */                                
export const $instant = $createModifier();

/**
 * Class for annotating targets.
 * @class Modifier
 * @param  {Object}  source  -  source to annotate
 */
export function Modifier() {}
Modifier.isModified = function (source) {
    return source instanceof Modifier;
};
Modifier.unwrap = function (source) {
    return (source instanceof Modifier) 
        ? Modifier.unwrap(source.getSource())
        : source;
};
export function $createModifier() {
    let allowNew;
    function modifier(source) {
        if (!new.target) {
            if (modifier.test(source)) {
                return source;
            }
            allowNew = true;
            const wrapped = new modifier(source);
            allowNew = false;
            return wrapped;
        } else {
            if (!allowNew) {
                throw new Error("Modifiers should not be called with the new operator.");
            }
            this.getSource = function () {
                return source;
            }
        }
    }
    modifier.prototype = new Modifier();
    modifier.test      = function (source) {
        if (source instanceof modifier) {
            return true;
        } else if (source instanceof Modifier) {
            return modifier.test(source.getSource());
        }
        return false;
    }
    return modifier;
}