import { afterEach, vi, beforeEach } from "vitest";

const w = window as Window & { GetParentResourceName?: () => string };

if (!w.GetParentResourceName) {
  w.GetParentResourceName = () => "trek-core";
}

(
  globalThis as typeof globalThis & { dispatchNUIEvent?: (data: unknown) => void }
).dispatchNUIEvent = (data: unknown) => {
  window.dispatchEvent(new MessageEvent("message", { data }));
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      statusText: "OK",
      json: async () => ({}),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});
