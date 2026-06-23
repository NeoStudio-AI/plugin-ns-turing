/* ============================================================
   NS Turing - API Provider Interface
   ============================================================ */

/**
 * Abstract interface for AI image generation providers.
 */
export class ImageProvider {
    get name() {
        throw new Error("Not implemented");
    }

    async generateImage({ prompt, referenceImages, config }) {
        throw new Error("Not implemented");
    }

    getCapabilities() {
        throw new Error("Not implemented");
    }
}
