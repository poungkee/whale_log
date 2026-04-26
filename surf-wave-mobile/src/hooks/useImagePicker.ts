// 이미지 피커 훅 — expo-image-picker로 갤러리/카메라 선택
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { uploadApi } from '../api/upload.api';

interface PickedImage {
  uri: string;
  type?: string;
  fileName?: string;
}

interface UseImagePickerOptions {
  maxImages?: number;
  quality?: number;
}

export const useImagePicker = (options: UseImagePickerOptions = {}) => {
  const { maxImages = 5, quality = 0.8 } = options;
  const [images, setImages] = useState<PickedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const pickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return [];

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: maxImages - images.length,
      quality,
    });

    if (!result.canceled) {
      const picked = result.assets.map((a) => ({
        uri: a.uri,
        type: a.mimeType ?? 'image/jpeg',
        fileName: a.fileName ?? undefined,
      }));
      setImages((prev) => [...prev, ...picked].slice(0, maxImages));
      return picked;
    }
    return [];
  }, [images.length, maxImages, quality]);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return [];

    const result = await ImagePicker.launchCameraAsync({ quality });

    if (!result.canceled) {
      const picked = result.assets.map((a) => ({
        uri: a.uri,
        type: a.mimeType ?? 'image/jpeg',
        fileName: a.fileName ?? undefined,
      }));
      setImages((prev) => [...prev, ...picked].slice(0, maxImages));
      return picked;
    }
    return [];
  }, [maxImages, quality]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => setImages([]), []);

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

  return { images, isUploading, pickFromGallery, takePhoto, removeImage, clearImages, uploadImages };
};
