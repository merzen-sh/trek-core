# @trekscripts/core — Core

React query for FiveM NUI (Native UI) communication. Drop these into any React-based NUI resource to send requests and listen for game events.

## Install

```bash
pnpm add @trekscripts/core
```

Peer dependencies: `react` >= 18.

## query

### `useNUIQuery`

Sends HTTP requests to your FiveM resource and manages the response in state. Generic over the response and body types for full type safety.

```tsx
import { useNUIQuery } from "@trekscripts/core/query";

interface Player {
  id: number;
  name: string;
}

function PlayerList() {
  const { data, loading, error, refetch } = useNUIQuery<{ players: Player[] }>("getPlayers");

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {data?.players.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

#### Signature

```ts
useNUIQuery<TData = unknown, TBody = unknown>(
  endpoint: string,
  options?: NUIQueryOptions<TBody>,
): NUIQueryResult<TData>
```

#### Options

| Property  | Type      | Default | Description                                                                                          |
| --------- | --------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `body`    | `TBody`   | `{}`    | JSON body sent with the POST request.                                                                |
| `enabled` | `boolean` | `true`  | When `false`, the query is disabled and will not fetch on mount. Setting to `true` triggers a fetch. |

#### Return value

| Property  | Type                        | Description                                                                 |
| --------- | --------------------------- | --------------------------------------------------------------------------- |
| `data`    | `TData \| null`             | Response body, or `null` if not yet fetched.                                |
| `loading` | `boolean`                   | `true` while the request is in flight.                                      |
| `error`   | `Error \| null`             | Non-null when the request fails.                                            |
| `refetch` | `(opts?) => Promise<TData>` | Re-run the request. Pass an options override or omit to reuse the last one. |
| `query`   | `(opts?) => Promise<TData>` | Alias for `refetch`.                                                        |

#### Enabled vs disabled

```ts
// Enabled (default) — fetches automatically on mount.
const { data } = useNUIQuery("getConfig");

// Disabled — only fetches when refetch/query is called or enabled becomes true.
const { refetch } = useNUIQuery("getConfig", { enabled: false });
```

#### Conditional fetching

```ts
// Fetch only when playerId is available
const { data } = useNUIQuery("getPlayer", {
  enabled: !!playerId,
  queryKey: `player-${playerId}`,
  staleTime: 5000,
});
```

#### Passing a typed body

```ts
const { data } = useNUIQuery<PlayerStats, { id: number }>("getPlayerStats", {
  enabled: true,
  body: { id: 1 },
});
```

#### Incoming NUI messages

`useNUIQuery` listens for `message` events where **either** the `type` or `action` field matches the endpoint name. This covers the two common FiveM conventions:

```ts
// Either of these will update `data`:
SendNUIMessage({ type: "playerData", data: { id: 1 } });
SendNUIMessage({ action: "playerData", data: { id: 1 } });

const { data } = useNUIQuery("playerData");
// data → { id: 1 }
```

Non-object payloads (strings, numbers, `null`) are safely ignored without throwing.

#### Backward compatibility

`useNUI` is exported as an alias for `useNUIQuery`. Existing code using `useNUI` continues to work without changes.

```ts
import { useNUI } from "@trekscripts/core/query";
// useNUI is identical to useNUIQuery
```

### `useNUIMutation`

Mutation hook for sending write operations to NUI. Follows TanStack Query patterns with `mutate` (fire-and-forget) and `mutateAsync` (returns Promise). Supports lifecycle callbacks and type-safe generics.

```tsx
import { useNUIMutation } from "@trekscripts/core/query";

