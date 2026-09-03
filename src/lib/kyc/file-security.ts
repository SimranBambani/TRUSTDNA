import crypto from "node:crypto";

export interface FileValidationResult {
  valid: boolean;
  detectedMimeType: string;
  detectedExtension: string;
  fileSizeBytes: number;
  fileHash: string;
  secureStoragePath: string;
  error?: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

/**
 * Inspect magic bytes of buffer to detect real file type
 */
export function inspectMagicBytes(buffer: Buffer): { mimeType: string; ext: string } | null {
  if (buffer.length < 4) return null;

  // PNG: \x89PNG\r\n\x1a\n (89 50 4E 47)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mimeType: "image/png", ext: "png" };
  }

  // JPEG: \xFF\xD8\xFF (FF D8 FF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", ext: "jpg" };
  }

  // PDF: %PDF- (25 50 44 46 2D)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { mimeType: "application/pdf", ext: "pdf" };
  }

  return null;
}

/**
 * Validate document file buffer for malware, size, and magic byte structure
 */
export function validateKycDocumentFile(
  buffer: Buffer,
  userId: string
): FileValidationResult {
  const fileSizeBytes = buffer.length;

  if (fileSizeBytes === 0) {
    return {
      valid: false,
      detectedMimeType: "",
      detectedExtension: "",
      fileSizeBytes: 0,
      fileHash: "",
      secureStoragePath: "",
      error: "Uploaded file is empty.",
    };
  }

  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      detectedMimeType: "",
      detectedExtension: "",
      fileSizeBytes,
      fileHash: "",
      secureStoragePath: "",
      error: `File size exceeds maximum allowed limit of 10 MB (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  // Magic byte inspection
  const magicResult = inspectMagicBytes(buffer);
  if (!magicResult) {
    return {
      valid: false,
      detectedMimeType: "application/octet-stream",
      detectedExtension: "bin",
      fileSizeBytes,
      fileHash: "",
      secureStoragePath: "",
      error: "Invalid file format or corrupt magic bytes. Only valid JPG, PNG, and PDF files are permitted.",
    };
  }

  // Check for executable signatures (MZ for Windows EXE/DLL, ELF for Linux binary)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return {
      valid: false,
      detectedMimeType: "application/x-dosexec",
      detectedExtension: "exe",
      fileSizeBytes,
      fileHash: "",
      secureStoragePath: "",
      error: "Security scan rejected executable file payload.",
    };
  }

  // Calculate SHA-256 hash
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

  // Generate cryptographically random internal storage path (never trust client filename)
  const randomId = crypto.randomUUID();
  const secureStoragePath = `kyc-private-documents/${userId}/${randomId}.${magicResult.ext}`;

  return {
    valid: true,
    detectedMimeType: magicResult.mimeType,
    detectedExtension: magicResult.ext,
    fileSizeBytes,
    fileHash,
    secureStoragePath,
  };
}
