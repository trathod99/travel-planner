import { storage } from './clientApp';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export interface FileUploadResult {
  name: string;
  url: string;
  type: string;
  size: number;
  path: string;
}

export async function uploadAttachment(
  file: File,
  tripId: string,
  itemId: string
): Promise<FileUploadResult> {
  try {
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const path = `trips/${tripId}/attachments/${filename}`;
    const storageRef = ref(storage, path);
    
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    return {
      url,
      name: file.name,
      type: file.type,
      size: file.size,
      path, // Store the path for later use
    };
  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw new Error('Failed to upload file. Please check your permissions and try again.');
  }
}

export async function deleteAttachment(path: string): Promise<void> {
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Error deleting attachment:', error);
    throw new Error('Failed to delete file. Please try again.');
  }
}

export async function getAttachmentDownloadUrl(path: string): Promise<string> {
  try {
    // If it's already a download URL, extract the path
    if (path.includes('firebasestorage.googleapis.com')) {
      const pathMatch = path.match(/o\/(.*?)\?/);
      if (pathMatch) {
        path = decodeURIComponent(pathMatch[1]);
      }
    }
    
    const fileRef = ref(storage, path);
    const url = await getDownloadURL(fileRef);
    
    // Add token and alt=media to ensure proper access
    const urlObj = new URL(url);
    if (!urlObj.searchParams.has('alt')) {
      urlObj.searchParams.append('alt', 'media');
    }
    
    return urlObj.toString();
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw new Error('Failed to access file. Please try again.');
  }
} 