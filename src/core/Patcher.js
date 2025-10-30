import { NodeComparator } from '../comparison/NodeComparator.js';
import { NodeUtils } from '../utils/NodeUtils.js';
import { MediaProcessor } from '../utils/MediaProcessor.js';

/**
 * Patcher - Core patching engine for applying DOM changes
 * Takes virtual DOM differences and applies them to real DOM efficiently
 */
export class Patcher {
    constructor(options = {}) {
        this.processMediaElement = options.processMediaElement || null;
    }

    /**
     * Applies differences between virtual DOM to real DOM
     * @param {Element} realParent - Real DOM parent element
     * @param {Object} oldVNode - Old virtual node
     * @param {Object} newVNode - New virtual node
     * @param {Element} newRealElement - New real element
     */
    patchNode(realParent, oldVNode, newVNode, newRealElement) {
        if (!realParent) return;

        // CRITICAL: Never patch immutable elements
        if (realParent.dataset && realParent.dataset.immutable === "true") {
            return;
        }

        try {
            const realChildren = Array.from(realParent.childNodes);
            const oldChildren = oldVNode ? oldVNode.children || [] : [];
            const newChildren = newVNode ? newVNode.children || [] : [];
            const newRealChildren = newRealElement
                ? Array.from(newRealElement.childNodes)
                : [];

            if (newChildren.length === 0 && oldChildren.length === 0) {
                return;
            }

            // Handle simple text-only content changes
            if (
                newChildren.length === 1 &&
                oldChildren.length === 1 &&
                newChildren[0].type === "text" &&
                oldChildren[0].type === "text"
            ) {
                const realTextNode = realChildren[0];
                if (realTextNode && realTextNode.nodeType === Node.TEXT_NODE) {
                    if (oldChildren[0].content !== newChildren[0].content) {
                        realTextNode.textContent = newChildren[0].content;
                    }
                    return;
                }
            }

            // Key-based diffing algorithm
            this.keyBasedPatch(realParent, oldChildren, newChildren, newRealChildren);
        } catch (error) {
            console.error("Patch node error:", error);
            throw error;
        }
    }

    /**
     * Key-based patching algorithm that handles insertions, deletions, and movements
     * @param {Element} realParent - Real parent element
     * @param {Array} oldChildren - Old virtual children
     * @param {Array} newChildren - New virtual children
     * @param {Array} newRealChildren - New real children
     */
    keyBasedPatch(realParent, oldChildren, newChildren, newRealChildren) {
        const realChildren = Array.from(realParent.childNodes);

        // Create maps of old and new children by their IDs
        const oldChildMap = new Map();
        const newChildMap = new Map();

        oldChildren.forEach((child, index) => {
            if (child) {
                const key =
                    child._nodeId || `${child.type}-${index}-${child.tagName || ""}`;

                let finalKey = key;
                let counter = 0;
                while (oldChildMap.has(finalKey)) {
                    counter++;
                    finalKey = `${key}-dup${counter}`;
                }

                oldChildMap.set(finalKey, {
                    vNode: child,
                    realNode: realChildren[index],
                    index,
                    originalKey: key,
                });
            }
        });

        newChildren.forEach((child, index) => {
            if (child) {
                const key =
                    child._nodeId || `${child.type}-${index}-${child.tagName || ""}`;

                let finalKey = key;
                let counter = 0;
                while (newChildMap.has(finalKey)) {
                    counter++;
                    finalKey = `${key}-dup${counter}`;
                }

                newChildMap.set(finalKey, {
                    vNode: child,
                    newRealNode: newRealChildren[index],
                    index,
                    originalKey: key,
                });
            }
        });

        // Track matched old nodes
        const matchedOldNodes = new Set();
        const operations = [];

        // First pass: find matches and prepare operations
        for (let newIndex = 0; newIndex < newChildren.length; newIndex++) {
            const newChild = newChildren[newIndex];
            if (!newChild) continue;

            const newRealChild = newRealChildren[newIndex];
            let matchedOldEntry = null;

            // Strategy 1: Try exact node ID match
            for (const [oldKey, oldEntry] of oldChildMap) {
                if (matchedOldNodes.has(oldKey)) continue;

                if (
                    newChild._nodeId &&
                    oldEntry.vNode._nodeId &&
                    newChild._nodeId === oldEntry.vNode._nodeId
                ) {
                    matchedOldEntry = oldEntry;
                    break;
                }
            }

            // Strategy 2: Try equivalence check
            if (!matchedOldEntry) {
                for (const [oldKey, oldEntry] of oldChildMap) {
                    if (matchedOldNodes.has(oldKey)) continue;

                    if (NodeComparator.nodesAreEquivalent(oldEntry.vNode, newChild)) {
                        matchedOldEntry = oldEntry;
                        break;
                    }
                }
            }

            // Strategy 3: Try simple element matching (conservative)
            if (!matchedOldEntry) {
                for (const [oldKey, oldEntry] of oldChildMap) {
                    if (matchedOldNodes.has(oldKey)) continue;

                    const isSimpleMatch = NodeComparator.isSimpleElementMatch(
                        oldEntry.vNode,
                        newChild
                    );
                    if (isSimpleMatch) {
                        const indexDiff = Math.abs(oldEntry.index - newIndex);
                        if (indexDiff <= 2) {
                            matchedOldEntry = oldEntry;
                            break;
                        }
                    }
                }
            }

            if (matchedOldEntry) {
                // Find actual key in map
                let actualOldKey = null;
                for (const [key, entry] of oldChildMap) {
                    if (entry === matchedOldEntry) {
                        actualOldKey = key;
                        break;
                    }
                }

                if (actualOldKey) {
                    matchedOldNodes.add(actualOldKey);
                }

                operations.push({
                    type: "update",
                    newIndex,
                    oldEntry: matchedOldEntry,
                    newChild,
                    newRealChild,
                });
            } else {
                operations.push({
                    type: "insert",
                    newIndex,
                    newChild,
                    newRealChild,
                });
            }
        }

        // Second pass: identify nodes to remove
        for (const [oldKey, oldEntry] of oldChildMap) {
            if (!matchedOldNodes.has(oldKey)) {
                operations.push({
                    type: "remove",
                    oldEntry,
                });
            }
        }

        // Sort operations: removals first, then insertions/updates in order
        operations.sort((a, b) => {
            if (a.type === "remove") return -1;
            if (b.type === "remove") return 1;
            if (a.type === "insert" || a.type === "update")
                return a.newIndex - b.newIndex;
            return 0;
        });

        // Execute operations
        for (const op of operations) {
            try {
                this.executeOperation(op, realParent);
            } catch (opError) {
                console.error(`Error executing ${op.type} operation:`, opError);
            }
        }
    }