function CreatePlayer() {
  const { mutate, mutateAsync, isPending, isSuccess, error, reset } = useNUIMutation<
    Player,
    { name: string }
  >("createPlayer", {
    onSuccess: (data) => console.log("Created:", data.id),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutate({ name: "Trek" });
      }}
    >
      <button disabled={isPending}>{isPending ? "Creating..." : "Create Player"}</button>
      {isSuccess && <p>Player created.</p>}
      {error && <p>Error: {error.message}</p>}
      <button type="button" onClick={reset}>
        Reset
      </button>
    </form>
  );
}
```

#### Signature

```ts
useNUIMutation<TData, TBody, TError = Error>(
  endpoint: string,
  options?: NUIMutationOptions<TData, TBody, TError>,
): NUIMutationResult<TData, TBody, TError>
```

#### Options

| Property    | Type                                                                     | Description                         |
| ----------- | ------------------------------------------------------------------------ | ----------------------------------- |
| `onSuccess` | `(data: TData, variables: TBody) => void`                                | Called after a successful mutation. |
| `onError`   | `(error: TError, variables: TBody) => void`                              | Called when the mutation fails.     |
| `onSettled` | `(data: TData \| null, error: TError \| null, variables: TBody) => void` | Called after success or failure.    |

These callbacks are also available per-call on `mutate` and `mutateAsync`.

#### Return value

| Property      | Type                                          | Description                                           |
| ------------- | --------------------------------------------- | ----------------------------------------------------- |
| `data`        | `TData \| null`                               | Result of the last successful mutation.               |
| `error`       | `TError \| null`                              | Error from the last failed mutation.                  |
| `isPending`   | `boolean`                                     | `true` while a mutation is in flight.                 |
| `isIdle`      | `boolean`                                     | `true` before any mutation has been executed.         |
| `isSuccess`   | `boolean`                                     | `true` after a successful mutation.                   |
| `isError`     | `boolean`                                     | `true` after a failed mutation.                       |
| `mutate`      | `(variables, callOptions?) => void`           | Fire-and-forget. Catches internally, does not throw.  |
| `mutateAsync` | `(variables, callOptions?) => Promise<TData>` | Returns a Promise. Throws on failure.                 |
| `reset`       | `() => void`                                  | Restores `data`, `error` to `null` and state to idle. |

#### mutate vs mutateAsync

```ts
// mutate — fire-and-forget, errors are caught internally
mutate(
  { name: "Trek" },
  {
    onSuccess: (data) => console.log(data),
    onError: (err) => console.error(err),
  },
);

// mutateAsync — returns Promise, caller handles rejection
try {
  const result = await mutateAsync({ name: "Trek" });
} catch (err) {
  // handle error
}
```

#### Lifecycle callbacks

Callbacks fire in order: `onSuccess`/`onError` first, then `onSettled`. Hook-level options are called first, followed by per-call options.

```ts
const { mutate } = useNUIMutation("endpoint", {
  onSuccess: (data, vars) => {
    // fires after every successful mutation
  },
  onSettled: (data, error, vars) => {
    // fires after both success and failure
  },
});

mutate(payload, {
  onSuccess: (data, vars) => {
    // fires only for this specific call
  },
});
```

### `useNUIEvent`

Listens for NUI `message` events dispatched from the game. Only the handler matching the given `action` string runs.

```tsx
import { useNUIEvent } from "@trekscripts/core/query";

function HealthBar() {
  useNUIEvent<{ health: number }>("updateHealth", (data) => {
    setHealth(data.health);
  });

  return <div>{health}%</div>;
}
```

#### Signature

```ts
useNUIEvent<T = any>(action: string, handler: (data: T) => void): void
```

| Parameter | Description                                                                                 |
| --------- | ------------------------------------------------------------------------------------------- |
| `action`  | The `action` field to match on incoming `message` events.                                   |
| `handler` | Callback receiving the `data` payload. Always the latest version (no stale closure issues). |

Non-object payloads are safely ignored without throwing.

#### Event shape expected from FiveM

```json
{
  "action": "updateHealth",
  "data": { "health": 75 }
}
```

## FiveM integration

`useNUIQuery` and `useNUIMutation` resolve the resource name via `GetParentResourceName()` automatically. In a real FiveM NUI context this returns the correct name; in tests or standalone React apps it falls back to `"nui-res-name"`.

The fetch URL follows the standard pattern:

```
https://{resourceName}/{endpoint}
```

## Running tests

```bash
pnpm test
```

Uses Vitest with jsdom. The test setup stubs `window.GetParentResourceName` and exposes a `dispatchNUIEvent` helper for simulating game events.
