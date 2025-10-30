import { NodeComparator } from '../comparison/NodeComparator.js';
import { StructuralComparator } from '../comparison/StructuralComparator.js';
import { NodeUtils } from '../utils/NodeUtils.js';

/**
 * Differ - Core diffing engine for DOM comparison
 * Compares two DOM trees and generates a list of changes
 */
export class Differ {
    /**
     * Compares two DOM elements and returns list of changes
     * @param {Element} oldElement - Current DOM element
     * @param {Element} newElement - New DOM element to compare
     * @param {string} path - Path for logging
     * @returns {Array} Array of change operations
     */
    static compareElements(oldElement, newElement, path = "") {
        const changes = [];

        // Handle null cases
        if (!oldElement && !newElement) {
            return changes;
        }

        if (!oldElement && newElement) {
            changes.push({
                type: "insert",
                path,
                element: newElement.cloneNode(true),
            });
            return changes;
        }

        if (oldElement && !newElement) {
            changes.push({
                type: "remove",
                path,
                element: oldElement,
            });
            return changes;
        }

        // Compare node types
        if (oldElement.nodeType !== newElement.nodeType) {
            changes.push({
                type: "replace",
                path,
                oldElement,
                newElement: newElement.cloneNode(true),
            });
            return changes;
        }

        // Handle text nodes
        if (oldElement.nodeType === Node.TEXT_NODE) {
            if (oldElement.textContent !== newElement.textContent) {
                changes.push({
                    type: "updateText",
                    path,
                    element: oldElement,
                    oldContent: oldElement.textContent,
                    newContent: newElement.textContent,
                });
            }
            return changes;
        }

        // Handle element nodes
        if (oldElement.nodeType === Node.ELEMENT_NODE) {
            const oldTag = oldElement.tagName;
            const newTag = newElement.tagName;

            if (oldTag !== newTag) {
                changes.push({
                    type: "replace",
                    path,
                    oldElement,
                    newElement: newElement.cloneNode(true),
                });
                return changes;
            }

            // Skip heavy elements
            if (NodeUtils.isHeavyElement(oldElement)) {
                return changes;
            }

            const elementPath = `${path}${path ? " > " : ""}${oldTag.toLowerCase()}`;

            // Compare attributes
            const attrChanges = NodeComparator.compareAttributes(oldElement, newElement);
            if (attrChanges.length > 0) {
                changes.push({
                    type: "updateAttributes",
                    path: elementPath,
                    element: oldElement,
                    changes: attrChanges,
                });
            }

            // Compare children
            const childChanges = this.compareChildren(oldElement, newElement, elementPath);
            changes.push(...childChanges);
        }

        return changes;
    }

    /**
     * Compares children between two elements
     * @param {Element} oldElement - Old element
     * @param {Element} newElement - New element
     * @param {string} path - Current path
     * @returns {Array} Array of changes
     */
    static compareChildren(oldElement, newElement, path) {
        const changes = [];
        const oldChildren = Array.from(oldElement.childNodes);
        const newChildren = Array.from(newElement.childNodes);

        // Check for simple structural changes
        const structuralChange = StructuralComparator.isSimpleInsertionOrDeletion(
            oldChildren,
            newChildren
        );

        if (structuralChange) {
            return this.handleStructuralChange(
                oldChildren,
                newChildren,
                oldElement,
                path,
                structuralChange
            );
        }

        // Check if we should replace all children
        if (StructuralComparator.shouldReplaceAllChildren(oldChildren, newChildren)) {
            // Remove all old
            for (let i = oldChildren.length - 1; i >= 0; i--) {
                changes.push({
                    type: "removeChild",
                    path,
                    parent: oldElement,
                    child: oldChildren[i],
                    index: i,
                });
            }

            // Add all new
            for (let i = 0; i < newChildren.length; i++) {
                changes.push({
                    type: "insertChild",
                    path,
                    parent: oldElement,
                    child: newChildren[i].cloneNode(true),
                    index: i,
                });
            }

            return changes;
        }

        // Otherwise do incremental updates
        const maxLength = Math.max(oldChildren.length, newChildren.length);

        for (let i = 0; i < maxLength; i++) {
            const oldChild = oldChildren[i];
            const newChild = newChildren[i];
            const childPath = `${path}[${i}]`;

            if (!oldChild && newChild) {
                changes.push({
                    type: "insertChild",
                    path,
                    parent: oldElement,
                    child: newChild.cloneNode(true),
                    index: i,
                });
            } else if (oldChild && !newChild) {
                changes.push({
                    type: "removeChild",
                    path,
                    parent: oldElement,
                    child: oldChild,
                    index: i,
                });
            } else if (oldChild && newChild) {
                // Recursively compare
                const childChanges = this.compareElements(oldChild, newChild, childPath);
                changes.push(...childChanges);
            }
        }

        return changes;
    }

