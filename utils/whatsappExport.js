/**
 * Enhanced image and PDF export utilities for WhatsApp compatibility
 */

/**
 * Convert canvas to optimized blob for WhatsApp
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {object} options - Export options
 * @returns {Promise<{blob: Blob, url: string, metadata: object}>}
 */
export async function canvasToWhatsAppBlob(canvas, options = {}) {
  const {
    backgroundColor = '#0b0b0f',
    maxWidth = 2560,  // Increased from 1920 for higher resolution
    minWidth = 1920,  // Increased from 1440 for higher base resolution  
    quality = 1.0,    // Maximum quality
    format = 'png'
  } = options;

  try {
    // Create new canvas with flattened background
    const flatCanvas = document.createElement('canvas');
    const ctx = flatCanvas.getContext('2d');
    
    // Set optimal dimensions
    const targetWidth = Math.min(Math.max(canvas.width, minWidth), maxWidth);
    const targetHeight = Math.round(canvas.height * (targetWidth / canvas.width));
    
    flatCanvas.width = targetWidth;
    flatCanvas.height = targetHeight;
    
    // Fill with solid background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    
    // Draw original canvas on top
    ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
    
    // Convert to blob
    const blob = await new Promise((resolve) => {
      if (format === 'jpeg') {
        flatCanvas.toBlob(resolve, 'image/jpeg', quality);
      } else {
        flatCanvas.toBlob(resolve, 'image/png', quality);
      }
    });
    
    const url = URL.createObjectURL(blob);
    
    return {
      blob,
      url,
      metadata: {
        width: targetWidth,
        height: targetHeight,
        size: blob.size,
        type: blob.type
      }
    };
    
  } catch (error) {
    console.error('Canvas to blob conversion failed:', error);
    throw error;
  }
}

/**
 * Enhanced html2canvas export with WhatsApp optimization
 * @param {HTMLElement} element - Element to capture
 * @param {object} options - Export options
 * @returns {Promise<{png: string, jpeg: string, metadata: object}>}
 */
export async function exportElementForWhatsApp(element, options = {}) {
  const {
    backgroundColor = '#0b0b0f',
    filename = 'export',
    dualFormat = true,
    captureWidth = null,
    maintainAspectRatio = true,
    scale = 3  // Increased from 2 to 3 for higher quality
  } = options;

  try {
    // Dynamic import of html2canvas
    const html2canvas = (await import('html2canvas')).default;
    
    // Get element dimensions
    const rect = element.getBoundingClientRect();
    
    // Use custom width or actual element width
    const targetWidth = captureWidth || rect.width;
    const targetHeight = maintainAspectRatio 
      ? Math.round(rect.height * (targetWidth / rect.width))
      : rect.height;
    
    // Higher scale for better quality
    const captureScale = scale || 2;
    
    const canvas = await html2canvas(element, {
      backgroundColor,
      scale: captureScale,
      width: rect.width,
      height: rect.height,
      windowWidth: rect.width,
      windowHeight: rect.height,
      useCORS: true,
      allowTaint: true,
      removeContainer: true,
      imageTimeout: 15000,
      logging: false,
      onclone: (clonedDoc) => {
        // Ensure all text is sharp
        const style = clonedDoc.createElement('style');
        style.textContent = `
          * {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      }
    });
    
    // Generate PNG
    const pngResult = await canvasToWhatsAppBlob(canvas, { 
      backgroundColor, 
      format: 'png', 
      quality: 1.0 
    });
    
    const pngUrl = canvas.toDataURL('image/png', 1.0);
    
    let jpegResult = null;
    let jpegUrl = null;
    
    if (dualFormat) {
      // Generate JPEG fallback
      jpegResult = await canvasToWhatsAppBlob(canvas, { 
        backgroundColor, 
        format: 'jpeg', 
        quality: 0.92 
      });
      jpegUrl = canvas.toDataURL('image/jpeg', 0.92);
    }
    
    return {
      png: pngUrl,
      jpeg: jpegUrl,
      pngBlob: pngResult,
      jpegBlob: jpegResult,
      canvas: canvas,
      metadata: {
        width: canvas.width,
        height: canvas.height,
        pngSize: pngResult.blob.size,
        jpegSize: jpegResult?.blob.size || 0
      }
    };
    
  } catch (error) {
    console.error('Element export failed:', error);
    throw error;
  }
}

/**
 * Download processed image with fallback options
 * @param {string} dataUrl - Data URL of the image
 * @param {string} filename - Filename for download
 * @param {object} options - Download options
 */
export function downloadImage(dataUrl, filename, options = {}) {
  const {
    fallbackFormat = 'jpeg',
    showMetadata = false
  } = options;

  try {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    
    // Add to DOM temporarily and click
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (showMetadata) {
      // Show size info
      const byteLength = Math.round((dataUrl.length * 3) / 4);
      const sizeMB = (byteLength / 1024 / 1024).toFixed(1);
      console.log(`Downloaded: ${filename} (${sizeMB}MB)`);
    }
    
  } catch (error) {
    console.error('Download failed:', error);
    
    // Fallback: try to open in new tab
    try {
      const newWindow = window.open();
      newWindow.document.write(`<img src="${dataUrl}" style="max-width:100%; height:auto;">`);
      newWindow.document.title = filename;
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      alert('Download failed. Please try right-clicking on the image and saving manually.');
    }
  }
}

/**
 * Validate image for WhatsApp compatibility (client-side approximation)
 * @param {string} dataUrl - Data URL of the image
 * @returns {object} Validation result
 */
export function validateImageForWhatsApp(dataUrl) {
  const issues = [];
  
  try {
    // Estimate file size from data URL
    const base64Length = dataUrl.split(',')[1].length;
    const sizeBytes = Math.round(base64Length * 0.75);
    const sizeMB = sizeBytes / 1024 / 1024;
    
    // Check file size
    if (sizeMB > 15) {
      issues.push(`File size ${sizeMB.toFixed(1)}MB exceeds WhatsApp 15MB limit`);
    }
    
    // Check format
    const format = dataUrl.split(';')[0].split(':')[1];
    if (!['image/png', 'image/jpeg'].includes(format)) {
      issues.push(`Format ${format} may not be supported by WhatsApp`);
    }
    
    // Create image to check dimensions
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 1440 || img.width > 1920) {
          issues.push(`Width ${img.width}px outside optimal range 1440-1920px`);
        }
        
        if (img.height > 10000) {
          issues.push(`Height ${img.height}px may be too large for WhatsApp`);
        }
        
        resolve({
          isValid: issues.length === 0,
          issues,
          metadata: {
            width: img.width,
            height: img.height,
            format,
            sizeMB: sizeMB.toFixed(1)
          }
        });
      };
      img.src = dataUrl;
    });
    
  } catch (error) {
    return Promise.resolve({
      isValid: false,
      issues: [`Validation error: ${error.message}`],
      metadata: null
    });
  }
}