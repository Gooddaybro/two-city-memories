/**
 * Client-side photo compression & EXIF/GPS stripping utility.
 * Re-encoding through <canvas> automatically strips EXIF metadata (including GPS coordinates)
 * and outputs compact WebP (with JPEG fallback on browsers without WebP encoding support).
 */

export function computeScaledDimensions(width, height, maxDimension = 1600) {
  const w = Math.max(1, Math.round(Number(width) || 0));
  const h = Math.max(1, Math.round(Number(height) || 0));
  const limit = Math.max(200, Math.round(Number(maxDimension) || 1600));

  if (w <= limit && h <= limit) {
    return { width: w, height: h };
  }
  if (w >= h) {
    return { width: limit, height: Math.max(1, Math.round((h * limit) / w)) };
  }
  return { width: Math.max(1, Math.round((w * limit) / h)), height: limit };
}

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法解析该图片文件，请选择 JPG / PNG / WebP / HEIC 图片'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('预览图生成失败'));
    reader.readAsDataURL(blob);
  });
}

export async function compressImageFile(file, { maxDimension = 1600, quality = 0.82 } = {}) {
  if (!file) throw new Error('请选择要上传的照片');

  let source = null;
  let naturalWidth = 0;
  let naturalHeight = 0;
  let closeBitmap = null;

  if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
    try {
      const bitmap = await window.createImageBitmap(file, { imageOrientation: 'from-image' });
      source = bitmap;
      naturalWidth = bitmap.width;
      naturalHeight = bitmap.height;
      closeBitmap = () => bitmap.close?.();
    } catch {
      // Fall back to HTMLImageElement
    }
  }

  if (!source) {
    const img = await loadImageElement(file);
    source = img;
    naturalWidth = img.naturalWidth || img.width;
    naturalHeight = img.naturalHeight || img.height;
  }

  try {
    const { width, height } = computeScaledDimensions(naturalWidth, naturalHeight, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('浏览器 Canvas 初始化失败');
    ctx.drawImage(source, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, 'image/webp', quality);
    let mimeType = 'image/webp';

    // Some browsers silently fall back to image/png if WebP encoding is unsupported
    if (!blob || blob.type !== 'image/webp') {
      blob = await canvasToBlob(canvas, 'image/jpeg', Math.min(0.88, quality + 0.04));
      mimeType = 'image/jpeg';
    }

    if (!blob) {
      throw new Error('图片压缩失败，请换一张照片重试');
    }

    const previewDataUrl = await blobToDataUrl(blob);
    return {
      blob,
      mimeType,
      width,
      height,
      originalSize: file.size || 0,
      compressedSize: blob.size,
      previewDataUrl
    };
  } finally {
    closeBitmap?.();
  }
}
