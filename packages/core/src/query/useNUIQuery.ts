import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "../context/NUIQueryContext";

export interface NUIQueryOptions<TBody = unknown> {
  body?: TBody;
  enabled?: boolean;
  queryKey?: string;
  staleTime?: number;
}

const getResourceName = () =>
  typeof window !== "undefined" && typeof (window as any).GetParentResourceName === "function"
    ? (window as any).GetParentResourceName()
    : "nui-res-name";

/** Fetches NUI data while safely handling changing inputs and overlapping requests. */
export const useNUIQuery = <TData = unknown, TBody = unknown>(
  endpoint: string,
  options: NUIQueryOptions<TBody> = {},
) => {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();
  const resourceName = useRef(getResourceName()).current;
  const mounted = useRef(false);
  const requestId = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const sendNUI = useCallback(
    async (target: string, body: TBody | undefined): Promise<TData> => {
      const response = await fetch(`https://${resourceName}/${target}`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(body ?? ({} as TBody)),
      });
      if (!response || typeof response.ok !== "boolean") {
        throw new Error(`NUI Error: Invalid response received from endpoint ${target}`);
      }
      if (!response.ok) throw new Error(`NUI Error: ${response.statusText}`);
      return (await response.json()) as TData;
    },
    [resourceName],
  );

  const fetchData = useCallback(
    async (overrideOptions?: NUIQueryOptions<TBody>): Promise<TData> => {
      const requestOptions = overrideOptions ?? optionsRef.current;
      const key = requestOptions.queryKey;
      const id = ++requestId.current;
      if (mounted.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const fetcher = () => sendNUI(endpoint, requestOptions.body);
        const result =
          queryClient && key ? await queryClient.fetchQuery(key, fetcher) : await fetcher();

        if (mounted.current && id === requestId.current) setData(result);
        if (queryClient && key) queryClient.setQueryData(key, result);
        return result;
      } catch (caught) {
        const fetchError = caught instanceof Error ? caught : new Error(String(caught));
        if (mounted.current && id === requestId.current) setError(fetchError);
        throw fetchError;
      } finally {
        if (mounted.current && id === requestId.current) setLoading(false);
      }
    },
    [endpoint, queryClient, sendNUI],
  );

  const isEnabled = options.enabled !== false;
  const { queryKey, staleTime } = options;
  // Option objects are commonly created inline. Depend on the serialized body
  // value so a state update does not turn into an accidental refetch loop.
  const bodyKey = JSON.stringify(options.body ?? {});

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, []);

  // Re-evaluate cache and fetch whenever the query identity/options change.
  useEffect(() => {
    if (queryClient && queryKey && staleTime !== undefined) {
      const timestamp = queryClient.getQueryTimestamp(queryKey);
      const cached = queryClient.getQueryData<TData>(queryKey);
      if (timestamp !== undefined && cached !== undefined && Date.now() - timestamp < staleTime) {
        setData(cached);
        setLoading(false);
        setError(null);
        return;
      }
    }
    if (isEnabled) void fetchData().catch(() => {});
  }, [bodyKey, endpoint, fetchData, isEnabled, queryClient, queryKey, staleTime]);

  useEffect(() => {
    if (!queryClient || !queryKey) return;
    return queryClient.subscribe(queryKey, () => {
      void fetchData().catch(() => {});
    });
  }, [fetchData, queryClient, queryKey]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      const { type, action, data: eventData } = event.data;
      if (type !== endpoint && action !== endpoint) return;

      requestId.current += 1;
      if (mounted.current) setData(eventData as TData);
      const key = optionsRef.current.queryKey;
      if (queryClient && key) queryClient.setQueryData(key, eventData);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [endpoint, queryClient]);

  return { data, loading, error, refetch: fetchData, query: fetchData };
};

export const useNUIEvent = <T = unknown>(action: string, handler: (data: T) => void) => {
  const savedHandler = useRef(handler);
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.action === action) savedHandler.current(event.data.data as T);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [action]);
};
