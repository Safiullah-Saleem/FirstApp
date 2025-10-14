const ImageKit = require("imagekit");

// Check if ImageKit environment variables are set
const hasimagekitconfig =
  process.env.IMAGEKIT_PUBLIC_KEY &&
  process.env.IMAGEKIT_PRIVATE_KEY &&
  process.env.IMAGEKIT_URL_ENDPOINT;

let imagekit = null;

if (hasimagekitconfig) {
  // Initialize ImageKit
  imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
  console.log("✅ ImageKit initialized successfully");
} else {
  console.warn(
    "⚠️ ImageKit environment variables not set. Image uploads will be disabled."
  );
}

class ImageKitService {
  /**
   * Validate upload inputs
   */
  static validateUploadInputs(file, companyCode, fileName) {
    if (!file || !file.buffer) {
      return { valid: false, error: "No file provided" };
    }

    if (!companyCode || typeof companyCode !== "string") {
      return { valid: false, error: "Valid company code is required" };
    }

    if (!fileName || typeof fileName !== "string") {
      return { valid: false, error: "Valid file name is required" };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: "File size must be less than 10MB" };
    }

    // Validate file type (images only)
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedMimeTypes.join(
          ", "
        )}`,
      };
    }

    return { valid: true };
  }

  /**
   * Upload image with retry logic
   */
  static async uploadImage(file, companyCode, fileName, maxRetries = 3) {
    try {
      console.log("🔄 Starting ImageKit upload process...");
      console.log(
        `📁 File details: ${file.originalname}, size: ${file.size} bytes, type: ${file.mimetype}`
      );
      console.log(`🏢 Company code: ${companyCode}`);
      console.log(`📝 Generated filename: ${fileName}`);

      // Input validation
      const validation = this.validateUploadInputs(file, companyCode, fileName);
      if (!validation.valid) {
        console.error("❌ Upload validation failed:", validation.error);
        return {
          success: false,
          error: validation.error,
        };
      }

      if (!imagekit) {
        console.error(
          "❌ ImageKit not configured - missing environment variables"
        );
        return {
          success: false,
          error:
            "ImageKit not configured. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT environment variables.",
        };
      }

      // Retry logic with exponential backoff
      let lastError;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Upload attempt ${attempt}/${maxRetries}`);

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
              name: uploadResult.name,
              size: uploadResult.size,
              fileType: uploadResult.fileType,
            },
          };
        } catch (error) {
          lastError = error;
          console.warn(`⚠️ Upload attempt ${attempt} failed:`, error.message);

          if (attempt < maxRetries) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      console.error("❌ All upload attempts failed");
      throw lastError;
    } catch (error) {
      console.error("❌ ImageKit upload failed:", error.message);
      console.error("📊 Error details:", {
        name: error.name,
        code: error.code,
        status: error.status,
      });

      // Handle specific ImageKit errors
      let userMessage = error.message;
      if (error.status === 429) {
        userMessage = "Upload limit exceeded. Please try again later.";
      } else if (error.status === 401) {
        userMessage =
          "ImageKit authentication failed. Please check your configuration.";
      }

      return {
        success: false,
        error: userMessage,
        details: {
          code: error.code,
          status: error.status,
        },
      };
    }
  }

  /**
   * Delete image from ImageKit
   */
  static async deleteImage(fileId) {
    try {
      console.log(`🗑️ Deleting ImageKit file: ${fileId}`);

      if (!fileId || typeof fileId !== "string") {
        return {
          success: false,
          error: "Valid file ID is required",
        };
      }

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

      // Handle specific delete errors
      let userMessage = error.message;
      if (error.status === 404) {
        userMessage = "File not found. It may have already been deleted.";
      } else if (error.status === 401) {
        userMessage =
          "ImageKit authentication failed. Please check your configuration.";
      }

      return {
        success: false,
        error: userMessage,
        details: {
          code: error.code,
          status: error.status,
        },
      };
    }
  }

  /**
   * Health check for ImageKit configuration
   */
  static async healthCheck() {
    try {
      if (!imagekit) {
        return {
          healthy: false,
          message: "ImageKit not configured - missing environment variables",
          config: {
            hasPublicKey: !!process.env.IMAGEKIT_PUBLIC_KEY,
            hasPrivateKey: !!process.env.IMAGEKIT_PRIVATE_KEY,
            hasUrlEndpoint: !!process.env.IMAGEKIT_URL_ENDPOINT,
          },
        };
      }

      // Test authentication by making a simple API call
      // ImageKit doesn't have a dedicated ping endpoint, so we'll use listFiles with limit 1
      await imagekit.listFiles({
        limit: 1,
      });

      return {
        healthy: true,
        message: "ImageKit is configured and responsive",
        config: {
          urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
          publicKey: process.env.IMAGEKIT_PUBLIC_KEY
            ? "***" + process.env.IMAGEKIT_PUBLIC_KEY.slice(-4)
            : "Not set",
        },
      };
    } catch (error) {
      console.error("❌ ImageKit health check failed:", error.message);
      return {
        healthy: false,
        message: `ImageKit health check failed: ${error.message}`,
        error: {
          name: error.name,
          status: error.status,
          code: error.code,
        },
      };
    }
  }

  /**
   * Get ImageKit authentication parameters for client-side uploads
   */
  static getAuthenticationParameters() {
    if (!imagekit) {
      return {
        success: false,
        error: "ImageKit not configured",
      };
    }

    try {
      const authenticationParameters = imagekit.getAuthenticationParameters();
      return {
        success: true,
        data: authenticationParameters,
      };
    } catch (error) {
      console.error("❌ Failed to get authentication parameters:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = ImageKitService;
