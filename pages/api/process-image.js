import { ensureSolidSRGB, validateWhatsAppReady } from '../../lib/imageProcessor';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB limit for processing
    });

    const [fields, files] = await form.parse(req);
    const imageFile = files.image?.[0];

    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Read uploaded file
    const inputBuffer = fs.readFileSync(imageFile.filepath);

    // Process image for WhatsApp compatibility
    const result = await ensureSolidSRGB(inputBuffer);

    // Validate results
    const pngValidation = await validateWhatsAppReady(result.png);
    const jpegValidation = await validateWhatsAppReady(result.jpeg);

    // Choose best format (prefer PNG if both are valid, or the valid one)
    let outputBuffer;
    let contentType;
    let fileName;

    if (pngValidation.isValid && result.png.length <= 15 * 1024 * 1024) {
      outputBuffer = result.png;
      contentType = 'image/png';
      fileName = 'processed-image.png';
    } else if (jpegValidation.isValid) {
      outputBuffer = result.jpeg;
      contentType = 'image/jpeg';
      fileName = 'processed-image.jpg';
    } else {
      // Force PNG with more aggressive compression
      const sharp = require('sharp');
      outputBuffer = await sharp(inputBuffer)
        .flatten({ background: '#0b0b0f' })
        .png({ compressionLevel: 9, quality: 80 })
        .withMetadata({ icc: 'sRGB IEC61966-2.1' })
        .toBuffer();
      contentType = 'image/png';
      fileName = 'processed-image-compressed.png';
    }

    // Clean up temp file
    try {
      fs.unlinkSync(imageFile.filepath);
    } catch (e) {
      console.warn('Could not delete temp file:', e.message);
    }

    // Return processed image
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', outputBuffer.length);
    
    // Add metadata headers
    res.setHeader('X-Image-Width', result.metadata?.width || 'unknown');
    res.setHeader('X-Image-Height', result.metadata?.height || 'unknown');
    res.setHeader('X-PNG-Size', result.metadata?.pngSize || 'unknown');
    res.setHeader('X-JPEG-Size', result.metadata?.jpegSize || 'unknown');
    res.setHeader('X-WhatsApp-Ready', pngValidation.isValid ? 'true' : 'false');

    res.send(outputBuffer);

  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ 
      error: 'Image processing failed',
      details: error.message 
    });
  }
}