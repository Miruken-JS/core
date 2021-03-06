import { 
    Base, Abstract, Module,
    $isFunction, $equals
} from "./base2";

import { Enum } from "./enum";
import { Protocol, conformsTo } from "./protocol";

/**
 * TraversingAxis enum
 * @class TraversingAxis
 * @extends Enum
 */
export const TraversingAxis = Enum({
    /**
     * Traverse only current node.
     * @property {number} Self
     */
    Self: 1,
    /**
     * Traverse only current node root.
     * @property {number} Root
     */
    Root: 2,
    /**
     * Traverse current node children.
     * @property {number} Child
     */
    Child: 3,
    /**
     * Traverse current node siblings.
     * @property {number} Sibling
     */
    Sibling: 4,
    /**
     * Traverse current node ancestors.
     * @property {number} Ancestor
     */
    Ancestor: 5,
    /**
     * Traverse current node descendants.
     * @property {number} Descendant
     */
    Descendant: 6,
    /**
     * Traverse current node descendants in reverse.
     * @property {number} DescendantReverse
     */
    DescendantReverse: 7,
    /**
     * Traverse current node and children.
     * @property {number} SelfOrChild
     */
    SelfOrChild: 8,
    /**
     * Traverse current node and siblings.
     * @property {number} SelfOrSibling
     */
    SelfOrSibling: 9,
    /**
     * Traverse current node and ancestors.
     * @property {number} SelfOrAncestor
     */
    SelfOrAncestor: 10,
    /**
     * Traverse current node and descendents.
     * @property {number} SelfOrDescendant
     */
    SelfOrDescendant: 11,
    /**
     * Traverse current node and descendents in reverse.
     * @property {number} SelfOrDescendantReverse
     */
    SelfOrDescendantReverse: 12,
    /**
     * Traverse current node, ancestors and siblings.
     * @property {number} SelfSiblingOrAncestor 
     */
    SelfSiblingOrAncestor: 13
});

/**
 * Protocol for traversing an abitrary graph of objects.
 * @class Traversing
 * @extends Protocol
 */
export const Traversing = Protocol.extend({
    /**
     * Traverse a graph of objects.
     * @method traverse
     * @param {TraversingAxis}  axis       -  axis of traversal
     * @param {Function}        visitor    -  receives visited nodes
     * @param {Object}          [context]  -  visitor callback context
     */
    traverse(axis, visitor, context) {}
});

/**
 * Mixin for Traversing functionality.
 * @class TraversingMixin
 * @uses Traversing
 * @extends Module
 */
export const TraversingMixin = Module.extend({
    traverse(object, axis, visitor, context) {
        if ($isFunction(axis)) {
            context = visitor;
            visitor = axis;
            axis    = TraversingAxis.Child;
        }
        if (!$isFunction(visitor)) return;
        switch (axis) {
        case TraversingAxis.Self:
            traverseSelf.call(object, visitor, context);
            break;
            
        case TraversingAxis.Root:
            traverseRoot.call(object, visitor, context);
            break;
            
        case TraversingAxis.Child:
            traverseChildren.call(object, visitor, false, context);
            break;

        case TraversingAxis.Sibling:
            traverseSelfSiblingOrAncestor.call(object, visitor, false, false, context);
            break;
            
        case TraversingAxis.SelfOrChild:
            traverseChildren.call(object, visitor, true, context);
            break;

        case TraversingAxis.SelfOrSibling:
            traverseSelfSiblingOrAncestor.call(object, visitor, true, false, context);
            break;
            
        case TraversingAxis.Ancestor:
            traverseAncestors.call(object, visitor, false, context);
            break;
            
        case TraversingAxis.SelfOrAncestor:
            traverseAncestors.call(object, visitor, true, context);
            break;
            
        case TraversingAxis.Descendant:
            traverseDescendants.call(object, visitor, false, context);
            break;
            
        case TraversingAxis.DescendantReverse:
            traverseDescendantsReverse.call(object, visitor, false, context);
            break;
            
        case TraversingAxis.SelfOrDescendant:
            traverseDescendants.call(object, visitor, true, context);
            break;

        case TraversingAxis.SelfOrDescendantReverse:
            traverseDescendantsReverse.call(object, visitor, true, context);
            break;
            
        case TraversingAxis.SelfSiblingOrAncestor:
            traverseSelfSiblingOrAncestor.call(object, visitor, true, true, context);
            break;

        default:
            throw new Error(`Unrecognized TraversingAxis ${axis}.`);
        }
    }
});

