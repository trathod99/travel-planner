import { uploadAttachment, FileUploadResult } from '../lib/firebase/storage';

export async function uploadFile(
  file: File,
  tripId: string,
  itemId: string
): Promise<FileUploadResult & { file: File }> {
  const attachment = {
    ...(await uploadAttachment(file, tripId, itemId)),
    file // Keep the original file for later AI analysis
  };
  return attachment;
} 