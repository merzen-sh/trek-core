import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNUIMutation } from "../useNUIMutation";

const response = (body: unknown, ok = true) => ({
  ok,
  statusText: ok ? "OK" : "Conflict",
  json: async () => body,
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("useNUIMutation", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("posts variables, tracks status, and calls hook and call callbacks", async () => {
    const onSuccess = vi.fn();
    const onSettled = vi.fn();
    const callSuccess = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(response({ id: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useNUIMutation("create", { onSuccess, onSettled }));

    await act(async () => {
      await result.current.mutateAsync({ name: "Ada" }, { onSuccess: callSuccess });
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://trek-core/create",
      expect.objectContaining({ body: '{"name":"Ada"}' }),
    );
    expect(result.current).toMatchObject({
      data: { id: 1 },
      isPending: false,
      isIdle: false,
      isSuccess: true,
    });
    expect(onSuccess).toHaveBeenCalledWith({ id: 1 }, { name: "Ada" });
    expect(callSuccess).toHaveBeenCalledWith({ id: 1 }, { name: "Ada" });
    expect(onSettled).toHaveBeenCalledWith({ id: 1 }, null, { name: "Ada" });
  });

  it("reports failures through state/callbacks while fire-and-forget mutate absorbs rejection", async () => {
    const onError = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, false)));
    const { result } = renderHook(() => useNUIMutation("fail", { onError }));
    await act(async () => {
      await expect(result.current.mutateAsync({})).rejects.toThrow("NUI Error: Conflict");
    });
    expect(result.current.isError).toBe(true);
    expect(onError).toHaveBeenCalled();
    act(() => result.current.mutate({}));
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it("uses last-call-wins state while keeping pending true until concurrent work settles", async () => {
    const first = deferred<ReturnType<typeof response>>();
    const second = deferred<ReturnType<typeof response>>();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise),
    );
    const { result } = renderHook(() => useNUIMutation("save"));
    let firstCall!: Promise<unknown>;
    let secondCall!: Promise<unknown>;
    act(() => {
      firstCall = result.current.mutateAsync({ value: 1 });
      secondCall = result.current.mutateAsync({ value: 2 });
    });
    expect(result.current.isPending).toBe(true);
    second.resolve(response({ value: 2 }));
    await act(async () => {
      await secondCall;
    });
    expect(result.current.data).toEqual({ value: 2 });
    expect(result.current.isPending).toBe(true);
    first.resolve(response({ value: 1 }));
    await act(async () => {
      await firstCall;
    });
    expect(result.current).toMatchObject({ data: { value: 2 }, isPending: false });
  });

  it("reset prevents a pending operation from restoring obsolete state", async () => {
    const pending = deferred<ReturnType<typeof response>>();
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending.promise));
    const { result } = renderHook(() => useNUIMutation("reset"));
    let mutation!: Promise<unknown>;
    act(() => {
      mutation = result.current.mutateAsync({});
      result.current.reset();
    });
    pending.resolve(response({ stale: true }));
    await act(async () => {
      await mutation;
    });
    expect(result.current).toMatchObject({
      data: null,
      error: null,
      isPending: false,
      isIdle: true,
    });
  });

  it("does not commit an operation that completes after unmount", async () => {
    const pending = deferred<ReturnType<typeof response>>();
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending.promise));
    const { result, unmount } = renderHook(() => useNUIMutation("unmount"));
    let mutation!: Promise<unknown>;
    act(() => {
      mutation = result.current.mutateAsync({});
    });
    unmount();
    pending.resolve(response({ late: true }));
    await act(async () => {
      await mutation;
    });
    expect(result.current.data).toBeNull();
  });

  it("changes endpoint dynamically and validates malformed responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ endpoint: "one" }))
      .mockResolvedValueOnce({ statusText: "bad", json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { result, rerender } = renderHook(({ endpoint }) => useNUIMutation(endpoint), {
      initialProps: { endpoint: "one" },
    });
    await act(async () => {
      await result.current.mutateAsync({});
    });
    rerender({ endpoint: "two" });
    await act(async () => {
      await expect(result.current.mutateAsync({})).rejects.toThrow("Invalid response");
    });
    expect(fetchMock.mock.calls[1][0]).toBe("https://trek-core/two");
  });
});
