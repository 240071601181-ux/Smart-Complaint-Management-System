import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("MadVoice AI frontend contract", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

  it("contains the core operations routes and navigation labels", () => {
    expect(source).toContain("/dashboard");
    expect(source).toContain("/leads");
    expect(source).toContain("/calls");
    expect(source).toContain("/followups");
    expect(source).toContain("/ai-agent");
    expect(source).toContain("/knowledge");
  });

  it("contains the MadVoice AI brand and lead qualification signals", () => {
    expect(source).toContain("MadVoice AI");
    expect(source).toContain("HOT");
    expect(source).toContain("WARM");
    expect(source).toContain("COLD");
    expect(source).toContain("Qualification score");
  });

  it("keeps AeroShards selective and configured for the three intended surfaces", () => {
    expect(source).toContain('from "@/components/AeroShards"');
    expect(source).toContain('variant="dashboard"');
    expect(source).toContain('variant="agent"');
    expect(source).toContain('variant="auth"');
    expect(source).toContain('interaction="repel"');
  });
});
