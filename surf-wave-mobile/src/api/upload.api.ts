import { api } from '../config/api';

export const uploadApi = {
  uploadImage: (formData: FormData) =>
    api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  uploadImages: (formData: FormData) =>
    api.post('/upload/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getPresignedUrl: (data: { filename: string; contentType: string }) =>
    api.post('/upload/presigned-url', data),
};
