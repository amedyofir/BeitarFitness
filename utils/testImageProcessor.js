/**
 * Test utility for image processor
 * Run with: node utils/testImageProcessor.js
 */

const { ensureSolidSRGB, validateWhatsAppReady } = require('../lib/imageProcessor');
const fs = require('fs');
const path = require('path');

async function testImageProcessor() {
  console.log('🧪 Testing Image Processor for WhatsApp compatibility...\n');
  
  // Create a test image buffer (simple PNG)
  // This simulates what we'd get from html2canvas
  const sharp = require('sharp');
  
  try {
    // Create test image with transparency
    const testImageBuffer = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 4,
        background: { r: 11, g: 11, b: 15, alpha: 0.8 } // Semi-transparent
      }
    })
    .png()
    .toBuffer();
    
    console.log('📷 Created test image:', {
      size: `${(testImageBuffer.length / 1024).toFixed(1)}KB`,
      dimensions: '1600x900',
      hasAlpha: true
    });
    
    // Test validation before processing
    const beforeValidation = await validateWhatsAppReady(testImageBuffer);
    console.log('\n❌ Before processing validation:', beforeValidation);
    
    // Process with ensureSolidSRGB
    console.log('\n🔄 Processing image...');
    const result = await ensureSolidSRGB(testImageBuffer, '#0b0b0f');
    
    // Test validation after processing
    const pngValidation = await validateWhatsAppReady(result.png);
    const jpegValidation = await validateWhatsAppReady(result.jpeg);
    
    console.log('\n✅ After processing validation (PNG):', pngValidation);
    console.log('\n✅ After processing validation (JPEG):', jpegValidation);
    
    console.log('\n📊 Processing results:', {
      pngSize: `${(result.png.length / 1024 / 1024).toFixed(2)}MB`,
      jpegSize: `${(result.jpeg.length / 1024 / 1024).toFixed(2)}MB`,
      dimensions: `${result.metadata.width}x${result.metadata.height}`,
      compressionRatio: `${((1 - result.png.length / testImageBuffer.length) * 100).toFixed(1)}%`
    });
    
    // Save test outputs
    const outputDir = path.join(__dirname, '../public/test-outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(outputDir, 'test-processed.png'), result.png);
    fs.writeFileSync(path.join(outputDir, 'test-processed.jpg'), result.jpeg);
    
    console.log('\n💾 Test files saved to /public/test-outputs/');
    console.log('✨ Image processor test completed successfully!');
    
    return {
      success: true,
      pngValid: pngValidation.isValid,
      jpegValid: jpegValidation.isValid,
      results: result.metadata
    };
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run test if called directly
if (require.main === module) {
  testImageProcessor()
    .then((result) => {
      console.log('\n📋 Test Summary:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { testImageProcessor };