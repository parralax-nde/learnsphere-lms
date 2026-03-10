const request = require('supertest');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');

// Set environment variables before requiring the app
process.env.JWT_SECRET = 'test-secret';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET = 'test-bucket';
process.env.AVATAR_MAX_SIZE_MB = '5';
process.env.AVATAR_DIMENSIONS = '256';

// Mock mongoose and User model
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue(undefined),
  };
});

const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  avatarUrl: null,
  save: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../src/models/User', () => ({
  findById: jest.fn().mockImplementation(() => ({
    select: jest.fn().mockResolvedValue(mockUser),
  })),
}));

// Mock S3 client
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
  };
});

// Mock sharp for the controller (keep real sharp for direct tests)
jest.mock('sharp', () => {
  const mockSharpInstance = {
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-webp-data')),
  };
  const sharpFn = jest.fn().mockReturnValue(mockSharpInstance);
  return sharpFn;
});

const app = require('../src/app');

function makeToken(userId = mockUser._id) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function createTestPng() {
  // Use the actual sharp to create a test PNG
  const actualSharp = jest.requireActual('sharp');
  return actualSharp({
    create: { width: 100, height: 100, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .png()
    .toBuffer();
}

describe('POST /api/profile/avatar', () => {
  let s3Send;

  beforeEach(() => {
    mockUser.avatarUrl = null;
    mockUser.save.mockClear();

    const { S3Client } = require('@aws-sdk/client-s3');
    s3Send = S3Client.mock.results[0].value.send;
    s3Send.mockClear();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/profile/avatar');
    expect(res.status).toBe(401);
  });

  it('returns 400 when no file is attached', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no image/i);
  });

  it('returns 415 for unsupported file type', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', Buffer.from('fake pdf data'), {
        filename: 'document.pdf',
        contentType: 'application/pdf',
      });
    expect(res.status).toBe(415);
  });

  it('uploads a valid PNG and returns avatar URL', async () => {
    const token = makeToken();
    const pngBuffer = Buffer.from('png-buffer');

    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', pngBuffer, {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('avatarUrl');
    expect(res.body.avatarUrl).toContain('test-bucket');
    expect(mockUser.save).toHaveBeenCalledTimes(1);
  });

  it('uploads a valid JPEG and updates user profile', async () => {
    const token = makeToken();

    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', Buffer.from('jpeg-data'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
    expect(mockUser.avatarUrl).toContain('avatars/');
  });

  it('deletes old avatar when uploading new one', async () => {
    mockUser.avatarUrl = `https://test-bucket.s3.us-east-1.amazonaws.com/avatars/${mockUser._id}/old.webp`;
    const token = makeToken();

    await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', Buffer.from('new-image'), {
        filename: 'new.png',
        contentType: 'image/png',
      });

    // S3 send should be called twice: once for upload, once for delete
    expect(s3Send).toHaveBeenCalledTimes(2);
  });
});

describe('DELETE /api/profile/avatar', () => {
  beforeEach(() => {
    mockUser.avatarUrl = `https://test-bucket.s3.us-east-1.amazonaws.com/avatars/${mockUser._id}/photo.webp`;
    mockUser.save.mockClear();

    const { S3Client } = require('@aws-sdk/client-s3');
    S3Client.mock.results[0].value.send.mockClear();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).delete('/api/profile/avatar');
    expect(res.status).toBe(401);
  });

  it('returns 404 when user has no avatar', async () => {
    mockUser.avatarUrl = null;
    const token = makeToken();
    const res = await request(app)
      .delete('/api/profile/avatar')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('successfully deletes avatar', async () => {
    const token = makeToken();
    const res = await request(app)
      .delete('/api/profile/avatar')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed/i);
    expect(mockUser.avatarUrl).toBeNull();
    expect(mockUser.save).toHaveBeenCalledTimes(1);
  });
});
