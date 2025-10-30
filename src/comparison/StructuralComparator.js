import { NodeComparator } from './NodeComparator.js';
import { NodeUtils } from '../utils/NodeUtils.js';

/**
 * StructuralComparator - Handles detection of structural changes in DOM
 * Specializes in detecting insertions, deletions, and moves of child nodes
 */
export class StructuralComparator {
    /**
     * Detects if this is a simple insertion/deletion in the children list
     * @param {Array} oldChildren - Array of old child nodes
     * @param {Array} newChildren - Array of new child nodes
     * @returns {Object|boolean} Detection result or false
     */
    static isSimpleInsertionOrDeletion(oldChildren, newChildren) {
        // Handle simple insertion: exactly one more child
        if (newChildren.length === oldChildren.length + 1) {
            return this.checkSimpleInsertionAnywhere(oldChildren, newChildren);
        }

        // Handle simple deletion: exactly one fewer child
        if (oldChildren.length === newChildren.length + 1) {
            return this.checkSimpleDeletionAnywhere(oldChildren, newChildren);
        }

        // Handle multiple insertions (up to 5 new elements)
        if (newChildren.length > oldChildren.length) {
            const insertionCount = newChildren.length - oldChildren.length;
            if (insertionCount <= 5) {
                return this.checkMultipleInsertionsAnywhere(
                    oldChildren,
                    newChildren,
                    insertionCount
                );
            }
        }

        // Handle multiple deletions (up to 5 elements)
        if (oldChildren.length > newChildren.length) {
            const deletionCount = oldChildren.length - newChildren.length;
            if (deletionCount <= 5) {
                return this.checkMultipleDeletionsAnywhere(
                    oldChildren,
                    newChildren,
                    deletionCount
                );
            }
        }

        return false;
    }

    /**
     * Checks if there's a simple insertion anywhere in the children list
     * @param {Array} oldChildren - Old children
     * @param {Array} newChildren - New children
     * @returns {Object|boolean} Insertion info or false
     */
    static checkSimpleInsertionAnywhere(oldChildren, newChildren) {
        for (let insertPos = 0; insertPos <= oldChildren.length; insertPos++) {
            if (this.testInsertionAtPosition(oldChildren, newChildren, insertPos, 1)) {
                return { type: "insertion", position: insertPos, count: 1 };
            }
        }
        return false;
    }

    /**
     * Checks if there are multiple insertions anywhere in the children list
     * @param {Array} oldChildren - Old children
     * @param {Array} newChildren - New children
     * @param {number} insertionCount - Number of insertions
     * @returns {Object|boolean} Insertion info or false
     */
    static checkMultipleInsertionsAnywhere(oldChildren, newChildren, insertionCount) {
        for (let insertPos = 0; insertPos <= oldChildren.length; insertPos++) {
            if (
                this.testInsertionAtPosition(
                    oldChildren,
                    newChildren,
                    insertPos,
                    insertionCount
                )
            ) {
                return {
                    type: "insertion",
                    position: insertPos,
                    count: insertionCount,
                };
            }
        }
        return false;
    }

    /**
     * Checks if there's a simple deletion anywhere in the children list
     * @param {Array} oldChildren - Old children
     * @param {Array} newChildren - New children
     * @returns {Object|boolean} Deletion info or false
     */
    static checkSimpleDeletionAnywhere(oldChildren, newChildren) {
        for (let deletePos = 0; deletePos <= newChildren.length; deletePos++) {
            if (this.testDeletionAtPosition(oldChildren, newChildren, deletePos, 1)) {
                return { type: "deletion", position: deletePos, count: 1 };
            }
        }
        return false;
    }

    /**
     * Checks if there are multiple deletions anywhere in the children list
     * @param {Array} oldChildren - Old children
     * @param {Array} newChildren - New children
     * @param {number} deletionCount - Number of deletions
     * @returns {Object|boolean} Deletion info or false
     */
    static checkMultipleDeletionsAnywhere(oldChildren, newChildren, deletionCount) {
        for (let deletePos = 0; deletePos <= newChildren.length; deletePos++) {
            if (
                this.testDeletionAtPosition(
                    oldChildren,
                    newChildren,
                    deletePos,
                    deletionCount
                )
            ) {
                return {
                    type: "deletion",
                    position: deletePos,
                    count: deletionCount,
                };
            }
        }
        return false;
    }

