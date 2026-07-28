import { RedisContainer } from "@testcontainers/redis";
import { GenericContainer, Wait } from "testcontainers";

export default async function globalSetup() {
  const [redis, mailpit] = await Promise.all([
    new RedisContainer("redis:7-alpine").start(),
    new GenericContainer("axllent/mailpit:v1.30.4")
      .withExposedPorts(1025, 8025)
      .withWaitStrategy(Wait.forListeningPorts())
      .start(),
  ]);

  process.env.NODE_ENV = "test";
  process.env.REDIS_URL = redis.getConnectionUrl();
  process.env.SMTP_HOST = mailpit.getHost();
  process.env.SMTP_PORT = String(mailpit.getMappedPort(1025));
  process.env.SMTP_SECURE = "false";
  process.env.MAIL_FROM = "noreply@readometer.local";
  process.env.MAILPIT_HTTP_URL = `http://${mailpit.getHost()}:${mailpit.getMappedPort(8025)}`;

  return async () => {
    await Promise.all([redis.stop(), mailpit.stop()]);
  };
}
