import type {
  ContentProviderAdapter,
  NormalizedProviderItem,
  ProviderConfig,
} from "./index";

const DEFAULT_BASE_URL = "https://framex.wolvarex.com/api";
const DEFAULT_TIMEOUT_MS = 10_000;

type FramexResponse = Record<string, unknown>;

type FramexResult = {
  contentId?: unknown;
  id?: unknown;
  source?: unknown;
  title?: unknown;
  name?: unknown;
  poster?: unknown;
  backdrop?: unknown;
  overview?: unknown;
  description?: unknown;
  year?: unknown;
  releaseYear?: unknown;
  rating?: unknown;
  type?: unknown;
  genres?: unknown;
};

export type FramexContentRef = {
  source: string;
  contentId: string;
  legacyId?: string;
};

export type FramexPlaybackOptions = {
  resolution?: "720" | "1080";
  language?: string;
  season?: number;
  episode?: number;
  download?: boolean;
};

export type FramexPlaybackSession = {
  url: string;
  expiresAt?: string;
  expiresIn?: number;
  source: string;
  contentId: string;
};

export class FramexApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly operation: string,
  ) {
    super(message);
    this.name = "FramexApiError";
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function resultList(payload: FramexResponse): FramexResult[] {
  const results = payload.results;
  return Array.isArray(results) ? (results as FramexResult[]) : [];
}

function requireApiKey(): string {
  const apiKey = process.env.FRAMEX_API_KEY?.trim();
  if (!apiKey) throw new Error("FRAMEX_API_KEY is not configured");
  return apiKey;
}

function baseUrl(): string {
  return (process.env.FRAMEX_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function timeoutMs(): number {
  const parsed = Number(process.env.FRAMEX_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed >= 1_000 ? parsed : DEFAULT_TIMEOUT_MS;
}

async function request<T extends FramexResponse>(
  path: string,
  params: URLSearchParams | undefined,
  operation: string,
): Promise<T> {
  const url = new URL(`${baseUrl()}${path}`);
  if (params) url.search = params.toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-Key": requireApiKey(),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new FramexApiError(
        `Framex ${operation} failed with HTTP ${response.status}`,
        response.status,
        operation,
      );
    }

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") {
      throw new FramexApiError(`Framex ${operation} returned an invalid response`, response.status, operation);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof FramexApiError) throw error;
    const message = error instanceof Error ? error.message : "Unknown provider error";
    throw new FramexApiError(`Framex ${operation} request failed: ${message}`, 502, operation);
  } finally {
    clearTimeout(timer);
  }
}

function normalizeResult(result: FramexResult): NormalizedProviderItem | null {
  const contentId = stringValue(result.contentId) || stringValue(result.id);
  const title = stringValue(result.title) || stringValue(result.name);
  if (!contentId || !title) return null;

  const kind = stringValue(result.type) === "series" ? "series" : "movie";
  const source = stringValue(result.source) || "moviebox";
  const artworkUrl = stringValue(result.poster);
  const details: Record<string, unknown> = {
    source,
    contentId,
    legacyId: stringValue(result.id),
    backdrop: stringValue(result.backdrop),
    genres: Array.isArray(result.genres) ? result.genres : [],
  };

  return {
    id: `${source}:${contentId}`,
    kind,
    title,
    artworkUrl,
    description: stringValue(result.overview) || stringValue(result.description),
    year: stringValue(result.year) || stringValue(result.releaseYear),
    rating: stringValue(result.rating),
    sourceType: "provider",
    details,
  };
}

function approvedRefs(): Set<string> {
  return new Set(
    (process.env.FRAMEX_APPROVED_CONTENT_IDS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function framexPlaybackEnabled(ref: FramexContentRef): boolean {
  if (process.env.FRAMEX_PLAYBACK_ENABLED !== "true") return false;
  const refs = approvedRefs();
  return refs.has(`${ref.source}:${ref.contentId}`) || refs.has(ref.contentId);
}

export class FramexAdapter implements ContentProviderAdapter {
  readonly key = "framex";
  readonly category = "movies_tv" as const;

  async healthCheck(_config: ProviderConfig) {
    try {
      await request<{ ok?: unknown }>("/healthz", undefined, "health check");
      return { ok: true, message: "Framex API is reachable" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Framex health check failed",
      };
    }
  }

  async search(_config: ProviderConfig, query: string) {
    const payload = await request<FramexResponse>(
      "/v1/search",
      new URLSearchParams({ q: query, page: "1" }),
      "search",
    );
    return resultList(payload).map(normalizeResult).filter((item): item is NormalizedProviderItem => Boolean(item));
  }

  async getDetails(_config: ProviderConfig, id: string) {
    const payload = await request<FramexResponse>(
      `/v1/movies/${encodeURIComponent(id)}`,
      undefined,
      "details",
    );
    const candidate = payload.result && typeof payload.result === "object" ? payload.result : payload;
    return normalizeResult(candidate as FramexResult);
  }

  async createPlaybackSession(
    ref: FramexContentRef,
    options: FramexPlaybackOptions = {},
  ): Promise<FramexPlaybackSession> {
    if (!framexPlaybackEnabled(ref)) {
      throw new FramexApiError("Framex playback is not enabled for this title", 403, "playback policy");
    }

    const params = new URLSearchParams({ subjectId: ref.contentId });
    if (options.resolution) params.set("resolution", options.resolution);
    if (options.language) params.set("lang", options.language);
    if (options.season !== undefined) params.set("se", String(options.season));
    if (options.episode !== undefined) params.set("ep", String(options.episode));
    if (options.download) params.set("download", "1");

    const payload = await request<FramexResponse>("/v1/stream-url", params, "playback");
    const url = stringValue(payload.url);
    if (!url) throw new FramexApiError("Framex playback response did not include a URL", 502, "playback");

    const expiresIn = typeof payload.expiresIn === "number" ? payload.expiresIn : undefined;
    return {
      url,
      expiresAt: stringValue(payload.expiresAt),
      expiresIn,
      source: ref.source,
      contentId: ref.contentId,
    };
  }
}

export const framexAdapter = new FramexAdapter();
