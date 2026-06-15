/* ============================================================
   NS Turing - API Provider Interface
   ============================================================ */

/**
 * Abstract interface for AI image generation providers.
 * Each provider must implement:
 *   - generateImage({ prompt, referenceImages, config }): Promise<string[]>
 *
 * @interface
 */
class ImageProvider {
    /** @returns {string} Provider identifier */
    get name() {
        throw new Error("Not implemented");
    }

    /**
     * Generate one or more images.
     * @param {Object} params
     * @param {string} params.prompt - Text prompt
     * @param {string[]} params.referenceImages - Array of data URL strings (optional)
     * @param {Object} params.config - Full app config (apiKeys, proxyUrl, models, etc.)
     * @returns {Promise<string[]>} Array of base64 data URL images
     */
    async generateImage({ prompt, referenceImages, config }) {
        throw new Error("Not implemented");
    }

    /**
     * @returns {{ supportsResolution: boolean, maxRefImages: number }}
     */
    getCapabilities() {
        throw new Error("Not implemented");
    }
}

// Expose globally for non-module script loading (UXP compatibility)
window.ImageProvider = ImageProvider;