    /**
     * Executes a single patch operation
     * @param {Object} op - Operation to execute
     * @param {Element} realParent - Real parent element
     */
    executeOperation(op, realParent) {
        switch (op.type) {
            case "remove":
                if (op.oldEntry.realNode && !NodeUtils.isHeavyElement(op.oldEntry.realNode)) {
                    op.oldEntry.realNode.remove();
                }
                break;

            case "insert":
                this.handleInsert(op, realParent);
                break;

            case "update":
                this.handleUpdate(op, realParent);
                break;
        }
    }

    /**
     * Handles insert operation
     * @param {Object} op - Insert operation
     * @param {Element} realParent - Real parent element
     */
    handleInsert(op, realParent) {
        const currentChildren = Array.from(realParent.childNodes);
        const existingNode = currentChildren[op.newIndex];
        let shouldSkipInsertion = false;

        if (existingNode) {
            // Check if we're trying to insert something that's already there
            if (op.newChild.type === "text" && existingNode.nodeType === Node.TEXT_NODE) {
                if (existingNode.textContent === op.newChild.content) {
                    shouldSkipInsertion = true;
                }
            } else if (
                op.newChild.type === "element" &&
                existingNode.nodeType === Node.ELEMENT_NODE
            ) {
                if (existingNode.tagName.toLowerCase() === op.newChild.tagName) {
                    shouldSkipInsertion = true;
                }
            }
        }

        if (!shouldSkipInsertion) {
            if (op.newRealChild) {
                const clonedNode = op.newRealChild.cloneNode(true);

                if (op.newIndex >= currentChildren.length) {
                    realParent.appendChild(clonedNode);
                } else {
                    realParent.insertBefore(clonedNode, currentChildren[op.newIndex] || null);
                }

                if (NodeUtils.needsMediaProcessing(clonedNode)) {
                    MediaProcessor.processNewNodeMedia(clonedNode, this.processMediaElement);
                }
            } else if (op.newChild.type === "text") {
                const textNode = document.createTextNode(op.newChild.content);

                if (op.newIndex >= currentChildren.length) {
                    realParent.appendChild(textNode);
                } else {
                    realParent.insertBefore(textNode, currentChildren[op.newIndex] || null);
                }
            } else if (op.newChild.type === "element") {
                const newElement = document.createElement(op.newChild.tagName);

                for (const [attrName, attrValue] of Object.entries(
                    op.newChild.attributes || {}
                )) {
                    newElement.setAttribute(attrName, attrValue);
                }

                if (op.newIndex >= currentChildren.length) {
                    realParent.appendChild(newElement);
                } else {
                    realParent.insertBefore(newElement, currentChildren[op.newIndex] || null);
                }
            }
        }
    }

