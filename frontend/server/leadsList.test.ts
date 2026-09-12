import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { leadKeys } from "@/api/hooks/useLeads";

const BASE = "http://backend.test";

type ListLeadsFn = (params?: { search?: string; page?: number; limit?: number }) => Promise<unknown>;

function jsonResponse(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  };
}

describe("leads list query/invalidation behavior", () => {
  let listLeads: ListLeadsFn;
  let capturedUrl = "";
  const realFetch = (globalThis as any).fetch;

  beforeEach(async () => {
    capturedUrl = "";
    // listLeads reads VITE_API_BASE_URL via frontendEnv at import time.
    vi.resetModules();
    vi.stubEnv("VITE_API_BASE_URL", BASE);
    ({ listLeads } = await import("@/api/services/leads"));
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return jsonResponse(200, {
        success: true,
        data: { leads: [], total: 0, page: 1, limit: 20 },
      });
    });
  });

  afterEach(() => {
    (globalThis as any).fetch = realFetch;
    vi.unstubAllEnvs();
  });

  it("maps search/page/limit to backend query params and unwraps the paginated payload", async () => {
    const result = await listLeads({ search: "arjun", page: 3, limit: 5 });
    expect(capturedUrl).toBe(`${BASE}/api/v1/leads?search=arjun&page=3&limit=5`);
    expect(result).toEqual({ leads: [], total: 0, page: 1, limit: 20 });
  });

  it("omits unset params so backend defaults apply", async () => {
    await listLeads({});
    expect(capturedUrl).toBe(`${BASE}/api/v1/leads`);
  });

  it("nests list keys under leadKeys.all so create-success invalidation refetches lists", () => {
    const key = leadKeys.list({ search: "arjun", page: 1, limit: 20 });
    // useCreateLeadMutation invalidates leadKeys.all on success; every list
    // key must start with it for the new lead to appear in /leads.
    expect(key.slice(0, leadKeys.all.length)).toEqual([...leadKeys.all]);
    expect(leadKeys.detail("lead-1").slice(0, leadKeys.all.length)).toEqual([...leadKeys.all]);
  });
});
