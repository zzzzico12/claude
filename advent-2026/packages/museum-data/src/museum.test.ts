import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchImage, getAicArtwork } from "./index.js";

afterEach(() => vi.unstubAllGlobals());

describe("シカゴ美術館", () => {
  it("API の形を Artwork にそろえ、アプリ名を名乗って取得する", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            id: 20684, title: "Paris Street; Rainy Day", artist_title: "Gustave Caillebotte", artist_display: "", date_display: "1877",
            date_start: 1877, medium_display: "Oil on canvas", dimensions_detail: [{ width_cm: 276.2, height_cm: 212.2 }],
            image_id: "abc", is_public_domain: true, credit_line: "Charles H. and Mary F. S. Worcester Collection",
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const a = await getAicArtwork(20684);
    expect(a).toMatchObject({ source: "aic", id: "20684", year: 1877, dimensionsCm: { width: 276.2, height: 212.2 }, isPublicDomain: true });
    expect(a.imageUrl!(400)).toBe("https://www.artic.edu/iiif/2/abc/full/400,/0/default.jpg");
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)["AIC-User-Agent"]).toMatch(/advent-2026/);
  });
  it("画像でない応答（ボット確認のページなど）はエラーにする", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>Just a moment...</html>", { headers: { "content-type": "text/html" } })));
    await expect(fetchImage("https://example.com/x.jpg")).rejects.toThrow(/画像を取得できません/);
  });
});
