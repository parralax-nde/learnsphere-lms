const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const userStore = require("../src/models/userStore");

const JWT_SECRET = process.env.JWT_SECRET || "learnsphere-dev-secret";

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

const EXISTING_USER_ID = "user-001";

const ownerToken = makeToken({ id: EXISTING_USER_ID, role: "student" });
const otherToken = makeToken({ id: "user-999", role: "student" });
const adminToken = makeToken({ id: "admin-001", role: "admin" });

// Reset user store state before each test
beforeEach(() => {
  userStore.updateProfile(EXISTING_USER_ID, {
    firstName: "Alice",
    lastName: "Smith",
    bio: "Passionate educator and lifelong learner.",
    phone: "+1-555-0100",
    website: "https://alice.example.com",
  });
});

describe("GET /api/users/:id", () => {
  it("returns 401 when no token is provided", async () => {
    const res = await request(app).get(`/api/users/${EXISTING_USER_ID}`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("returns 401 for an invalid token", async () => {
    const res = await request(app)
      .get(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", "Bearer bad.token.here");
    expect(res.status).toBe(401);
  });

  it("returns 200 and user data for the profile owner", async () => {
    const res = await request(app)
      .get(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: EXISTING_USER_ID,
      firstName: "Alice",
      lastName: "Smith",
    });
  });

  it("returns 200 for an admin viewing any profile", async () => {
    const res = await request(app)
      .get(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(EXISTING_USER_ID);
  });

  it("returns 403 when a non-owner, non-admin accesses a profile", async () => {
    const res = await request(app)
      .get(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent user", async () => {
    const res = await request(app)
      .get("/api/users/does-not-exist")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/users/:id", () => {
  const validPayload = {
    firstName: "Alicia",
    lastName: "Smith",
    bio: "Updated bio.",
    phone: "+1-555-0199",
    website: "https://alicia.example.com",
  };

  it("returns 401 when no token is provided", async () => {
    const res = await request(app)
      .put(`/api/users/${EXISTING_USER_ID}`)
      .send(validPayload);
    expect(res.status).toBe(401);
  });

  it("returns 403 when a non-owner attempts to update a profile", async () => {
    const res = await request(app)
      .put(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send(validPayload);
    expect(res.status).toBe(403);
  });

  it("returns 200 and updated user data on a valid request", async () => {
    const res = await request(app)
      .put(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(validPayload);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Profile updated successfully.");
    expect(res.body.user).toMatchObject({
      firstName: "Alicia",
      lastName: "Smith",
      bio: "Updated bio.",
    });
  });

  it("allows an admin to update any user's profile", async () => {
    const res = await request(app)
      .put(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validPayload);
    expect(res.status).toBe(200);
    expect(res.body.user.firstName).toBe("Alicia");
  });

  it("preserves immutable fields (id, email, createdAt) after update", async () => {
    const res = await request(app)
      .put(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ ...validPayload, email: "hacked@example.com", id: "hacked-id" });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("alice@example.com");
    expect(res.body.user.id).toBe(EXISTING_USER_ID);
  });

  it("returns 422 when firstName is missing", async () => {
    const res = await request(app)
      .put(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ lastName: "Smith" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("First name")])
    );
  });

  it("returns 422 when lastName is missing", async () => {
    const res = await request(app)
      .put(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ firstName: "Alice" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("Last name")])
    );
  });

  it("returns 422 when firstName exceeds 50 characters", async () => {
    const res = await request(app)
      .put(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ firstName: "A".repeat(51), lastName: "Smith" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("First name")])
    );
  });

  it("returns 422 when bio exceeds 500 characters", async () => {
    const res = await request(app)
      .put(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ firstName: "Alice", lastName: "Smith", bio: "x".repeat(501) });
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("Bio")])
    );
  });

  it("returns 422 when website is not a valid URL", async () => {
    const res = await request(app)
      .put(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ firstName: "Alice", lastName: "Smith", website: "not-a-url" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("Website")])
    );
  });

  it("returns 422 when phone has invalid characters", async () => {
    const res = await request(app)
      .put(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ firstName: "Alice", lastName: "Smith", phone: "abc-xyz" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("Phone")])
    );
  });

  it("allows optional fields (bio, phone, website) to be empty strings", async () => {
    const res = await request(app)
      .put(`/api/users/${EXISTING_USER_ID}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ firstName: "Alice", lastName: "Smith", bio: "", phone: "", website: "" });
    expect(res.status).toBe(200);
  });

  it("returns 404 for a non-existent user", async () => {
    const token = makeToken({ id: "ghost-user", role: "student" });
    const res = await request(app)
      .put("/api/users/ghost-user")
      .set("Authorization", `Bearer ${token}`)
      .send(validPayload);
    expect(res.status).toBe(404);
  });
});
