const { resizeAndConvertImage } = require('../src/controllers/avatarController');
const sharp = require('sharp');

// Create a minimal valid PNG buffer (1x1 pixel)
async function createTestImageBuffer(width = 400, height = 400, format = 'png') {
  return sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 100, b: 50 } },
  })
    [format]()
    .toBuffer();
}

describe('resizeAndConvertImage', () => {
  it('resizes and converts a large PNG to WebP', async () => {
    const input = await createTestImageBuffer(800, 800, 'png');
    const output = await resizeAndConvertImage(input);

    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(256);
  });

  it('resizes a JPEG to WebP', async () => {
    const input = await createTestImageBuffer(1000, 600, 'jpeg');
    const output = await resizeAndConvertImage(input);

    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(256);
  });

  it('upscales a small image to 256x256', async () => {
    const input = await createTestImageBuffer(64, 64, 'png');
    const output = await resizeAndConvertImage(input);

    const metadata = await sharp(output).metadata();
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(256);
  });

  it('handles a rectangular (non-square) image using cover fit', async () => {
    const input = await createTestImageBuffer(800, 400, 'png');
    const output = await resizeAndConvertImage(input);

    const metadata = await sharp(output).metadata();
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(256);
  });

  it('rejects an invalid/corrupt buffer', async () => {
    const badBuffer = Buffer.from('not an image');
    await expect(resizeAndConvertImage(badBuffer)).rejects.toThrow();
  });
});
