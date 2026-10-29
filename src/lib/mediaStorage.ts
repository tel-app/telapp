// Local IndexedDB Storage for Media Blobs (Free Firebase Spark Tier)
// Stores high-definition video and photo uploads directly on client device
// and generates lightweight base64 canvas snapshot thumbnails for Firestore sync.

const DB_NAME = 'telapp_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMediaBlob(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openMediaDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save media blob to IndexedDB:', err);
  }
}

export async function getMediaBlob(key: string): Promise<Blob | null> {
  try {
    const db = await openMediaDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Generate compressed canvas snapshot thumbnail (base64) from local video
export function generateVideoThumbnail(file: File): Promise<{ thumbnailUrl: string; duration: string }> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = objectUrl;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let durationStr = '0:15';

    video.onloadedmetadata = () => {
      const secs = Math.floor(video.duration) || 15;
      const mins = Math.floor(secs / 60);
      const remSecs = secs % 60;
      durationStr = `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
      video.currentTime = Math.min(1.0, video.duration / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        // Compact resolution for efficient Firestore storage
        canvas.width = 400;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumb = canvas.toDataURL('image/jpeg', 0.65);
          URL.revokeObjectURL(objectUrl);
          resolve({ thumbnailUrl: thumb, duration: durationStr });
          return;
        }
      } catch {
        // Fallback
      }
      URL.revokeObjectURL(objectUrl);
      resolve({
        thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        duration: durationStr
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        duration: '0:15'
      });
    };
  });
}

// Generate compressed canvas thumbnail from image file
export function generateImageThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 640;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
          return;
        }
        resolve(e.target?.result as string);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
