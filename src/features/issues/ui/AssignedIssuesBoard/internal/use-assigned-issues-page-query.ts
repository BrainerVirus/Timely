import { useEffect, useRef, useState } from "react";

import type { AssignedIssuesPage, AssignedIssuesQueryInput } from "@/shared/types/dashboard";

interface QueryErrorState {
  message: string;
  queryKey: string;
}

interface UseAssignedIssuesPageQueryOptions {
  loadPage: (input: AssignedIssuesQueryInput) => Promise<AssignedIssuesPage>;
  queryInput: AssignedIssuesQueryInput;
  queryKey: string;
  reloadToken: number;
}

export function useAssignedIssuesPageQuery({
  loadPage,
  queryInput,
  queryKey,
  reloadToken,
}: Readonly<UseAssignedIssuesPageQueryOptions>) {
  const [page, setPage] = useState<AssignedIssuesPage | null>(null);
  const [loadedQueryKey, setLoadedQueryKey] = useState<string | null>(null);
  const [loadedRequestId, setLoadedRequestId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<QueryErrorState | null>(null);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    let cancelled = false;
    setLoading(true);
    setErrorState(null);

    void loadPage(queryInput)
      .then((result) => {
        if (cancelled || requestId !== latestRequestIdRef.current) return;
        setPage(result);
        setLoadedQueryKey(queryKey);
        setLoadedRequestId(requestId);
      })
      .catch((caught) => {
        if (cancelled || requestId !== latestRequestIdRef.current) return;
        setPage(null);
        setLoadedQueryKey(null);
        setLoadedRequestId(null);
        setErrorState({
          message: caught instanceof Error ? caught.message : "Could not load assigned issues.",
          queryKey,
        });
      })
      .finally(() => {
        if (!cancelled && requestId === latestRequestIdRef.current) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadPage, queryInput, queryKey, reloadToken]);

  const pageMatchesActiveQuery =
    loadedQueryKey === queryKey && loadedRequestId === latestRequestIdRef.current;
  const visiblePage = pageMatchesActiveQuery ? page : null;
  const error = errorState?.queryKey === queryKey ? errorState.message : null;

  return {
    page,
    pageMatchesActiveQuery,
    visiblePage,
    error,
    loading: loading || (!pageMatchesActiveQuery && error === null),
  };
}
