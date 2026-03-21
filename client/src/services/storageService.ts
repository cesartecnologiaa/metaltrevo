import { uploadFileToCloudinary } from '@/lib/cloudinary';

/**
 * Upload de imagem diretamente para o Cloudinary
 */
export async function uploadImageToCloudinary(
  file: File,
  path: string
): Promise<string> {
  try {
    return await uploadFileToCloudinary(file, path);
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error('Erro ao fazer upload da imagem');
  }
}

/**
 * Upload de imagem de produto para Cloudinary
 */
export async function uploadProductImage(
  file: File,
  productId: string
): Promise<string> {
  try {
    return await uploadImageToCloudinary(file, `erp-metal-trevo/products/${productId}`);
  } catch (error) {
    console.error('Error uploading product image:', error);
    throw new Error('Erro ao fazer upload da imagem do produto');
  }
}

/**
 * Deletar imagem do Cloudinary requer backend assinado.
 * Mantido como no-op para não bloquear exclusão de cadastros.
 */
export async function deleteProductImage(_imageUrl: string): Promise<void> {
  return;
}
