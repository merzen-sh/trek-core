import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NUIQueryClient, NUIQueryProvider } from "../../context/NUIQueryContext";
import { useNUIEvent, useNUIQuery } from "../useNUIQuery";
import { useNUI } from "../useNUI";

const response = (body: unknown, ok = true) => ({
  ok,
  statusText: ok ? "OK" : "Failed",
  json: async () => body,
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const wrapperFor =
  (client: NUIQueryClient) =>
  ({ children }: { children: React.ReactNode }) => (
    <NUIQueryProvider client={client}>{children}</NUIQueryProvider>
  );

describe("useNUIQuery", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("posts the configured body and exposes the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ id: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useNUIQuery("player", { body: { id: 1 } }));

    await waitFor(() => expect(result.current.data).toEqual({ id: 1 }));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://trek-core/player",
      expect.objectContaining({ body: '{"id":1}' }),
    );
  });

  it("refetches when endpoint, query key, or body changes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ endpoint: "one" }))
      .mockResolvedValueOnce(response({ endpoint: "two" }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new NUIQueryClient();
    const { result, rerender } = renderHook(
      ({ endpoint, key, body }) => useNUIQuery(endpoint, { queryKey: key, body }),
      {
        initialProps: { endpoint: "one", key: "one", body: { n: 1 } },
        wrapper: wrapperFor(client),
      },
    );
    await waitFor(() => expect(result.current.data).toEqual({ endpoint: "one" }));
    rerender({ endpoint: "two", key: "two", body: { n: 2 } });
    await waitFor(() => expect(result.current.data).toEqual({ endpoint: "two" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe("https://trek-core/two");
    expect(client.getQueryData("one")).toEqual({ endpoint: "one" });
    expect(client.getQueryData("two")).toEqual({ endpoint: "two" });
  });

  it("fetches when enabled changes to true and uses a fresh cache before fetching", async () => {
    const client = new NUIQueryClient();
    client.setQueryData("cached", { source: "cache" });
    const fetchMock = vi.fn().mockResolvedValue(response({ source: "network" }));
    vi.stubGlobal("fetch", fetchMock);
    const { result, rerender } = renderHook(
      ({ enabled, key }) => useNUIQuery("endpoint", { enabled, queryKey: key, staleTime: 1000 }),
      { initialProps: { enabled: false, key: "cached" }, wrapper: wrapperFor(client) },
    );
    expect(result.current.data).toEqual({ source: "cache" });
    rerender({ enabled: true, key: "new" });
    await waitFor(() => expect(result.current.data).toEqual({ source: "network" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats cache data as stale exactly at staleTime", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-01-01T00:00:00.000Z"));
    const client = new NUIQueryClient();
    client.setQueryData("key", { source: "cache" });
    vi.setSystemTime(new Date("2020-01-01T00:00:00.100Z"));
    const fetchMock = vi.fn().mockResolvedValue(response({ source: "network" }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(
      () => useNUIQuery("endpoint", { queryKey: "key", staleTime: 100 }),
      { wrapper: wrapperFor(client) },
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ source: "network" });
    vi.useRealTimers();
  });

  it("deduplicates simultaneous invalidations and ignores an older response", async () => {
    const first = deferred<ReturnType<typeof response>>();
    const second = deferred<ReturnType<typeof response>>();
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    vi.stubGlobal("fetch", fetchMock);
    const client = new NUIQueryClient();
    const { result } = renderHook(
      () => useNUIQuery("endpoint", { enabled: false, queryKey: "key" }),
      { wrapper: wrapperFor(client) },
    );

    act(() => {
      client.invalidateQueries("key");
      client.invalidateQueries("key");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    first.resolve(response({ value: "first" }));
    await waitFor(() => expect(result.current.data).toEqual({ value: "first" }));
    let refetch!: Promise<unknown>;
    act(() => {
      refetch = result.current.refetch();
    });
    second.resolve(response({ value: "second" }));
    await act(async () => {
      await refetch;
    });
    await waitFor(() => expect(result.current.data).toEqual({ value: "second" }));
  });

  it("does not update state after unmount and removes invalidation subscriptions", async () => {
    const pending = deferred<ReturnType<typeof response>>();
    const fetchMock = vi.fn().mockReturnValue(pending.promise);
    vi.stubGlobal("fetch", fetchMock);
    const client = new NUIQueryClient();
    const { result, unmount } = renderHook(() => useNUIQuery("endpoint", { queryKey: "key" }), {
      wrapper: wrapperFor(client),
    });
    unmount();
    pending.resolve(response({ late: true }));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => client.invalidateQueries("key"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBeNull();
  });

  it("handles NUI events and keeps the event handler callback current", () => {
    const handler = vi.fn();
    const { result } = renderHook(() => useNUIQuery("push", { enabled: false }));
    const eventHook = renderHook(({ callback }) => useNUIEvent("event", callback), {
      initialProps: { callback: handler },
    });
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", { data: { type: "push", data: { pushed: true } } }),
      );
      window.dispatchEvent(new MessageEvent("message", { data: { action: "event", data: 2 } }));
    });
    expect(result.current.data).toEqual({ pushed: true });
    expect(handler).toHaveBeenCalledWith(2);
    eventHook.unmount();
  });

  it("preserves the useNUI alias and surfaces failed manual refetches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, false)));
    const { result } = renderHook(() => useNUI("failure", { enabled: false }));
    await act(async () => {
      await expect(result.current.refetch()).rejects.toThrow("NUI Error: Failed");
    });
    expect(result.current.error?.message).toBe("NUI Error: Failed");
  });
});
