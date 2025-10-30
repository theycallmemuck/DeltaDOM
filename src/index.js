/**
 * DeltaDOM - Efficient DOM Diffing and Patching Library
 * 
 * A high-performance library for computing differences between DOM trees
 * and efficiently applying those changes to the real DOM.
 * 
 * @module DeltaDOM
 */

import { Differ } from './core/Differ.js';
import { Patcher } from './core/Patcher.js';
import { NodeComparator } from './comparison/NodeComparator.js';
import { StructuralComparator } from './comparison/StructuralComparator.js';
import { NodeUtils } from './utils/NodeUtils.js';
import { MediaProcessor } from './utils/MediaProcessor.js';

/**
 * Main DeltaDOM class - High-level API for DOM diffing and patching
 */
export class DeltaDOM {
    /**
     * Creates a new DeltaDOM instance
     * @param {Object} options - Configuration options
     * @param {Function} options.processMediaElement - Optional callback for media processing
     */
    constructor(options = {}) {
        this.patcher = new Patcher(options);
    }

    /**
     * Computes the differences between two DOM elements
     * @param {Element} oldElement - Current DOM element
     * @param {Element} newElement - New DOM element
     * @returns {Array} Array of change operations
     * 
     * @example
     * const deltaDOM = new DeltaDOM();
     * const changes = deltaDOM.diff(oldElement, newElement);
     * console.log(`Found ${changes.length} changes`);
     */
    diff(oldElement, newElement) {
        return Differ.compareElements(oldElement, newElement);
    }

    /**
     * Applies changes to a DOM element
     * @param {Array} changes - Array of change operations from diff()
     * 
     * @example
     * const deltaDOM = new DeltaDOM();
     * const changes = deltaDOM.diff(oldElement, newElement);
     * deltaDOM.patch(changes);
     */
    patch(changes) {
        this.patcher.applyChanges(changes);
    }

    /**
     * Computes differences and applies them in one operation
     * @param {Element} oldElement - Current DOM element
     * @param {Element} newElement - New DOM element
     * @returns {Array} Array of applied changes
     * 
     * @example
     * const deltaDOM = new DeltaDOM();
     * const changes = deltaDOM.update(oldElement, newElement);
     */
    update(oldElement, newElement) {
        const changes = this.diff(oldElement, newElement);
        this.patch(changes);
        return changes;
    }

    /**
     * Patches virtual DOM nodes directly (advanced usage)
     * @param {Element} realParent - Real DOM parent element
     * @param {Object} oldVNode - Old virtual node
     * @param {Object} newVNode - New virtual node
     * @param {Element} newRealElement - New real element
     * 
     * @example
     * const deltaDOM = new DeltaDOM();
     * deltaDOM.patchVirtualNodes(realElement, oldVNode, newVNode, newElement);
     */
    patchVirtualNodes(realParent, oldVNode, newVNode, newRealElement) {
        this.patcher.patchNode(realParent, oldVNode, newVNode, newRealElement);
    }
}

// Export all components for advanced usage
export {
    Differ,
    Patcher,
    NodeComparator,
    StructuralComparator,
    NodeUtils,
    MediaProcessor
};

// Default export
export default DeltaDOM;

