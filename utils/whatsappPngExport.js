/**
 * WhatsApp-optimized PNG export utility
 * Ensures perfect layout, no blue tint, proper compression
 */

/**
 * Export element optimized for WhatsApp sharing
 * @param {HTMLElement} element - Element to capture
 * @param {object} options - Export options
 * @returns {Promise<{success: boolean, blob?: Blob, url?: string, metadata?: object}>}
 */
export async function exportForWhatsApp(element, options = {}) {
  const {
    backgroundColor = '#0b0b0f',
    filename = 'whatsapp-export',
    targetWidth = 1600,
    compressionQuality = 1.0
  } = options

  try {
    console.log('🚀 Starting WhatsApp-optimized export...')
    
    // Dynamic import of html2canvas
    const html2canvas = (await import('html2canvas')).default
    
    // Ensure element is fully rendered
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Calculate optimal dimensions
    const rect = element.getBoundingClientRect()
    const aspectRatio = rect.height / rect.width
    const targetHeight = Math.round(targetWidth * aspectRatio)
    
    console.log('📐 Dimensions:', {
      original: `${rect.width}x${rect.height}`,
      target: `${targetWidth}x${targetHeight}`,
      scale: targetWidth / rect.width
    })
    
    // Apply temporary styles for better capture
    const originalStyles = {
      transform: element.style.transform,
      width: element.style.width,
      minWidth: element.style.minWidth,
      maxWidth: element.style.maxWidth
    }
    
    // Force specific width for capture
    element.style.width = `${targetWidth}px`
    element.style.minWidth = `${targetWidth}px`
    element.style.maxWidth = `${targetWidth}px`
    element.style.transform = 'translateZ(0)' // Force GPU acceleration
    
    // Wait for layout to stabilize
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const canvas = await html2canvas(element, {
      backgroundColor,
      width: targetWidth,
      height: targetHeight,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      logging: false,
      removeContainer: true,
      foreignObjectRendering: false,
      imageTimeout: 20000,
      onclone: (clonedDoc) => {
        // Enhance text rendering in cloned document
        const style = clonedDoc.createElement('style')
        style.textContent = `
          * {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
            font-feature-settings: "liga" 1, "kern" 1 !important;
          }
          
          div, span, p, h1, h2, h3, h4, h5, h6 {
            font-display: block !important;
          }
        `
        clonedDoc.head.appendChild(style)
      }
    })
    
    // Restore original styles
    Object.assign(element.style, originalStyles)
    
    console.log('🎨 Canvas created:', {
      dimensions: `${canvas.width}x${canvas.height}`,
      pixelRatio: window.devicePixelRatio
    })
    
    // Create optimized blob
    const blob = await new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/png',
        compressionQuality
      )
    })
    
    if (!blob) {
      throw new Error('Failed to create blob from canvas')
    }
    
    // Create download URL
    const url = URL.createObjectURL(blob)
    
    const metadata = {
      width: canvas.width,
      height: canvas.height,
      size: blob.size,
      sizeMB: (blob.size / 1024 / 1024).toFixed(2),
      format: 'PNG',
      whatsappReady: blob.size <= 15 * 1024 * 1024, // 15MB limit
      aspectRatio: (canvas.height / canvas.width).toFixed(3)
    }
    
    console.log('✅ Export successful:', metadata)
    
    return {
      success: true,
      blob,
      url,
      metadata,
      canvas
    }
    
  } catch (error) {
    console.error('❌ WhatsApp export failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Download blob as file with WhatsApp-optimized filename
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Base filename
 * @param {object} metadata - Export metadata
 */
export function downloadWhatsAppImage(blob, filename, metadata = {}) {
  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    
    // Generate descriptive filename
    const timestamp = new Date().toISOString().slice(0, 10)
    const sizeInfo = metadata.sizeMB ? `_${metadata.sizeMB}MB` : ''
    const finalFilename = `${filename}_WhatsApp_${timestamp}${sizeInfo}.png`
    
    link.download = finalFilename
    link.href = url
    
    // Add to DOM temporarily
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up URL
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    
    console.log('💾 Download initiated:', finalFilename)
    
    return true
    
  } catch (error) {
    console.error('Download failed:', error)
    return false
  }
}

/**
 * Validate image for WhatsApp compatibility
 * @param {Blob} blob - Image blob to validate
 * @returns {Promise<{isValid: boolean, issues: string[], recommendations: string[]}>}
 */
export async function validateForWhatsApp(blob) {
  const issues = []
  const recommendations = []
  
  try {
    // Check file size (WhatsApp limit ~16MB, we target 15MB)
    const sizeMB = blob.size / 1024 / 1024
    if (sizeMB > 15) {
      issues.push(`File size ${sizeMB.toFixed(1)}MB exceeds WhatsApp 15MB limit`)
      recommendations.push('Reduce image dimensions or increase compression')
    } else if (sizeMB > 10) {
      recommendations.push('Consider reducing size for faster sharing')
    }
    
    // Check format
    if (blob.type !== 'image/png') {
      issues.push(`Format ${blob.type} may not be optimal for WhatsApp`)
      recommendations.push('Use PNG format for best compatibility')
    }
    
    // Create image to check dimensions
    const imageUrl = URL.createObjectURL(blob)
    const img = new Image()
    
    return new Promise((resolve) => {
      img.onload = () => {
        // Check dimensions
        if (img.width < 1200 || img.width > 2000) {
          issues.push(`Width ${img.width}px outside recommended 1200-2000px range`)
          recommendations.push('Adjust width to 1440-1920px for optimal WhatsApp display')
        }
        
        if (img.height > 8000) {
          issues.push(`Height ${img.height}px may be too large for some devices`)
          recommendations.push('Consider breaking into multiple images if very tall')
        }
        
        const aspectRatio = img.height / img.width
        if (aspectRatio > 4) {
          recommendations.push('Very tall image - consider landscape orientation for better viewing')
        }
        
        URL.revokeObjectURL(imageUrl)
        
        resolve({
          isValid: issues.length === 0,
          issues,
          recommendations,
          metadata: {
            width: img.width,
            height: img.height,
            sizeMB: sizeMB.toFixed(1),
            aspectRatio: aspectRatio.toFixed(2)
          }
        })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(imageUrl)
        resolve({
          isValid: false,
          issues: ['Failed to load image for validation'],
          recommendations: ['Check image format and try again'],
          metadata: null
        })
      }
      
      img.src = imageUrl
    })
    
  } catch (error) {
    return {
      isValid: false,
      issues: [`Validation error: ${error.message}`],
      recommendations: ['Try exporting again'],
      metadata: null
    }
  }
}

/**
 * Complete WhatsApp export workflow
 * @param {HTMLElement} element - Element to export
 * @param {string} filename - Base filename
 * @param {object} options - Export options
 * @returns {Promise<boolean>} Success status
 */
export async function completeWhatsAppExport(element, filename, options = {}) {
  try {
    console.log('🔄 Starting complete WhatsApp export workflow...')
    
    // Step 1: Export
    const result = await exportForWhatsApp(element, options)
    if (!result.success) {
      throw new Error(result.error)
    }
    
    // Step 2: Validate
    const validation = await validateForWhatsApp(result.blob)
    console.log('🔍 Validation result:', validation)
    
    if (!validation.isValid) {
      console.warn('⚠️ Validation issues:', validation.issues)
      if (validation.recommendations.length > 0) {
        console.info('💡 Recommendations:', validation.recommendations)
      }
    }
    
    // Step 3: Download
    const downloadSuccess = downloadWhatsAppImage(result.blob, filename, result.metadata)
    
    if (downloadSuccess) {
      console.log('🎉 WhatsApp export completed successfully!')
      
      // Show user feedback
      if (validation.recommendations.length > 0) {
        console.info('Recommendations for optimal sharing:', validation.recommendations)
      }
      
      return true
    } else {
      throw new Error('Download failed')
    }
    
  } catch (error) {
    console.error('❌ Complete export workflow failed:', error)
    alert(`Export failed: ${error.message}`)
    return false
  }
}