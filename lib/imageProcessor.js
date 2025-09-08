const sharp = require('sharp');
const fs = require('fs').promises;

/**
 * Ensures image has solid background and sRGB profile for WhatsApp compatibility
 * @param {Buffer} inputBuffer - Input image buffer
 * @param {string} background - Background color (default: '#0b0b0f')
 * @returns {Promise<{png: Buffer, jpeg: Buffer, metadata: object}>}
 */
async function ensureSolidSRGB(inputBuffer, background = '#0b0b0f') {
  try {
    // Get image metadata
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    
    // Calculate optimal dimensions (1440-1920px width)
    const targetWidth = Math.min(Math.max(metadata.width || 1440, 1440), 1920);
    const targetHeight = Math.round((metadata.height || 1080) * (targetWidth / (metadata.width || 1440)));
    
    // Create base processed image
    const processedImage = image
      .resize(targetWidth, targetHeight, {
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false
      })
      .flatten({ background }) // Remove alpha channel
      .withMetadata({
        icc: 'sRGB IEC61966-2.1', // Embed sRGB profile
        exif: {} // Strip EXIF data
      });
    
    // Generate PNG with optimal compression
    const pngBuffer = await processedImage
      .png({
        compressionLevel: 8, // High compression
        palette: false, // Keep as RGB
        quality: 100,
        effort: 8 // Maximum effort for smaller file
      })
      .toBuffer();
    
    // Generate JPEG fallback
    const jpegBuffer = await processedImage
      .jpeg({
        quality: 92,
        chromaSubsampling: '4:4:4', // No chroma subsampling
        progressive: true,
        optimiseScans: true,
        overshootDeringing: true,
        trellisQuantisation: true
      })
      .toBuffer();
    
    return {
      png: pngBuffer,
      jpeg: jpegBuffer,
      metadata: {
        width: targetWidth,
        height: targetHeight,
        pngSize: pngBuffer.length,
        jpegSize: jpegBuffer.length
      }
    };
    
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

/**
 * Process uploaded image for WhatsApp sharing
 * @param {string} inputPath - Path to input image
 * @param {string} outputDir - Output directory
 * @param {string} baseName - Base name for output files
 * @returns {Promise<{pngPath: string, jpegPath: string, metadata: object}>}
 */
async function processImageFile(inputPath, outputDir, baseName) {
  try {
    // Read input file
    const inputBuffer = await fs.readFile(inputPath);
    
    // Process with ensureSolidSRGB
    const result = await ensureSolidSRGB(inputBuffer);
    
    // Generate output paths
    const pngPath = `${outputDir}/${baseName}.png`;
    const jpegPath = `${outputDir}/${baseName}.jpg`;
    
    // Write processed files
    await fs.writeFile(pngPath, result.png);
    await fs.writeFile(jpegPath, result.jpeg);
    
    return {
      pngPath,
      jpegPath,
      metadata: result.metadata
    };
    
  } catch (error) {
    console.error('Error processing image file:', error);
    throw error;
  }
}

/**
 * Quick validation that image is WhatsApp-ready
 * @param {Buffer} imageBuffer - Image buffer to validate
 * @returns {Promise<{isValid: boolean, issues: string[]}>}
 */
async function validateWhatsAppReady(imageBuffer) {
  const issues = [];
  
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const stats = await image.stats();
    
    // Check alpha channel
    if (metadata.channels > 3) {
      // Check if alpha is effectively opaque
      const { data } = await image.raw().toBuffer({ resolveWithObject: true });
      const hasTransparency = checkAlphaTransparency(data, metadata);
      if (hasTransparency) {
        issues.push('Image contains transparency');
      }
    }
    
    // Check color space
    if (metadata.space !== 'srgb') {
      issues.push(`Color space is ${metadata.space}, should be sRGB`);
    }
    
    // Check file size (WhatsApp limit ~16MB, we target <15MB)
    if (imageBuffer.length > 15 * 1024 * 1024) {
      issues.push(`File size ${Math.round(imageBuffer.length / 1024 / 1024)}MB exceeds 15MB limit`);
    }
    
    // Check dimensions
    if (metadata.width < 1440 || metadata.width > 1920) {
      issues.push(`Width ${metadata.width}px outside optimal range 1440-1920px`);
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        space: metadata.space,
        size: imageBuffer.length
      }
    };
    
  } catch (error) {
    return {
      isValid: false,
      issues: [`Validation error: ${error.message}`],
      metadata: null
    };
  }
}

/**
 * Check if image data contains meaningful transparency
 */
function checkAlphaTransparency(data, metadata) {
  if (metadata.channels <= 3) return false;
  
  const pixelCount = metadata.width * metadata.height;
  const channels = metadata.channels;
  
  // Sample every 100th pixel's alpha channel
  for (let i = channels - 1; i < data.length; i += channels * 100) {
    if (data[i] < 255) {
      return true; // Found transparency
    }
  }
  
  return false;
}

module.exports = {
  ensureSolidSRGB,
  processImageFile,
  validateWhatsAppReady
};