    /**
     * Handles simple structural changes (insertions/deletions)
     * @param {Array} oldChildren - Old children
     * @param {Array} newChildren - New children
     * @param {Element} parent - Parent element
     * @param {string} path - Current path
     * @param {Object} changeInfo - Information about the structural change
     * @returns {Array} Array of changes
     */
    static handleStructuralChange(oldChildren, newChildren, parent, path, changeInfo) {
        const changes = [];
        const oldCount = oldChildren.length;
        const newCount = newChildren.length;

        if (changeInfo.type === "insertion") {
            const insertPos = changeInfo.position;
            const count = changeInfo.count;

            // Insert new children at the detected position
            for (let i = 0; i < count; i++) {
                const newChild = newChildren[insertPos + i];
                changes.push({
                    type: "insertChild",
                    path,
                    parent: parent,
                    child: newChild.cloneNode(true),
                    index: insertPos + i,
                });
            }

            // Compare remaining children for any other changes
            this.compareRemainingChildren(
                oldChildren,
                newChildren,
                changes,
                path,
                "insertion",
                insertPos,
                count
            );
        } else if (changeInfo.type === "deletion") {
            const deletePos = changeInfo.position;
            const count = changeInfo.count;

            // Remove children at the detected position
            for (let i = 0; i < count; i++) {
                const oldChild = oldChildren[deletePos + i];
                changes.push({
                    type: "removeChild",
                    path,
                    parent: parent,
                    child: oldChild,
                    index: deletePos + i,
                });
            }

            // Compare remaining children for any other changes
            this.compareRemainingChildren(
                oldChildren,
                newChildren,
                changes,
                path,
                "deletion",
                deletePos,
                count
            );
        }

        return changes;
    }

    /**
     * Compares remaining children after structural changes
     * @param {Array} oldChildren - Old children
     * @param {Array} newChildren - New children
     * @param {Array} changes - Changes array to append to
     * @param {string} path - Current path
     * @param {string} changeType - Type of change (insertion/deletion)
     * @param {number} changePos - Position of change
     * @param {number} changeCount - Count of changes
     */
    static compareRemainingChildren(
        oldChildren,
        newChildren,
        changes,
        path,
        changeType,
        changePos,
        changeCount
    ) {
        if (changeType === "insertion") {
            // Compare children before insertion point
            for (let i = 0; i < changePos; i++) {
                const oldChild = oldChildren[i];
                const newChild = newChildren[i];
                const childPath = `${path}[${i}]`;

                if (!this.shouldSkipComparison(oldChild, newChild)) {
                    const childChanges = this.compareElements(oldChild, newChild, childPath);
                    changes.push(...childChanges);
                }
            }

            // Compare children after insertion point (offset by insertion count)
            for (let i = changePos; i < oldChildren.length; i++) {
                const oldChild = oldChildren[i];
                const newChild = newChildren[i + changeCount];
                const childPath = `${path}[${i + changeCount}]`;

                if (!this.shouldSkipComparison(oldChild, newChild)) {
                    const childChanges = this.compareElements(oldChild, newChild, childPath);
                    changes.push(...childChanges);
                }
            }
        } else if (changeType === "deletion") {
            // Compare children before deletion point
            for (let i = 0; i < changePos; i++) {
                const oldChild = oldChildren[i];
                const newChild = newChildren[i];
                const childPath = `${path}[${i}]`;

                if (!this.shouldSkipComparison(oldChild, newChild)) {
                    const childChanges = this.compareElements(oldChild, newChild, childPath);
                    changes.push(...childChanges);
                }
            }

            // Compare children after deletion point
            for (let i = changePos; i < newChildren.length; i++) {
                const oldChild = oldChildren[i + changeCount];
                const newChild = newChildren[i];
                const childPath = `${path}[${i}]`;

                if (!this.shouldSkipComparison(oldChild, newChild)) {
                    const childChanges = this.compareElements(oldChild, newChild, childPath);
                    changes.push(...childChanges);
                }
            }
        }
    }

    /**
     * Helper to determine if comparison should be skipped for performance
     * @param {Node} oldChild - Old child
     * @param {Node} newChild - New child
     * @returns {boolean} True if should skip
     */
    static shouldSkipComparison(oldChild, newChild) {
        // Skip comparison for heavy elements that match
        if (NodeUtils.isHeavyElement(oldChild) && NodeUtils.isHeavyElement(newChild)) {
            const oldSrc =
                oldChild.getAttribute?.("src") ||
                oldChild.getAttribute?.("data-original-src");
            const newSrc =
                newChild.getAttribute?.("src") ||
                newChild.getAttribute?.("data-original-src");

            if (oldSrc && newSrc && oldSrc === newSrc) {
                return true;
            }
        }

        // For non-heavy elements that are essentially the same
        if (
            oldChild.nodeType === newChild.nodeType &&
            oldChild.tagName === newChild.tagName &&
            oldChild.textContent?.trim() === newChild.textContent?.trim()
        ) {
            return true;
        }

        return false;
    }
}

