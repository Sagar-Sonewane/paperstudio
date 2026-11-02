import JSZip from "jszip";

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB limit

export async function loadDocxZip(fileData: Blob | ArrayBuffer | Uint8Array): Promise<JSZip> {
  let buffer: ArrayBuffer;

  if (fileData instanceof Blob) {
    if (fileData.size === 0) {
      throw new Error("Empty file uploaded. Please select a valid .docx document.");
    }
    if (fileData.size > MAX_FILE_SIZE_BYTES) {
      throw new Error("File exceeds maximum allowed upload size (25 MB).");
    }
    buffer = await fileData.arrayBuffer();
  } else if (fileData instanceof Uint8Array) {
    if (fileData.byteLength === 0) {
      throw new Error("Empty file uploaded. Please select a valid .docx document.");
    }
    if (fileData.byteLength > MAX_FILE_SIZE_BYTES) {
      throw new Error("File exceeds maximum allowed upload size (25 MB).");
    }
    buffer = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength) as ArrayBuffer;
  } else {
    if (fileData.byteLength === 0) {
      throw new Error("Empty file uploaded. Please select a valid .docx document.");
    }
    if (fileData.byteLength > MAX_FILE_SIZE_BYTES) {
      throw new Error("File exceeds maximum allowed upload size (25 MB).");
    }
    buffer = fileData;
  }

  // Quick check for OLE Compound File header (D0 CF 11 E0) which signals password-protected or legacy binary DOC
  const headerBytes = new Uint8Array(buffer, 0, Math.min(8, buffer.byteLength));
  if (
    headerBytes.length >= 4 &&
    headerBytes[0] === 0xd0 &&
    headerBytes[1] === 0xcf &&
    headerBytes[2] === 0x11 &&
    headerBytes[3] === 0xe0
  ) {
    throw new Error(
      "Password-protected or legacy binary Word document detected. Please save as a standard unprotected .docx and re-upload."
    );
  }

  // Check for PK zip header (50 4B 03 04)
  if (
    headerBytes.length >= 4 &&
    !(headerBytes[0] === 0x50 && headerBytes[1] === 0x4b && (headerBytes[2] === 0x03 || headerBytes[2] === 0x05))
  ) {
    throw new Error("Invalid file format. The uploaded file is not a valid Word (.docx) archive.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (err: any) {
    throw new Error(`Corrupted or unreadable Word document: ${err?.message || "Invalid zip structure"}`);
  }

  if (zip.file("EncryptedPackage")) {
    throw new Error(
      "This document is password-protected. Please remove password protection before uploading."
    );
  }

  const documentXmlFile = zip.file("word/document.xml");
  if (!documentXmlFile) {
    throw new Error(
      "Invalid Word document: missing word/document.xml. Ensure the file is a standard .docx document."
    );
  }

  return zip;
}
