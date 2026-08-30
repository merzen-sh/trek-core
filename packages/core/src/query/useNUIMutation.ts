import { useCallback, useEffect, useRef, useState } from "react";

interface NUIMutationOptions<TData, TBody, TError> {
  onSuccess?: (data: TData, variables: TBody) => void;
  onError?: (error: TError, variables: TBody) => void;
  onSettled?: (data: TData | null, error: TError | null, variables: TBody) => void;
}

interface NUIMutationCallOptions<TData, TBody, TError> extends NUIMutationOptions<
  TData,
  TBody,
  TError
> {}

const getResourceName = () =>
  typeof window !== "undefined" && typeof (window as any).GetParentResourceName === "function"
    ? (window as any).GetParentResourceName()
    : "nui-res-name";

/** Sends NUI mutations with last-call-wins state and safe unmount/reset handling. */
export const useNUIMutation = <TData = unknown, TBody = unknown, TError = Error>(
  endpoint: string,
  options?: NUIMutationOptions<TData, TBody, TError>,
) => {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<TError | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isIdle, setIsIdle] = useState(true);
  const optionsRef = useRef(options);
  const mounted = useRef(false);
  const operationId = useRef(0);
  const generation = useRef(0);
  const activeCount = useRef(0);
  const resourceName = useRef(getResourceName()).current;
  optionsRef.current = options;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const mutateAsync = useCallback(
    async (
      variables: TBody,
      callOptions?: NUIMutationCallOptions<TData, TBody, TError>,
    ): Promise<TData> => {
      const id = ++operationId.current;
      const operationGeneration = generation.current;
      activeCount.current += 1;
      if (mounted.current) {
        setIsPending(true);
        setIsIdle(false);
        setError(null);
      }

      try {
        const response = await fetch(`https://${resourceName}/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=UTF-8" },
          body: JSON.stringify(variables),
        });
        if (!response || typeof response.ok !== "boolean") {
          throw new Error(`NUI Error: Invalid response received from endpoint ${endpoint}`);
        }
        if (!response.ok) throw new Error(`NUI Error: ${response.statusText}`);
        const result = (await response.json()) as TData;

        if (
          mounted.current &&
          generation.current === operationGeneration &&
          id === operationId.current
        ) {
          setData(result);
        }
        const hookOptions = optionsRef.current;
        hookOptions?.onSuccess?.(result, variables);
        callOptions?.onSuccess?.(result, variables);
        hookOptions?.onSettled?.(result, null, variables);
        callOptions?.onSettled?.(result, null, variables);
        return result;
      } catch (caught) {
        const mutationError = (
          caught instanceof Error ? caught : new Error(String(caught))
        ) as TError;
        if (
          mounted.current &&
          generation.current === operationGeneration &&
          id === operationId.current
        ) {
          setError(mutationError);
        }
        const hookOptions = optionsRef.current;
        hookOptions?.onError?.(mutationError, variables);
        callOptions?.onError?.(mutationError, variables);
        hookOptions?.onSettled?.(null, mutationError, variables);
        callOptions?.onSettled?.(null, mutationError, variables);
        throw mutationError;
      } finally {
        if (generation.current === operationGeneration) {
          activeCount.current -= 1;
          if (mounted.current && activeCount.current === 0) setIsPending(false);
        }
      }
    },
    [endpoint, resourceName],
  );

  const mutate = useCallback(
    (variables: TBody, callOptions?: NUIMutationCallOptions<TData, TBody, TError>) => {
      void mutateAsync(variables, callOptions).catch(() => {});
    },
    [mutateAsync],
  );

  const reset = useCallback(() => {
    generation.current += 1;
    operationId.current += 1;
    activeCount.current = 0;
    if (mounted.current) {
      setData(null);
      setError(null);
      setIsPending(false);
      setIsIdle(true);
    }
  }, []);

  return {
    data,
    error,
    isPending,
    isIdle,
    isSuccess: data !== null && !isPending,
    isError: error !== null,
    mutate,
    mutateAsync,
    reset,
  };
};