export const traversable = Base => 
    @conformsTo(Traversing) class extends Base {
        traverse(axis, visitor, context) {
            if ($isFunction(axis)) {
                context = visitor;
                visitor = axis;
                axis    = TraversingAxis.Child;
            }
            if (!$isFunction(visitor)) return;
            switch (axis) {
            case TraversingAxis.Self:
                traverseSelf.call(this, visitor, context);
                break;
                
            case TraversingAxis.Root:
                traverseRoot.call(this, visitor, context);
                break;
                
            case TraversingAxis.Child:
                traverseChildren.call(this, visitor, false, context);
                break;

            case TraversingAxis.Sibling:
                traverseSelfSiblingOrAncestor.call(
                    this, visitor, false, false, context);
                break;
                
            case TraversingAxis.SelfOrChild:
                traverseChildren.call(this, visitor, true, context);
                break;

            case TraversingAxis.SelfOrSibling:
                traverseSelfSiblingOrAncestor.call(
                    this, visitor, true, false, context);
                break;
                
            case TraversingAxis.Ancestor:
                traverseAncestors.call(this, visitor, false, context);
                break;
                
            case TraversingAxis.SelfOrAncestor:
                traverseAncestors.call(this, visitor, true, context);
                break;
                
            case TraversingAxis.Descendant:
                traverseDescendants.call(this, visitor, false, context);
                break;
                
            case TraversingAxis.DescendantReverse:
                traverseDescendantsReverse.call(this, visitor, false, context);
                break;
                
            case TraversingAxis.SelfOrDescendant:
                traverseDescendants.call(this, visitor, true, context);
                break;

            case TraversingAxis.SelfOrDescendantReverse:
                traverseDescendantsReverse.call(this, visitor, true, context);
                break;
                
            case TraversingAxis.SelfSiblingOrAncestor:
                traverseSelfSiblingOrAncestor.call(this, visitor, true, true, context);
                break;

            default:
                throw new Error(`Unrecognized TraversingAxis ${axis}.`);
            }
        }
};

function checkCircularity(visited, node) {
    if (visited.indexOf(node) !== -1) {
        throw new Error(`Circularity detected for node ${node}`);
    }
    visited.push(node);
    return node;
}

function traverseSelf(visitor, context) {
    visitor.call(context, this);
}

function traverseRoot(visitor, context) {
    let parent, root = this, visited = [this];
    while (parent = root.parent) {
        checkCircularity(visited, parent);
        root = parent;   
    }
    visitor.call(context, root);
}

function traverseChildren(visitor, withSelf, context) {
    if ((withSelf && visitor.call(context, this))) {
        return;
    }
    for (const child of this.children) {
        if (visitor.call(context, child)) {
            return;
        }
    }
}

function traverseAncestors(visitor, withSelf, context) {
    let parent = this, visited = [this];
    if (withSelf && visitor.call(context, this)) {
        return;
    }
    while ((parent = parent.parent) && !visitor.call(context, parent)) {
        checkCircularity(visited, parent);
    }
}

function traverseDescendants(visitor, withSelf, context) {
    if (withSelf) {
        Traversal.levelOrder(this, visitor, context);
    } else {
        Traversal.levelOrder(this, node =>
            !$equals(this, node) && visitor.call(context, node),
            context);
    }
}

function traverseDescendantsReverse(visitor, withSelf, context) {
    if (withSelf) {
        Traversal.reverseLevelOrder(this, visitor, context);
    } else {
        Traversal.reverseLevelOrder(this, node =>
            !$equals(this, node) && visitor.call(context, node),
            context);
    }
}

