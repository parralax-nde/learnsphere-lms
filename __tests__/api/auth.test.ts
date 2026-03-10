import { signToken, verifyToken } from "@/lib/auth";

describe("auth – JWT", () => {
  const payload = { userId: "user_demo_001", email: "demo@learnsphere.dev" };

  it("signs and verifies a valid token", () => {
    const token = signToken(payload);
    expect(typeof token).toBe("string");
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(payload.userId);
    expect(decoded!.email).toBe(payload.email);
  });

  it("returns null for an invalid token", () => {
    expect(verifyToken("not.a.real.token")).toBeNull();
  });

  it("returns null for a tampered token", () => {
    const token = signToken(payload);
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(verifyToken(tampered)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(verifyToken("")).toBeNull();
  });
});
