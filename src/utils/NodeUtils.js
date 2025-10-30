/**
 * NodeUtils - Utility functions for DOM node operations
 * Provides helper methods for node identification, description, and classification
 */
export class NodeUtils {
    /**
     * Gets a human-readable description of a node for logging
     * @param {Node} node - DOM node to describe
     * @returns {string} Description of the node
     */
    static getNodeDescription(node) {
        if (!node) return 'null';
        
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            return `#text="${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            let desc = node.tagName.toLowerCase();
            if (node.id) desc += `#${node.id}`;
            if (node.className) desc += `.${node.className.split(' ')[0]}`;
            return desc;
        }
        
        return `nodeType=${node.nodeType}`;
    }

    /**
     * Checks if an element is "heavy" and should be preserved during patching
     * Heavy elements include iframes, videos, images with blob/data URLs, and immutable elements
     * @param {Element} element - Element to check
     * @returns {boolean} True if element is heavy
     */
    static isHeavyElement(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

        const tagName = element.tagName.toLowerCase();

        // Heavy elements: iframes, videos, images with blob/data URLs
        if (tagName === "iframe") return true;
        if (tagName === "video") return true;

        if (tagName === "img") {
            const src = element.getAttribute("src");
            if (src && (src.startsWith("blob:") || src.startsWith("data:"))) {
                return true;
            }
        }

        // ANY element marked as immutable should be preserved completely
        if (element.dataset && element.dataset.immutable === "true") {
            return true;
        }

        // Check for processed media wrapper elements
        if (element.dataset && element.dataset.processedMedia === "true") {
            return true;
        }

        return false;
    }

    /**
     * Checks if a node needs media processing
     * @param {Element} node - Node to check
     * @returns {boolean} True if node contains media elements
     */
    static needsMediaProcessing(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return false;

        const tagName = node.tagName.toLowerCase();

        // Check if it's a media element or contains media elements
        if (tagName === "img" || tagName === "video" || tagName === "iframe") {
            return true;
        }

        // Check if it contains media elements
        const hasMedia = node.querySelector("img, video, iframe");
        if (hasMedia) return true;

        // Check if it contains code blocks
        const hasCodeBlocks = node.querySelector("pre code");
        if (hasCodeBlocks) return true;

        return false;
    }

    /**
     * Checks if a URL is a local file path that would cause browser security errors
     * @param {string} url - The URL to check
     * @returns {boolean} True if it's a local file path
     */
    static isLocalFilePath(url) {
        // Check for explicit file:// protocol
        if (url.startsWith("file://")) return true;

        // Check for relative paths that don't start with http/https/blob/data
        if (
            !url.startsWith("http") &&
            !url.startsWith("blob:") &&
            !url.startsWith("data:") &&
            !url.startsWith("//") &&
            !url.startsWith("#")
        ) {
            return true;
        }

        return false;
    }

    /**
     * Updates element attributes from new element to old element
     * @param {Element} oldElement - Element to update
     * @param {Element} newElement - Element with new attributes
     */
    static updateElementAttributes(oldElement, newElement) {
        if (
            oldElement.nodeType !== Node.ELEMENT_NODE ||
            newElement.nodeType !== Node.ELEMENT_NODE
        ) {
            return;
        }

        // Don't update attributes for heavy elements
        if (NodeUtils.isHeavyElement(oldElement)) {
            return;
        }

        // Remove old attributes that don't exist in new element
        for (const attr of oldElement.attributes) {
            if (!newElement.hasAttribute(attr.name)) {
                oldElement.removeAttribute(attr.name);
            }
        }

        // Add/update attributes from new element
        for (const attr of newElement.attributes) {
            if (oldElement.getAttribute(attr.name) !== attr.value) {
                oldElement.setAttribute(attr.name, attr.value);
            }
        }
    }
}

