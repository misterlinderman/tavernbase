import { useCallback, useEffect, useState } from 'react';
import { useAdminApi } from './useAdminApi';
import type { AdminSubmission, SubmissionStatus } from '../types';

export function useSubmissions(status: SubmissionStatus) {
  const { adminFetchList } = useAdminApi();
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  const refetch = useCallback(async () => {
    setLoading(true);

    try {
      const result = await adminFetchList<AdminSubmission[]>(
        `/admin/submissions?status=${status}`
      );
      setSubmissions(result.data);
      setCount(result.count);
    } catch {
      setSubmissions([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [adminFetchList, status]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { submissions, loading, count, refetch };
}
