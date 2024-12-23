import { storage } from './clientApp';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export interface FileUploadResult {
  name: string;
  url: string;
  type: string;
  size: number;
}

export async function uploadAttachment(
  file: File,
  tripId: string,
  itemId: string
): Promise<FileUploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 10MB limit');
  }

  // Create a reference to the file location
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `trip-attachments/${tripId}/${itemId}/${fileName}`;
  const fileRef = ref(storage, filePath);

  try {
    // Upload the file
    const snapshot = await uploadBytes(fileRef, file);
    
    // Get the download URL
    const url = await getDownloadURL(fileRef);

    return {
      name: file.name,
      url,
      type: file.type,
      size: file.size,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export async function deleteAttachment(url: string): Promise<void> {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
} 