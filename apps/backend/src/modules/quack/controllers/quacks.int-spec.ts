import { createTestApp, signUp } from '@/testing/test-app';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('GET /api/quacks', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 401 to a signed-out visitor', async () => {
    await request(app.getHttpServer()).get('/api/quacks').expect(401);
  });

  it('answers 200 to a signed-in user', async () => {
    const user = await signUp(app);

    const response = await user.get('/api/quacks').expect(200);

    expect(response.body).toEqual([]);
  });
});
