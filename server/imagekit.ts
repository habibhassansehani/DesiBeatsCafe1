import ImageKit from "imagekit";

let imagekit: ImageKit | null = null;

function getImageKit(): ImageKit {
  if (!imagekit) {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

    if (!publicKey || !privateKey || !urlEndpoint) {
      throw new Error("ImageKit credentials not configured. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT.");
    }

    imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
  }
  return imagekit;
}

export function getImageKitAuthParams() {
  return getImageKit().getAuthenticationParameters();
}

export async function uploadImage(file: Buffer, fileName: string, folder?: string) {
  try {
    const response = await getImageKit().upload({
      file: file,
      fileName: fileName,
      folder: folder || "/cafe-pos",
    });
    return response;
  } catch (error) {
    console.error("ImageKit upload error:", error);
    throw error;
  }
}

export async function deleteImage(fileId: string) {
  try {
    await getImageKit().deleteFile(fileId);
    return true;
  } catch (error) {
    console.error("ImageKit delete error:", error);
    throw error;
  }
}

export default { getImageKitAuthParams, uploadImage, deleteImage };