    /**
     * Handles update operation
     * @param {Object} op - Update operation
     * @param {Element} realParent - Real parent element
     */
    handleUpdate(op, realParent) {
        const { oldEntry, newChild, newRealChild } = op;
        const realNode = oldEntry.realNode;

        if (!realNode) return;

        // For immutable elements, check if content changed
        if (newChild._immutable || oldEntry.vNode._immutable) {
            const oldRaw = oldEntry.vNode.attributes["data-raw"] || "";
            const newRaw = newChild.attributes["data-raw"] || "";
            const oldLang = oldEntry.vNode.attributes["data-language"] || "";
            const newLang = newChild.attributes["data-language"] || "";

            if (oldRaw === newRaw && oldLang === newLang) {
                return;
            } else {
                // Content changed - replace entire element
                if (newRealChild) {
                    const clonedNode = newRealChild.cloneNode(true);
                    realParent.replaceChild(clonedNode, realNode);
                    MediaProcessor.processNewNodeMedia(clonedNode, this.processMediaElement);
                }
                return;
            }
        }

        // Move node to correct position if needed
        const currentChildren = Array.from(realParent.childNodes);
        const currentIndex = currentChildren.indexOf(realNode);

        if (currentIndex !== op.newIndex && currentIndex !== -1) {
            if (op.newIndex >= currentChildren.length) {
                realParent.appendChild(realNode);
            } else {
                const targetNode = currentChildren[op.newIndex];
                if (targetNode !== realNode) {
                    realParent.insertBefore(realNode, targetNode);
                }
            }
        }

        // Update node content/attributes
        if (oldEntry.vNode.type === "element" && newChild.type === "element") {
            if (!NodeUtils.isHeavyElement(realNode)) {
                NodeUtils.updateElementAttributes(realNode, newRealChild);
            }
            // Recursively patch children
            this.patchNode(realNode, oldEntry.vNode, newChild, newRealChild);
        } else if (oldEntry.vNode.type === "text" && newChild.type === "text") {
            if (oldEntry.vNode.content !== newChild.content) {
                realNode.textContent = newChild.content;
            }
        }
    }

    /**
     * Applies a list of changes to the DOM
     * @param {Array} changes - Array of change operations
     */
    applyChanges(changes) {
        // Sort changes: removes first, then updates, then inserts
        const sortedChanges = [...changes].sort((a, b) => {
            const order = {
                removeChild: 0,
                remove: 1,
                updateText: 2,
                updateAttributes: 3,
                replace: 4,
                insertChild: 5,
                insert: 6,
            };
            return (order[a.type] || 10) - (order[b.type] || 10);
        });

        // Apply each change
        for (const change of sortedChanges) {
            try {
                this.applyChange(change);
            } catch (error) {
                console.error(`Error applying ${change.type}:`, error);
            }
        }
    }

    /**
     * Applies a single change operation
     * @param {Object} change - Change operation to apply
     */
    applyChange(change) {
        switch (change.type) {
            case "updateText":
                change.element.textContent = change.newContent;
                break;

            case "updateAttributes":
                for (const attr of change.changes) {
                    if (attr.newValue === null || attr.newValue === undefined) {
                        change.element.removeAttribute(attr.name);
                    } else {
                        change.element.setAttribute(attr.name, attr.newValue);
                    }
                }
                break;

            case "replace":
                change.oldElement.replaceWith(change.newElement);
                MediaProcessor.processNewNodeMedia(change.newElement, this.processMediaElement);
                break;

            case "insertChild":
                const childrenForInsertion = Array.from(change.parent.childNodes);

                if (change.index >= childrenForInsertion.length) {
                    change.parent.appendChild(change.child);
                } else {
                    change.parent.insertBefore(
                        change.child,
                        childrenForInsertion[change.index]
                    );
                }

                MediaProcessor.processNewNodeMedia(change.child, this.processMediaElement);
                break;

            case "removeChild":
                const childrenForRemoval = Array.from(change.parent.childNodes);
                const actualChild = childrenForRemoval.find((child) => child === change.child);

                if (actualChild && actualChild.parentNode === change.parent) {
                    change.parent.removeChild(actualChild);
                }
                break;

            case "remove":
                if (change.element.parentNode) {
                    change.element.parentNode.removeChild(change.element);
                }
                break;
        }
    }
}

