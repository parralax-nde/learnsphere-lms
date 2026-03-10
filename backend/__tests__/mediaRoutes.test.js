const request = require('supertest');
const app = require('../src/server');

describe('POST /api/media/parse-video-url', () => {
  test('returns embed data for a YouTube URL', async () => {
    const res = await request(app)
      .post('/api/media/parse-video-url')
      .send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    });
  });

  test('returns embed data for a Vimeo URL', async () => {
    const res = await request(app)
      .post('/api/media/parse-video-url')
      .send({ url: 'https://vimeo.com/123456789' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      provider: 'vimeo',
      id: '123456789',
      embedUrl: 'https://player.vimeo.com/video/123456789',
    });
  });

  test('returns 422 for an unrecognised URL', async () => {
    const res = await request(app)
      .post('/api/media/parse-video-url')
      .send({ url: 'https://example.com/video' });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when url is missing', async () => {
    const res = await request(app)
      .post('/api/media/parse-video-url')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/media/upload-image', () => {
  test('returns 400 when no file is attached', async () => {
    const res = await request(app)
      .post('/api/media/upload-image');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 415 for an unsupported file type', async () => {
    const res = await request(app)
      .post('/api/media/upload-image')
      .attach('image', Buffer.from('fake pdf'), { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(415);
  });

  test('uploads a JPEG and returns a URL', async () => {
    // A minimal valid 1x1 JPEG
    const jpegBuffer = Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFgABAQEAAAAAAAAAAAAAAAAABgUEB/9k=',
      'base64',
    );

    const res = await request(app)
      .post('/api/media/upload-image')
      .attach('image', jpegBuffer, { filename: 'test.jpg', contentType: 'image/jpeg' });

    // Without AWS configured the local fallback is used
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('url');
    expect(typeof res.body.url).toBe('string');
  });
});

describe('GET /api/health', () => {
  test('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
