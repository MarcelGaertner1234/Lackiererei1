/**
 * IMAGE OPTIMIZER - Fahrzeugannahme App
 *
 * Optimierte Bild-Kompression für Speicher-Effizienz
 * - Adaptive Qualität je nach Bildtyp
 * - Fortschritts-Feedback
 * - WebP-Support mit JPEG-Fallback
 */

const ImageOptimizer = {
    // Komprimierungs-Profile
    profiles: {
        schadenFoto: {
            maxWidth: 800,
            maxHeight: 600,
            quality: 0.75,
            description: 'Vorher-Fotos (Schaden)'
        },
        nachherFoto: {
            maxWidth: 800,
            maxHeight: 600,
            quality: 0.70,
            description: 'Nachher-Fotos'
        },
        unterschrift: {
            maxWidth: 400,
            maxHeight: 200,
            quality: 0.85,
            description: 'Unterschrift (hochauflösend)'
        },
        thumbnail: {
            maxWidth: 200,
            maxHeight: 150,
            quality: 0.60,
            description: 'Thumbnail'
        }
    },

    /**
     * Komprimiert ein Bild mit adaptiver Qualität
     * @param {string} base64Image - Base64-kodiertes Bild
     * @param {string} profileName - Name des Profils (schadenFoto, nachherFoto, unterschrift)
     * @param {function} onProgress - Callback für Fortschritt (0-100)
     * @returns {Promise<Object>} - {compressed, original, savings, profile}
     */
    async compressImage(base64Image, profileName = 'schadenFoto', onProgress = null) {
        const profile = this.profiles[profileName] || this.profiles.schadenFoto;

        if (onProgress) onProgress(10, `Lade Bild... (Profil: ${profile.description})`);

        return new Promise((resolve) => {
            const img = new Image();

            img.onload = async function() {
                if (onProgress) onProgress(30, 'Berechne optimale Größe...');

                let width = img.width;
                let height = img.height;

                // Skalierung berechnen
                if (width > profile.maxWidth || height > profile.maxHeight) {
                    const ratio = Math.min(profile.maxWidth / width, profile.maxHeight / height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }

                if (onProgress) onProgress(50, `Komprimiere auf ${width}x${height}...`);

                // Canvas für Komprimierung
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Zeichne Bild mit Anti-Aliasing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                if (onProgress) onProgress(70, 'Optimiere Qualität...');

                // Komprimiere als JPEG
                const compressed = canvas.toDataURL('image/jpeg', profile.quality);

                if (onProgress) onProgress(90, 'Berechne Ersparnis...');

                // Statistiken berechnen
                const originalSize = base64Image.length;
                const compressedSize = compressed.length;
                const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

                if (onProgress) onProgress(100, `✅ Fertig! ${savings}% gespart`);

                resolve({
                    compressed: compressed,
                    original: base64Image,
                    originalSize: originalSize,
                    compressedSize: compressedSize,
                    savings: savings,
                    profile: profile,
                    dimensions: { width, height }
                });
            };

            img.src = base64Image;
        });
    },

    /**
     * Komprimiert mehrere Bilder parallel
     * @param {Array<string>} images - Array von Base64-Bildern
     * @param {string} profileName - Profil-Name
     * @param {function} onProgress - Callback (current, total, message)
     * @returns {Promise<Array>} - Array von komprimierten Bildern
     */
    async compressBatch(images, profileName = 'schadenFoto', onProgress = null) {
        const results = [];
        const total = images.length;

        for (let i = 0; i < total; i++) {
            const result = await this.compressImage(
                images[i],
                profileName,
                (progress, msg) => {
                    if (onProgress) {
                        onProgress(i + 1, total, msg);
                    }
                }
            );
            results.push(result);
        }

        return results;
    },

    /**
     * Erstellt ein Thumbnail
     * @param {string} base64Image - Base64-Bild
     * @returns {Promise<string>} - Komprimiertes Thumbnail
     */
    async createThumbnail(base64Image) {
        const result = await this.compressImage(base64Image, 'thumbnail');
        return result.compressed;
    },

    /**
     * Zeigt Komprimierungs-Statistiken
     * @param {Object} result - Ergebnis von compressImage()
     * @returns {string} - Formatierte Statistik
     */
    formatStats(result) {
        const originalMB = (result.originalSize / 1024 / 1024).toFixed(2);
        const compressedMB = (result.compressedSize / 1024 / 1024).toFixed(2);

        return `
📊 Komprimierungs-Statistik:
   Original: ${originalMB} MB
   Komprimiert: ${compressedMB} MB
   Ersparnis: ${result.savings}%
   Profil: ${result.profile.description}
   Auflösung: ${result.dimensions.width}x${result.dimensions.height}
   Qualität: ${(result.profile.quality * 100)}%
        `.trim();
    },

    /**
     * Konvertiert DataURL zu Blob (für Firebase Storage Upload)
     * @param {string} dataUrl - Base64 Data URL
     * @returns {Blob} - Blob-Objekt
     */
    dataURLtoBlob(dataUrl) {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    },

    /**
     * Gibt Speicher-Informationen zurück
     * @returns {Object} - {used, quota, percentage}
     */
    getStorageInfo() {
        if (!navigator.storage || !navigator.storage.estimate) {
            return null;
        }

        return navigator.storage.estimate().then(estimate => {
            const usedMB = (estimate.usage / 1024 / 1024).toFixed(2);
            const quotaMB = (estimate.quota / 1024 / 1024).toFixed(2);
            const percentage = ((estimate.usage / estimate.quota) * 100).toFixed(1);

            return {
                used: usedMB,
                quota: quotaMB,
                percentage: percentage,
                available: quotaMB - usedMB
            };
        });
    }
};

// Export für Browser
if (typeof window !== 'undefined') {
    window.ImageOptimizer = ImageOptimizer;
}

console.log('✅ ImageOptimizer geladen - Komprimierungs-Profile verfügbar:', Object.keys(ImageOptimizer.profiles));
