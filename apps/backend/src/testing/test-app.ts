import { AppModule } from '@/app.module';
import { configureApp } from '@/app.setup';
import { Config } from '@/shared/config/config.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import TestAgent from 'supertest/lib/agent';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

/**
 * Registers a new user through the real auth endpoint and returns an agent that
 * sends that user's session cookie with every request.
 */
export async function signUp(
  app: INestApplication,
  name = 'Test Duck',
): Promise<TestAgent> {
  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/api/auth/sign-up/email')
    // better-auth rejects state-changing requests without a trusted origin
    .set('Origin', app.get(Config).frontendUrl)
    .send({
      name,
      email: `${name.toLowerCase().replace(/\W+/g, '.')}@example.com`,
      password: 'password123',
    })
    .expect(200);
  return agent;
}
