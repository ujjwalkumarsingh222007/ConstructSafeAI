import apiClient from './client';

export interface UploadResponse {
  success: boolean;
  filename: string;
  original_filename: string;
  size_bytes: number;
  content_type: string;
  url: string;
  uploaded_by: string;
}

export const uploadEvidenceFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<UploadResponse>('/storage/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};
