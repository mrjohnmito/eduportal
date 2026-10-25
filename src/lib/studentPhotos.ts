import imageCompression from 'browser-image-compression';
import { supabase } from '@/integrations/supabase/client';

export const PHOTO_MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const PHOTO_TARGET_BYTES = 200 * 1024;
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_SIGNED_SECONDS = 300;

export function validateStudentPhoto(file: Pick<File, 'type' | 'size'>) {
  if (!PHOTO_MIME_TYPES.includes(file.type)) throw new Error('Select a JPG, PNG, or WebP photograph.');
  if (!file.size || file.size > PHOTO_MAX_INPUT_BYTES) throw new Error('Select a photograph no larger than 5 MB.');
}

export function studentPhotoPath(schoolId: string, studentId: string, photoId: string) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (![schoolId, studentId, photoId].every(value => uuid.test(value))) throw new Error('A valid school and student are required.');
  return `${schoolId}/${studentId}/${photoId}.jpg`;
}

export async function prepareStudentPhoto(file: File, onProgress: (progress: number) => void) {
  validateStudentPhoto(file);
  // Decode before compression to reject corrupt files and unsupported image data.
  const image = await createImageBitmap(file);
  if (!image.width || !image.height || image.width * image.height > 40_000_000) {
    image.close();
    throw new Error('This photograph is too large to process. Choose an image below 40 megapixels.');
  }
  image.close();
  return imageCompression(file, {
    maxSizeMB: PHOTO_TARGET_BYTES / (1024 * 1024),
    maxWidthOrHeight: 1200,
    initialQuality: 0.88,
    fileType: 'image/jpeg',
    useWebWorker: true,
    preserveExif: false,
    onProgress,
  });
}

export function storedPhotoPath(value?: string): string | undefined {
  if (!value) return undefined;
  if (!value.includes('://')) return value;
  try {
    const url = new URL(value);
    if (url.origin !== new URL(import.meta.env.VITE_SUPABASE_URL).origin) return undefined;
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/student-photos\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : undefined;
  } catch { return undefined; }
}

export async function resolveStudentPhoto(value?: string) {
  const path = storedPhotoPath(value);
  if (!path) return undefined;
  const { data, error } = await supabase.storage.from('student-photos').createSignedUrl(path, PHOTO_SIGNED_SECONDS);
  if (error) return undefined;
  return data.signedUrl;
}

/** Use an authenticated upload with byte-level progress; never use a service key. */
export async function uploadStudentPhoto(path: string, photo: File, onProgress: (progress: number) => void) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Your session expired. Sign in before uploading a photograph.');
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/student-photos/${path}`);
    request.timeout = 120000;
    request.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    request.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    request.setRequestHeader('Content-Type', 'image/jpeg');
    request.setRequestHeader('x-upsert', 'false');
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) { resolve(); return; }
      let message = 'Photograph upload was rejected. Please check your school access and try again.';
      try { message = JSON.parse(request.responseText).message || message; } catch { /* No response body */ }
      reject(new Error(message));
    };
    request.onerror = () => reject(new Error('The upload connection was interrupted. You can retry safely.'));
    request.ontimeout = () => reject(new Error('The upload timed out. You can retry safely.'));
    request.send(photo);
  });
}

export async function removeUnattachedStudentPhoto(path: string, schoolId: string, studentId: string) {
  const { data, error } = await supabase.from('students').select('photo_url').eq('id', studentId).eq('school_id', schoolId).maybeSingle();
  if (error) throw new Error('Could not confirm photograph cleanup. Retry when your connection returns.');
  if (storedPhotoPath(data?.photo_url || undefined) === path) return;
  const { error: removeError } = await supabase.storage.from('student-photos').remove([path]);
  if (removeError) throw new Error('The student is safe, but an unused photograph could not be removed. Retry cleanup.');
}