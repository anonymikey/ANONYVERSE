import { afterEach, describe, expect, it, vi } from "vitest";
import { FramexApiError, FramexAdapter } from "./framex";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("FramexAdapter", () => {
  it("normalizes canonical contentId and source from search results", async () => {
    vi.stubEnv("FRAMEX_API_KEY", "fxk_test_key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      results: [{ contentId: "movie-123", id: "legacy-9", source: "moviebox", title: "Example Film", poster: "https://cdn.example/poster.jpg", type: "movie" }],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const results = await new FramexAdapter().search({ providerKey: "framex", category: "movies_tv", enabled: true, approved: true }, "Example");

    expect(results[0]).toMatchObject({
      id: "moviebox:movie-123",
      title: "Example Film",
      details: { source: "moviebox", contentId: "movie-123", legacyId: "legacy-9" },
    });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { "X-API-Key": "fxk_test_key" },
    });
  });

  it("refuses playback unless the server-side feature and title allowlist are enabled", async () => {
    vi.stubEnv("FRAMEX_API_KEY", "fxk_test_key");
    vi.stubEnv("FRAMEX_PLAYBACK_ENABLED", "true");
    vi.stubEnv("FRAMEX_APPROVED_CONTENT_IDS", "moviebox:movie-123");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: "https://signed.example/stream", expiresIn: 600, expiresAt: "2026-11-24T01:20:00Z" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const session = await new FramexAdapter().createPlaybackSession({ source: "moviebox", contentId: "movie-123" }, { resolution: "1080", season: 1, episode: 2 });

    expect(session).toEqual({
      url: "https://signed.example/stream",
      expiresIn: 600,
      expiresAt: "2026-11-24T01:20:00Z",
      source: "moviebox",
      contentId: "movie-123",
    });
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("subjectId=movie-123");
    expect(calledUrl).toContain("resolution=1080");
    expect(calledUrl).toContain("se=1");
    expect(calledUrl).toContain("ep=2");
  });

  it("returns a policy error for a title outside the approved allowlist", async () => {
    vi.stubEnv("FRAMEX_API_KEY", "fxk_test_key");
    vi.stubEnv("FRAMEX_PLAYBACK_ENABLED", "true");
    vi.stubEnv("FRAMEX_APPROVED_CONTENT_IDS", "moviebox:other-title");

    await expect(new FramexAdapter().createPlaybackSession({ source: "moviebox", contentId: "movie-123" })).rejects.toMatchObject({
      status: 403,
      operation: "playback policy",
    });
  });
});
