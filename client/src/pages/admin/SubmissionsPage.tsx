import { useCallback, useEffect, useState } from 'react';
import { useAdminApi } from '../../hooks/useAdminApi';
import { useSubmissions } from '../../hooks/useSubmissions';
import { useToast } from '../../components/admin/shared/Toast';
import type { AdminSubmission, SubmissionStatus } from '../../types';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './SubmissionsPage.module.css';

const TABS: Array<{ status: SubmissionStatus; label: string; empty: string }> = [
  { status: 'pending', label: 'Pending', empty: 'Nothing pending. Nice.' },
  { status: 'approved', label: 'Approved', empty: 'No approved photos yet.' },
  { status: 'rejected', label: 'Rejected', empty: 'No rejected submissions.' },
];

function SubmissionsPage() {
  const { adminFetch, adminFetchList } = useAdminApi();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SubmissionStatus>('pending');
  const [counts, setCounts] = useState<Record<SubmissionStatus, number>>({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { submissions, loading, refetch } = useSubmissions(activeTab);

  const loadCounts = useCallback(async () => {
    try {
      const results = await Promise.all(
        TABS.map((tab) =>
          adminFetchList<AdminSubmission[]>(`/admin/submissions?status=${tab.status}`)
        )
      );

      setCounts({
        pending: results[0].count,
        approved: results[1].count,
        rejected: results[2].count,
      });
    } catch {
      /* keep existing counts */
    }
  }, [adminFetchList]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refetch(), loadCounts()]);
  }, [refetch, loadCounts]);

  const updateStatus = async (id: string, status: SubmissionStatus) => {
    setUpdatingId(id);

    try {
      await adminFetch<AdminSubmission>(`/admin/submissions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      const messages: Record<SubmissionStatus, string> = {
        approved: 'Photo approved — now live in the gallery',
        rejected: 'Photo rejected',
        pending: 'Moved back to pending',
      };

      toast(messages[status], 'success');
      await refreshAll();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update submission', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete the photo from ${name}?`)) return;

    setUpdatingId(id);

    try {
      await adminFetch(`/admin/submissions/${id}`, { method: 'DELETE' });
      toast('Submission deleted', 'success');
      await refreshAll();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not delete submission', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const activeEmpty = TABS.find((tab) => tab.status === activeTab)?.empty ?? '';
  const panelId = `submissions-panel-${activeTab}`;

  return (
    <div>
      <h1 className={formStyles.pageTitle}>Photo Submissions</h1>

      <div className={styles.tabs} role="tablist" aria-label="Submission status">
        {TABS.map((tab) => (
          <button
            key={tab.status}
            type="button"
            role="tab"
            id={`tab-${tab.status}`}
            aria-selected={activeTab === tab.status}
            aria-controls={panelId}
            className={activeTab === tab.status ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setActiveTab(tab.status)}
          >
            {tab.label}
            <span className={styles.tabCount}>{counts[tab.status]}</span>
            {tab.status === 'pending' && counts.pending > 0 ? (
              <span className={styles.pendingDot} aria-hidden="true" />
            ) : null}
          </button>
        ))}
      </div>

      <section
        className={`${formStyles.panel} ${styles.listPanel}`}
        role="tabpanel"
        id={panelId}
        aria-labelledby={`tab-${activeTab}`}
      >
        {loading ? (
          <ul className={styles.list} aria-busy="true">
            {[0, 1, 2].map((key) => (
              <li key={key} className={styles.item} aria-hidden="true">
                <div className={`${styles.thumb} ${styles.skeletonThumb} skeletonPulse`} />
                <div className={`${styles.skeletonBody} skeletonPulse`} />
              </li>
            ))}
          </ul>
        ) : submissions.length === 0 ? (
          <p className={styles.empty}>{activeEmpty}</p>
        ) : (
          <ul className={styles.list}>
            {submissions.map((submission) => (
              <li key={submission._id} className={styles.item}>
                <div className={styles.thumb}>
                  {submission.thumbnailUrl ? (
                    <img src={submission.thumbnailUrl} alt="" />
                  ) : (
                    <span className={styles.thumbPlaceholder}>No image</span>
                  )}
                </div>

                <div className={styles.details}>
                  <p className={styles.name}>{submission.submitterName}</p>
                  {submission.caption ? (
                    <p className={styles.caption}>{submission.caption}</p>
                  ) : (
                    <p className={styles.captionMuted}>No caption</p>
                  )}

                  <div className={styles.meta}>
                    {submission.consent ? (
                      <span className={styles.consent}>
                        <span className={styles.check} aria-hidden="true">
                          ✓
                        </span>
                        Rights confirmed
                      </span>
                    ) : (
                      <span className={styles.noConsent}>No consent on file</span>
                    )}
                    <span className={styles.when}>{submission.when}</span>
                  </div>
                </div>

                <div className={styles.actions}>
                  {activeTab === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className={styles.approveBtn}
                        disabled={updatingId === submission._id}
                        aria-label={`Approve photo from ${submission.submitterName}`}
                        onClick={() => updateStatus(submission._id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={styles.rejectBtn}
                        disabled={updatingId === submission._id}
                        aria-label={`Reject photo from ${submission.submitterName}`}
                        onClick={() => updateStatus(submission._id, 'rejected')}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`${styles.pill} ${styles[`pill_${activeTab}`]}`}>
                        {activeTab}
                      </span>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={updatingId === submission._id}
                        aria-label={`Move photo from ${submission.submitterName} back to pending`}
                        onClick={() => updateStatus(submission._id, 'pending')}
                      >
                        Move back to pending
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        disabled={updatingId === submission._id}
                        aria-label={`Delete photo from ${submission.submitterName}`}
                        onClick={() => handleDelete(submission._id, submission.submitterName)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default SubmissionsPage;