    /**
     * Tests if an insertion at a specific position would match the pattern
     * @param {Array} oldChildren - Old children
     * @param {Array} newChildren - New children
     * @param {number} insertPos - Position to test
     * @param {number} insertionCount - Number of insertions
     * @returns {boolean} True if pattern matches
     */
    static testInsertionAtPosition(oldChildren, newChildren, insertPos, insertionCount) {
        // Check children before insertion point
        for (let i = 0; i < insertPos; i++) {
            if (!this.childrenMatch(oldChildren[i], newChildren[i])) {
                return false;
            }
        }

        // Check children after insertion point (offset by insertion count)
        for (let i = insertPos; i < oldChildren.length; i++) {
            const oldChild = oldChildren[i];
            const newChild = newChildren[i + insertionCount];
            if (!this.childrenMatch(oldChild, newChild)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Tests if a deletion at a specific position would match the pattern
     * @param {Array} oldChildren - Old children
     * @param {Array} newChildren - New children
     * @param {number} deletePos - Position to test
     * @param {number} deletionCount - Number of deletions
     * @returns {boolean} True if pattern matches
     */
    static testDeletionAtPosition(oldChildren, newChildren, deletePos, deletionCount) {
        // Check children before deletion point
        for (let i = 0; i < deletePos; i++) {
            if (!this.childrenMatch(oldChildren[i], newChildren[i])) {
                return false;
            }
        }

        // Check children after deletion point (old offset by deletion count)
        for (let i = deletePos; i < newChildren.length; i++) {
            const oldChild = oldChildren[i + deletionCount];
            const newChild = newChildren[i];
            if (!this.childrenMatch(oldChild, newChild)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Helper to check if two children match
     * @param {Node} oldChild - Old child
     * @param {Node} newChild - New child
     * @returns {boolean} True if match
     */
    static childrenMatch(oldChild, newChild) {
        return NodeComparator.childrenMatch(
            oldChild,
            newChild,
            NodeUtils.isHeavyElement
        );
    }

    /**
     * Determines if children structure is too different for incremental updates
     * @param {Array} oldChildren - Old children
     * @param {Array} newChildren - New children
     * @returns {boolean} True if should replace all
     */
    static shouldReplaceAllChildren(oldChildren, newChildren) {
        // Allow larger differences before triggering full replacement
        const lengthDiff = Math.abs(oldChildren.length - newChildren.length);
        if (lengthDiff > 10) {
            return true;
        }

        // If we have many heavy elements, prefer incremental updates
        const oldHeavyCount = oldChildren.filter((child) =>
            NodeUtils.isHeavyElement(child)
        ).length;
        const newHeavyCount = newChildren.filter((child) =>
            NodeUtils.isHeavyElement(child)
        ).length;

        if (oldHeavyCount > 0 || newHeavyCount > 0) {
            return false; // Prefer incremental updates when heavy elements are involved
        }

        let differences = 0;
        const minLength = Math.min(oldChildren.length, newChildren.length);

        // Only count truly significant differences
        for (let i = 0; i < minLength; i++) {
            const oldChild = oldChildren[i];
            const newChild = newChildren[i];

            // Different node types are significant
            if (oldChild.nodeType !== newChild.nodeType) {
                differences++;
                continue;
            }

            // Different tag names are significant for elements
            if (
                oldChild.nodeType === Node.ELEMENT_NODE &&
                newChild.nodeType === Node.ELEMENT_NODE &&
                oldChild.tagName !== newChild.tagName
            ) {
                differences++;
                continue;
            }

            // For text nodes, check if content is completely different
            if (
                oldChild.nodeType === Node.TEXT_NODE &&
                newChild.nodeType === Node.TEXT_NODE
            ) {
                const oldText = oldChild.textContent?.trim() || "";
                const newText = newChild.textContent?.trim() || "";

                if (oldText && newText && oldText !== newText) {
                    // Check if one is a subset of the other (minor edit)
                    if (
                        !oldText.includes(newText.substring(0, 10)) &&
                        !newText.includes(oldText.substring(0, 10))
                    ) {
                        differences++;
                    }
                }
            }
        }

        // Only replace all if most children are fundamentally different
        return differences > minLength * 0.8; // 80% threshold
    }
}

