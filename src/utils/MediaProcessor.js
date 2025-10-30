import { NodeUtils } from './NodeUtils.js';

/**
 * MediaProcessor - Handles media element processing and validation
 * Responsible for processing images, videos, and other media elements during patching
 */
export class MediaProcessor {
    /**
     * Processes media elements in newly added nodes
     * @param {Element} node - Node to process
     * @param {Function} processMediaElement - Callback function to process individual media elements
     */
    static processNewNodeMedia(node, processMediaElement) {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        // Find img elements that need processing
        const images = node.tagName === "IMG" ? [node] : node.querySelectorAll("img");

        for (const img of images) {
            const src = img.getAttribute("src");
            if (
                src &&
                !src.startsWith("blob:") &&
                !src.startsWith("data:") &&
                !src.startsWith("http")
            ) {
                // This is a file path that needs processing
                img.dataset.forceReprocess = "true";
                if (processMediaElement) {
                    processMediaElement(img);
                }
            } else if (src && NodeUtils.isLocalFilePath(src)) {
                // Catch any remaining local file paths that might cause browser errors
                img.dataset.forceReprocess = "true";
                if (processMediaElement) {
                    processMediaElement(img);
                }
            }
        }
    }
}

