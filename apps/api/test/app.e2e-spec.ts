import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";

describe("Auth + browse smoke flow (e2e)", () => {
  let app: INestApplication<App>;
  const email = `e2e-${Date.now()}@ikstore.dev`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/health returns ok", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("registers a new buyer, logs in, and fetches their profile", async () => {
    const registerResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email,
        password: "SmokeTest123!",
        firstName: "Smoke",
        lastName: "Test",
      });
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.accessToken).toBeDefined();

    const loginResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "SmokeTest123!" });
    expect(loginResponse.status).toBe(200);
    const { accessToken } = loginResponse.body;

    const profileResponse = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.email).toBe(email);
  });

  it("GET /api/v1/products lists active products without auth", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/products");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
