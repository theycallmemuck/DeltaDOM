/**
 * NodeComparator - Handles node-level comparison operations
 * Provides methods to determine if nodes are equivalent or similar
 */
export class NodeComparator {
    /**
     * Compares two virtual nodes to see if they're equivalent
     * Uses multiple strategies: node IDs, immutable markers, and attribute comparison
     * @param {Object} vNode1 - First virtual node
     * @param {Object} vNode2 - Second virtual node
     * @returns {boolean} True if nodes are equivalent
     */
    static nodesAreEquivalent(vNode1, vNode2) {
        if (!vNode1 || !vNode2) return false;
        if (vNode1.nodeType !== vNode2.nodeType) return false;

        if (vNode1.type === "text") {
            const content1 = vNode1.content;
            const content2 = vNode2.content;

            if (content1 === content2) return true;

            // If both are just whitespace/newlines, consider them equivalent
            const trimmed1 = content1.trim();
            const trimmed2 = content2.trim();
            if (!trimmed1 && !trimmed2) return true;

            return false;
        }

        if (vNode1.type === "element") {
            if (vNode1.tagName !== vNode2.tagName) return false;

            // For immutable elements (code blocks), compare based on their position first
            if (vNode1._immutable || vNode2._immutable) {
                const position1 = vNode1.attributes["data-block-position"] || "";
                const position2 = vNode2.attributes["data-block-position"] || "";

                // If they have the same position, they're the same code block
                if (
                    position1 &&
                    position2 &&
                    position1 === position2 &&
                    vNode1.tagName === vNode2.tagName
                ) {
                    return true;
                }

                // Fallback to content comparison if no position data
                const rawContent1 = vNode1.attributes["data-raw"] || "";
                const rawContent2 = vNode2.attributes["data-raw"] || "";
                const lang1 = vNode1.attributes["data-language"] || "";
                const lang2 = vNode2.attributes["data-language"] || "";

                return (
                    rawContent1 === rawContent2 &&
                    lang1 === lang2 &&
                    vNode1.tagName === vNode2.tagName
                );
            }

            // Use node ID for better comparison
            if (vNode1._nodeId && vNode2._nodeId) {
                return vNode1._nodeId === vNode2._nodeId;
            }

            // Fallback to attribute comparison
            const keyAttrs = ["src", "href", "data-entity", "id", "class"];
            for (const attr of keyAttrs) {
                if (vNode1.attributes[attr] !== vNode2.attributes[attr]) {
                    return false;
                }
            }

            return true;
        }

        return false;
    }

    /**
     * Checks if two nodes are a simple element match (for more flexible matching)
     * Used as a fallback when strict equivalence fails
     * @param {Object} vNode1 - First virtual node
     * @param {Object} vNode2 - Second virtual node
     * @returns {boolean} True if nodes are similar enough to match
     */
    static isSimpleElementMatch(vNode1, vNode2) {
        if (!vNode1 || !vNode2) return false;

        // Text node matching - only match if similar in nature
        if (vNode1.type === "text" && vNode2.type === "text") {
            const content1 = vNode1.content.trim();
            const content2 = vNode2.content.trim();

            // Both empty/whitespace
            if (!content1 && !content2) return true;

            // Both have content - only match if they're similar in nature
            if (content1 && content2) {
                const isSingleChar1 = content1.length === 1;
                const isSingleChar2 = content2.length === 1;
                return isSingleChar1 === isSingleChar2;
            }

            return false;
        }

        // Element matching - be restrictive
        if (vNode1.type === "element" && vNode2.type === "element") {
            const selfClosingElements = ["br", "hr"];

            // Only match self-closing elements of the same type
            if (
                selfClosingElements.includes(vNode1.tagName) &&
                selfClosingElements.includes(vNode2.tagName) &&
                vNode1.tagName === vNode2.tagName
            ) {
                return true;
            }

            // For container elements, require stricter matching
            const containerElements = [
                "p", "div", "span", "strong", "em", "u", "i", "b"
            ];
            if (
                containerElements.includes(vNode1.tagName) &&
                containerElements.includes(vNode2.tagName) &&
                vNode1.tagName === vNode2.tagName
            ) {
                const children1 = vNode1.children || [];
                const children2 = vNode2.children || [];

                // Match if both have no children or both have similar child count
                if (children1.length === 0 && children2.length === 0) return true;
                if (
                    children1.length > 0 &&
                    children2.length > 0 &&
                    Math.abs(children1.length - children2.length) <= 1
                ) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Checks if two real DOM children match (same element or equivalent)
     * @param {Node} oldChild - Old DOM child
     * @param {Node} newChild - New DOM child
     * @param {Function} isHeavyElement - Function to check if element is heavy
     * @returns {boolean} True if children match
     */
    static childrenMatch(oldChild, newChild, isHeavyElement) {
        if (!oldChild || !newChild) return false;

        // Check if they're the same heavy element
        if (isHeavyElement(oldChild) && isHeavyElement(newChild)) {
            const oldSrc =
                oldChild.getAttribute?.("src") ||
                oldChild.getAttribute?.("data-original-src");
            const newSrc =
                newChild.getAttribute?.("src") ||
                newChild.getAttribute?.("data-original-src");

            return oldSrc && newSrc && oldSrc === newSrc;
        }

        // For non-heavy elements, check if they're similar
        if (oldChild.nodeType === newChild.nodeType) {
            if (oldChild.nodeType === Node.TEXT_NODE) {
                return oldChild.textContent === newChild.textContent;
            }

            if (
                oldChild.nodeType === Node.ELEMENT_NODE &&
                oldChild.tagName === newChild.tagName
            ) {
                const oldText = oldChild.textContent?.trim();
                const newText = newChild.textContent?.trim();
                return oldText === newText;
            }
        }

        return false;
    }

    /**
     * Compares attributes between two elements
     * @param {Element} oldElement - Old element
     * @param {Element} newElement - New element
     * @returns {Array} Array of attribute changes
     */
    static compareAttributes(oldElement, newElement) {
        const changes = [];
        const oldAttrs = new Map();
        const newAttrs = new Map();

        // Collect attributes
        for (const attr of oldElement.attributes) {
            oldAttrs.set(attr.name, attr.value);
        }
        for (const attr of newElement.attributes) {
            newAttrs.set(attr.name, attr.value);
        }

        // Find changes
        const allKeys = new Set([...oldAttrs.keys(), ...newAttrs.keys()]);
        for (const key of allKeys) {
            const oldValue = oldAttrs.get(key);
            const newValue = newAttrs.get(key);

            if (oldValue !== newValue) {
                changes.push({ name: key, oldValue, newValue });
            }
        }

        return changes;
    }
}

