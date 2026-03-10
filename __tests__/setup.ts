// Mock Next.js server-only modules that are not available in Jest (Node.js) environment

// Mock next/headers (cookies() is async in Next.js 15)
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue(undefined),
  }),
}));

// Mock next/server (NextRequest / NextResponse stubs already provided by jest environment)
// Nothing extra needed for next/server in Node test environment with ts-jest.
