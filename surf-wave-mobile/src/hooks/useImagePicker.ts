import { useState, useCallback } from 'react';
import { launchImageLibrary, launchCamera, ImagePickerResponse, Asset } from 'react-native-image-picker';
import { uploadApi } from '../api/upload.api';

interface UseImagePickerOptions {
  maxImages?: number;
  quality?: number;
}

export const useImagePicker = (options: UseImagePickerOptions = {}) => {
  const { maxImages = 5, quality = 0.8 } = options;
  const [images, setImages] = useState<Asset[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const pickFromGallery = useCallback(async () => {
    const result: ImagePickerResponse = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: maxImages - images.length,
      quality,
    });

    if (result.assets && !result.didCancel) {
      setImages((prev) => [...prev, ...result.assets!].slice(0, maxImages));
    }
    return result.assets || [];
  }, [images.length, maxImages, quality]);

  const takePhoto = useCallback(async () => {
    const result: ImagePickerResponse = await launchCamera({
      mediaType: 'photo',
      quality,
    });

    if (result.assets && !result.didCancel) {
      setImages((prev) => [...prev, ...result.assets!].slice(0, maxImages));
    }
    return result.assets || [];
  }, [maxImages, quality]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  const uploadImages = useCallback(async (): Promise<string[]> => {
    if (images.length === 0) return [];

    setIsUploading(true);
    try {
      const formData = new FormData();
      images.forEach((image, index) => {
        formData.append('images', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.fileName || `image_${index}.jpg`,
        } as any);
      });

      const response = await uploadApi.uploadImages(formData);
      return response.data.urls;
    } finally {
      setIsUploading(false);
    }
  }, [images]);

  return {
    images,
    isUploading,
    pickFromGallery,
    takePhoto,
    removeImage,
    clearImages,
    uploadImages,
  };
};
