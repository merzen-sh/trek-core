import { describe, expect, it, vi } from "vitest";
import { NUIQueryClient } from "../NUIQueryContext";

describe("NUIQueryClient", () => {
  it("stores timestamped data and notifies only matching subscribers", () => {
    const client = new NUIQueryClient();
    const players = vi.fn();
    const vehicles = vi.fn();
    client.setQueryData("players", [1]);
    const timestamp = client.getQueryTimestamp("players");
    client.subscribe("players", players);
    client.subscribe("vehicles", vehicles);
    client.invalidateQueries("players");

    expect(client.getQueryData<number[]>("players")).toEqual([1]);
    expect(timestamp).toBeTypeOf("number");
    expect(players).toHaveBeenCalledOnce();
    expect(vehicles).not.toHaveBeenCalled();
  });

  it("cleans subscriptions and shares a pending keyed request", async () => {
    const client = new NUIQueryClient();
    const callback = vi.fn();
    const unsubscribe = client.subscribe("key", callback);
    const fetcher = vi.fn(async () => "value");
    const one = client.fetchQuery("key", fetcher);
    const two = client.fetchQuery("key", fetcher);
    expect(one).toBe(two);
    await expect(one).resolves.toBe("value");
    expect(fetcher).toHaveBeenCalledOnce();

    unsubscribe();
    client.invalidateQueries("key");
    expect(callback).not.toHaveBeenCalled();
    client.clear();
    expect(client.getQueryData("key")).toBeUndefined();
  });
});
