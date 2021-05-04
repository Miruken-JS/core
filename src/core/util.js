import { Base, $equals, $isFunction } from "./base2";
import { createKeyChain } from "./privates";

const _ = createKeyChain();

/**
 * Helper class to simplify array manipulation.
 * @class ArrayManager
 * @constructor
 * @param  {Array}  [...items]  -  initial items
 * @extends Base
 */
export class ArrayManager extends Base {
    constructor(items) {
        super();
        _(this).items = [];
        if (items) {
            this.append(items);
        }
    }

    /** 
     * Gets the array.
     * @method getItems
     * @returns  {Array} array.
     */
    getItems() { return _(this).items; }

    /** 
     * Gets the item at array `index`.
     * @method getIndex
     * @param    {number}  index - index of item
     * @returns  {Any} item at index.
     */
    getIndex(index) {
        const { items } = _(this);
        if (items.length > index) {
            return items[index];
        }
    }

    /** 
     * Sets `item` at array `index` if empty.
     * @method setIndex
     * @param    {number}  index - index of item
     * @param    {Any}     item  - item to set
     * @returns  {ArrayManager} array manager.
     * @chainable
     */
    setIndex(index, item) {
        const { items } = _(this);
        if (items[index] === undefined) {
            items[index] = this.mapItem(item);
        }
        return this;
    }

    /** 
     * Inserts `item` at array `index`.
     * @method insertIndex
     * @param    {number}   index - index of item
     * @param    {Item}     item  - item to insert
     * @returns  {ArrayManager} array manager.
     * @chainable
     */
    insertIndex(index, item) {
        _(this).items.splice(index, 0, this.mapItem(item));
        return this;
    }

    /** 
     * Replaces `item` at array `index`.
     * @method replaceIndex
     * @param    {number}   index - index of item
     * @param    {Item}     item  - item to replace
     * @returns  {ArrayManager} array manager.
     * @chainable
     */
    replaceIndex(index, item) {
        _(this).items[index] = this.mapItem(item);
        return this;
    }

    /** 
     * Removes the item at array `index`.
     * @method removeIndex
     * @param    {number}   index - index of item
     * @returns  {ArrayManager} array manager.
     * @chainable
     */
    removeIndex(index) {
        const { items } = _(this);
        if (items.length > index) {
            items.splice(index, 1);
        }
        return this;
    }

    /** 
     * Appends one or more items to the end of the array.
     * @method append
     * @returns  {ArrayManager} array manager.
     * @chainable
     */
    append(/* items */) {
        let newItems;
        if (arguments.length === 1 && Array.isArray(arguments[0])) {
            newItems = arguments[0];
        } else if (arguments.length > 0) {
            newItems = arguments;
        }
        if (newItems) {
            for (let i = 0; i < newItems.length; ++i) {
                _(this).items.push(this.mapItem(newItems[i]));
            }
        }
        return this;
    }

    /** 
     * Merges the items into the array.
     * @method merge
     * @param    {Array}  items - items to merge from
     * @returns  {ArrayManager} array manager.
     * @chainable
     */
    merge(items) {
        for (let index = 0; index < items.length; ++index) {
            const item = items[index];
            if (item !== undefined) {
                this.setIndex(index, item);
            }
        }
        return this;
    }

    /** 
     * Optional mapping for items before adding to the array.
     * @method mapItem
     * @param    {Any}  item  -  item to map
     * @returns  {Any}  mapped item.
     */
    mapItem(item) { return item; }

    /** 
     * Returns an Iterable over the managed array.
     * @returns  {Iterable}  the array iterator.
     */    
    [Symbol.iterator]() {
        return this.getItems()[Symbol.iterator]();
    }    
}

const prevSymbol  = Symbol("prev"),
      nextSymbol  = Symbol("next"),
      indexSymbol = Symbol("index");
      
/**
 * Maintains a simple doublely-linked list with indexing.
 * Indexes are partially ordered according to the order comparator.
 * @class IndexedList
 * @constructor
 * @param  {Function}  order  -  partially orders items
 * @extends Base
 */
export class IndexedList extends Base {
    constructor(order = defaultOrder) {
        super();
        const _this = _(this);
        _this.index = Object.create(null);
        _this.order = order;
    }

    /** 
     * Determines if list is empty.
     * @property isEmpty
     * @returns  {boolean}  true if list is empty, false otherwise.
     */
    get isEmpty() {
        return !_(this).head;
    }

    /** 
     * Gets the first node at `index`.
     * @method getFirst
     * @param    {Any} index  -  index of node
     * @returns  {Any}  the first node at index.
     */
    getFirst(index) {
        return index && _(this).index[index];
    }

    /** 
     * Inserts `node` at `index`.
     * @method insert
     * @param  {Any}  node   -  node to insert
     * @param  {Any}  index  -  index to insert at
     * @returns  {IndexedList}  the updated list.
     * @chainable
     */
    insert(node, index) {
        const indexedNode = this.getFirst(index);
        let insert = indexedNode;
        if (index) {
            insert = insert || _(this).head;
            while (insert && _(this).order(node, insert) >= 0) {
                insert = insert[nextSymbol];
            }
        }
        if (insert) {
            const prev = insert[prevSymbol];
            node[nextSymbol]   = insert;
            node[prevSymbol]   = prev;
            insert[prevSymbol] = node;
            if (prev) {
                prev[nextSymbol] = node;
            }
            if (_(this).head === insert) {
                _(this).head = node;
            }
        } else {
            node[nextSymbol] = null;
            const tail = _(this).tail;
            if (tail) {
                node[prevSymbol] = tail;
                tail[nextSymbol] = node;
            } else {
                _(this).head = node;
                node[prevSymbol] = null;
            }
            _(this).tail = node;
        }
        if (index) {
            node[indexSymbol] = index;
            if (!indexedNode) {
                _(this).index[index] = node;
            }
        }
        return this;
    }

    /** 
     * Removes `node` from the list.
     * @method remove
     * @param  {Any}  node  -  node to remove
     * @returns  {IndexedList}  the updated list.
     * @chainable
     */
    remove(node) {
        const prev = node[prevSymbol],
              next = node[nextSymbol];
        if (prev) {
            if (next) {
                prev[nextSymbol] = next;
                next[prevSymbol] = prev;
            } else {
                _(this).tail = prev;
                delete prev[nextSymbol];
            }
        } else if (next) {
            _(this).head = next;
            delete next[prevSymbol];
        } else {
            delete _(this).head;
            delete _(this).tail;
        }
        const index = node[indexSymbol];
        if (this.getFirst(index) === node) {
            if (next && next[indexSymbol] === index) {
                _(this).index[index] = next;
            } else {
                delete _(this).index[index];
            }
        }
        return this;
    }

    /** 
     * Returns an Iterator from the first index node.
     * If no index is present, it starts from the head.
     * @method indexed
     * @param  {Any}  index  -  index to iterate from.
     * @returns  {Iterator}  the indexed iterator.
     */   
    *fromIndex(index) {
        let node = this.getFirst(index) || _(this).head;
        while (node) {
            yield node;
            node = node[nextSymbol];
        }
    }

    /** 
     * Returns an Iterable over the indexed list.
     * @returns  {Iterable}  the list iterator.
     */    
    *[Symbol.iterator]() {
        let node = _(this).head;
        while (node) {
            yield node;
            node = node[nextSymbol];
        }
    }
}

function defaultOrder(a, b) {
    if (a === undefined && b === undefined) {
        return 0;
    }
    if (a === undefined) {
        return 1;
    }
    if (b === undefined) {
        return -1;
    }
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
}

