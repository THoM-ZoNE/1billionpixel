import sharp from "sharp";

export const resizeForArea = async (
  buffer: Buffer, mimeType: string, width: number, height: number
): Promise<Buffer> => {
  if (mimeType === "image/gif") {
    // sharp does not animate GIFs perfectly — return as-is for GIFs
    return buffer;
  }
  return sharp(buffer)
    .resize(width, height, { fit: "fill" })
    .toBuffer();
};