function traverseSelfSiblingOrAncestor(visitor, withSelf, withAncestor, context) {
    if (withSelf && visitor.call(context, this)) {
        return;
    }
    const parent = this.parent;
    if (parent) {
        for (const sibling of parent.children) {
            if (!$equals(this, sibling) && visitor.call(context, sibling)) {
                return;
            }
        }
        if (withAncestor) {
            traverseAncestors.call(parent, visitor, true, context);
        }
    }
}

/**
 * Helper class for traversing a graph.
 * @static
 * @class Traversal
 * @extends Abstract
 */
export const Traversal = Abstract.extend({}, {
    /**
     * Performs a pre-order graph traversal.
     * @static
     * @method preOrder
     * @param  {Traversing}  node       -  node to traverse
     * @param  {Function}    visitor    -  receives visited nodes
     * @param  {Object}      [context]  -  visitor calling context
     */
    preOrder(node, visitor, context) {
        return preOrder(node, visitor, context);
    },
    /**
     * Performs a post-order graph traversal.
     * @static
     * @method postOrder
     * @param  {Traversing}  node       -  node to traverse
     * @param  {Function}    visitor    -  receives visited nodes
     * @param  {Object}      [context]  -  visitor calling context
     */
    postOrder(node, visitor, context) {
        return postOrder(node, visitor, context);
    },
    /**
     * Performs a level-order graph traversal.
     * @static
     * @method levelOrder
     * @param  {Traversing}  node       -  node to traverse
     * @param  {Function}    visitor    -  receives visited nodes
     * @param  {Object}      [context]  -  visitor calling context
     */
    levelOrder(node, visitor, context) {
        return levelOrder(node, visitor, context);
    },
    /**
     * Performs a reverse level-order graph traversal.
     * @static
     * @method levelOrder
     * @param  {Traversing}  node       -  node to traverse
     * @param  {Function}    visitor    -  receives visited nodes
     * @param  {Object}      [context]  -  visitor calling context
     */
    reverseLevelOrder(node, visitor, context) {
        return reverseLevelOrder(node, visitor, context);
    }
});

function preOrder(node, visitor, context, visited = []) {
    checkCircularity(visited, node);
    if (!node || !$isFunction(visitor) || visitor.call(context, node)) {
        return true;
    }
    const traverse = node.traverse; 
    if ($isFunction(traverse))
        traverse.call(node, child => preOrder(child, visitor, context, visited));
    return false;
}

function postOrder(node, visitor, context, visited = []) {
    checkCircularity(visited, node);
    if (!node || !$isFunction(visitor)) {
        return true;
    }
    const traverse = node.traverse; 
    if ($isFunction(traverse))
        traverse.call(node, child => postOrder(child, visitor, context, visited));
    return visitor.call(context, node);
}

function levelOrder(node, visitor, context, visited = []) {
    if (!node || !$isFunction(visitor)) {
        return;
    }
    const queue = [node];
    while (queue.length > 0) {
        const next = queue.shift();
        checkCircularity(visited, next);
        if (visitor.call(context, next)) {
            return;
        }
        const traverse = next.traverse; 
        if ($isFunction(traverse))
            traverse.call(next, child => {
                if (child) queue.push(child);
            });
    }
}

function reverseLevelOrder(node, visitor, context, visited = []) {
    if (!node || !$isFunction(visitor)) {
        return;
    }
    const queue = [node],
          stack = [];
    while (queue.length > 0) {
        const next = queue.shift();
        checkCircularity(visited, next);
        stack.push(next);
        const level    = [],
              traverse = next.traverse; 
        if ($isFunction(traverse))
            traverse.call(next, child => {
                if (child) level.unshift(child);
            });
        queue.push.apply(queue, level);
    }
    while (stack.length > 0) {
        if (visitor.call(context, stack.pop())) {
            return;
        }
    }
}

