import { upload } from "@vercel/blob/client";
import { nanoid } from "nanoid";

interface UploadProgress {
  loaded: number;
  total: number;
}

const BATCH_SIZE = 5; // Maximum number of parallel uploads

export async function uploadWithProgress(
  file: File,
  projectId: string,
  options: {
    onUploadProgress?: (progressEvent: {
      loaded: number;
      total: number;
      percentage: number;
    }) => void;
  } = {},
) {
  try {
    // Get file extension
    const extension = file.name.split(".").pop();

    // Create a unique filename with random ID
    const uniqueFilename = `${projectId}/${nanoid(16)}.${extension}`;

    // Upload using the secure client upload
    const blob = await upload(uniqueFilename, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      onUploadProgress: (progress: UploadProgress) => {
        if (options.onUploadProgress) {
          options.onUploadProgress({
            loaded: progress.loaded,
            total: progress.total,
            percentage: Math.round((progress.loaded / progress.total) * 100),
          });
        }
      },
    });

    return blob;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

export async function uploadMultipleWithProgress(
  files: File[],
  projectId: string,
  options: {
    onUploadProgress?: (progressEvent: {
      loaded: number;
      total: number;
      percentage: number;
      fileIndex: number;
    }) => void;
    onBatchComplete?: (completedCount: number, totalCount: number) => void;
  } = {},
) {
  const results = [];
  const totalFiles = files.length;
  let completedFiles = 0;

  // Process files in batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);

    // Upload batch in parallel
    const batchPromises = batch.map((file, batchIndex) =>
      uploadWithProgress(file, projectId, {
        onUploadProgress: (progress) => {
          if (options.onUploadProgress) {
            options.onUploadProgress({
              ...progress,
              fileIndex: i + batchIndex,
            });
          }
        },
      }),
    );

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      completedFiles += batch.length;

      if (options.onBatchComplete) {
        options.onBatchComplete(completedFiles, totalFiles);
      }
    } catch (error) {
      console.error(`Error uploading batch starting at index ${i}:`, error);
      throw error;
    }
  }

  return results;
}
