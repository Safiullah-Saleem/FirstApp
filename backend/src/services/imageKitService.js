const ImageKit = require("imagekit");

// Check if ImageKit environment variables are set
const hasImageKitConfig = process.env.IMAGEKIT_PUBLIC_KEY && 
                         process.env.IMAGEKIT_PRIVATE_KEY && 
                         process.env.IMAGEKIT_URL_ENDPOINT;

let imagekit = null;

if (hasImageKitConfig) {
  // Initialize ImageKit
  imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
  console.log("✅ ImageKit initialized successfully");
} else {
  console.warn("⚠️ ImageKit environment variables not set. Image uploads will be disabled.");
}

class ImageKitService {
  static async uploadImage(file, companyCode, fileName) {
    try {
      console.log("🔄 Starting ImageKit upload process...");
      console.log(`📁 File details: ${file.originalname}, size: ${file.size} bytes, type: ${file.mimetype}`);
      console.log(`🏢 Company code: ${companyCode}`);
      console.log(`📝 Generated filename: ${fileName}`);

      if (!imagekit) {
        console.error("❌ ImageKit not configured - missing environment variables");
        return {
          success: false,
          error: "ImageKit not configured. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT environment variables.",
        };
      }

      const uploadResult = await imagekit.upload({
        file: file.buffer,
        fileName: fileName,
        folder: `/companies/${companyCode}/items/`,
        useUniqueFileName: true,
        tags: [`company-${companyCode}`, "item-image"],
      });

      console.log("✅ ImageKit upload successful!");
      console.log(`🔗 Upload URL: ${uploadResult.url}`);
      console.log(`🆔 File ID: ${uploadResult.fileId}`);
      console.log(`📂 File Path: ${uploadResult.filePath}`);

      return {
        success: true,
        data: {
          url: uploadResult.url,
          fileId: uploadResult.fileId,
          filePath: uploadResult.filePath,
        },
      };
    } catch (error) {
      console.error("❌ ImageKit upload failed:", error.message);
      console.error("📊 Error details:", {
        name: error.name,
        code: error.code,
        status: error.status,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async deleteImage(fileId) {
    try {
      console.log(`🗑️ Deleting ImageKit file: ${fileId}`);
      
      if (!imagekit) {
        console.error("❌ ImageKit not configured - cannot delete file");
        return {
          success: false,
          error: "ImageKit not configured. Cannot delete file.",
        };
      }
      
      const result = await imagekit.deleteFile(fileId);
      
      console.log("✅ ImageKit file deleted successfully");
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error("❌ ImageKit delete failed:", error.message);
      console.error("📊 Error details:", {
        name: error.name,
        code: error.code,
        status: error.status,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = ImageKitService;
