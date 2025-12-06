import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
});

export function getImageKitAuthParams() {
  return imagekit.getAuthenticationParameters();
}

export async function uploadImage(file: Buffer, fileName: string, folder?: string) {
  try {
    const response = await imagekit.upload({
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
    await imagekit.deleteFile(fileId);
    return true;
  } catch (error) {
    console.error("ImageKit delete error:", error);
    throw error;
  }
}

export default imagekit;
