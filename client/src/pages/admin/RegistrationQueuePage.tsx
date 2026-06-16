import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/admin/shared/Toast';
import { useAdminApi } from '../../hooks/useAdminApi';
import { useStaffProfile } from '../../hooks/useStaffProfile';
import {
  REGISTRATION_STATUS_LABELS,
  SPORT_LABELS,
  type RegistrationStatus,
} from '../../constants/leagues';
import {
  approveQueueRegistration,
  listRegistrationQueue,
  promoteQueueRegistration,
  rejectQueueRegistration,
} from '../../services/leagues';
import type { RegistrationEmailNotification, RegistrationQueueEntry } from '../../types/leagues';
import { handleRegistrationEmailNotification } from '../../utils/registrationEmail';
import styles from './RegistrationQueuePage.module.css';

type QueueStatusFilter = 'all' | RegistrationStatus;

const QUEUE_STATUS_FILTERS: RegistrationStatus[] = [
  'pending_approval',
  'waitlisted',
  'pending_payment',
];

function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function entrantLabel(entry: RegistrationQueueEntry): string {
  if (entry.entrantType === 'player') {
    return entry.submittedByPlayerName ?? 'Player entry';
  }

  return entry.teamName ?? '—';
}

function statusBadgeClass(status: RegistrationStatus): string {
  switch (status) {
    case 'pending_approval':
      return styles.statusPendingApproval;
    case 'pending_payment':
      return styles.statusPendingPayment;
    case 'waitlisted':
      return styles.statusWaitlisted;
    default:
      return '';
  }
}

function canApprove(entry: RegistrationQueueEntry): boolean {
  return ['pending_approval', 'pending_payment', 'waitlisted'].includes(entry.status);
}

function canReject(entry: RegistrationQueueEntry): boolean {
  return canApprove(entry);
}

function canPromote(entry: RegistrationQueueEntry): boolean {
  return entry.status === 'waitlisted';
}

function RegistrationQueuePage() {
  const { adminFetchEnvelope, adminFetchList } = useAdminApi();
  const { toast } = useToast();
  const { canWriteLeagues } = useStaffProfile();
  const [entries, setEntries] = useState<RegistrationQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actingId, setActingId] = useState<string | null>(null);
  const [bulkActing, setBulkActing] = useState(false);
  const [lastNotification, setLastNotification] = useState<RegistrationEmailNotification | null>(
    null
  );

  const loadQueue = useCallback(async () => {
    setLoading(true);

    try {
      const data = await listRegistrationQueue(
        adminFetchList,
        statusFilter === 'all' ? undefined : statusFilter
      );
      setEntries(data);
      setSelectedIds(new Set());
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not load registration queue', 'error');
    } finally {
      setLoading(false);
    }
  }, [adminFetchList, statusFilter, toast]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const selectableIds = useMemo(
    () => entries.filter((entry) => canApprove(entry) || canReject(entry)).map((entry) => entry._id),
    [entries]
  );

  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(selectableIds));
  };

  const toggleSelected = (registrationId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(registrationId)) {
        next.delete(registrationId);
      } else {
        next.add(registrationId);
      }

      return next;
    });
  };

  const handleApprove = async (registrationId: string) => {
    setActingId(registrationId);

    try {
      const result = await approveQueueRegistration(adminFetchEnvelope, registrationId);
      setLastNotification(result.notification);
      await handleRegistrationEmailNotification(result.notification, toast, 'Registration approved');
      await loadQueue();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not approve registration', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (registrationId: string) => {
    const reason = window.prompt('Optional reason for rejection (shown to registrant):') ?? undefined;

    if (reason === null) {
      return;
    }

    setActingId(registrationId);

    try {
      const result = await rejectQueueRegistration(
        adminFetchEnvelope,
        registrationId,
        reason?.trim() || undefined
      );
      setLastNotification(result.notification);
      await handleRegistrationEmailNotification(result.notification, toast, 'Registration rejected');
      await loadQueue();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not reject registration', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handlePromote = async (registrationId: string) => {
    setActingId(registrationId);

    try {
      const result = await promoteQueueRegistration(adminFetchEnvelope, registrationId);
      setLastNotification(result.notification);
      await handleRegistrationEmailNotification(result.notification, toast, 'Registration promoted');
      await loadQueue();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not promote registration', 'error');
    } finally {
      setActingId(null);
    }
  };

  const runBulk = async (action: 'approve' | 'reject') => {
    const ids = [...selectedIds];

    if (ids.length === 0) {
      return;
    }

    if (action === 'reject') {
      const reason = window.prompt('Optional reason for bulk rejection:') ?? undefined;

      if (reason === null) {
        return;
      }

      setBulkActing(true);
      let successCount = 0;

      for (const registrationId of ids) {
        try {
          await rejectQueueRegistration(adminFetchEnvelope, registrationId, reason?.trim() || undefined);
          successCount += 1;
        } catch {
          // continue with remaining selections
        }
      }

      setBulkActing(false);
      toast(
        successCount === ids.length
          ? `Rejected ${successCount} registration${successCount === 1 ? '' : 's'}`
          : `Rejected ${successCount} of ${ids.length} — some failed`,
        successCount > 0 ? 'success' : 'error'
      );
      await loadQueue();
      return;
    }

    setBulkActing(true);
    let successCount = 0;

    for (const registrationId of ids) {
      try {
        await approveQueueRegistration(adminFetchEnvelope, registrationId);
        successCount += 1;
      } catch {
        // continue with remaining selections
      }
    }

    setBulkActing(false);
    toast(
      successCount === ids.length
        ? `Approved ${successCount} registration${successCount === 1 ? '' : 's'}`
        : `Approved ${successCount} of ${ids.length} — some failed (check capacity)`,
      successCount > 0 ? 'success' : 'error'
    );
    await loadQueue();
  };

  return (
    <div className={styles.registrationQueuePage}>
      <Link to="/admin/leagues" className={styles.backLink}>
        ← Leagues
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>Registration queue</h1>
        <p className={styles.intro}>
          Review team and player registrations across all leagues. Approve paid entries, clear
          waitlists, and reject entries that do not fit.
        </p>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <label className={styles.filterLabel}>
            Status
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as QueueStatusFilter)}
            >
              <option value="all">All queue statuses</option>
              {QUEUE_STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {REGISTRATION_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {canWriteLeagues ? (
          <div className={styles.bulkActions}>
            <button
              type="button"
              className="btn btn-green"
              disabled={selectedIds.size === 0 || bulkActing}
              onClick={() => void runBulk('approve')}
            >
              Approve selected
            </button>
            <button
              type="button"
              className={styles.rejectBtn}
              disabled={selectedIds.size === 0 || bulkActing}
              onClick={() => void runBulk('reject')}
            >
              Reject selected
            </button>
          </div>
        ) : null}
      </div>

      {selectedIds.size > 0 ? (
        <p className={styles.selectionNote}>{selectedIds.size} selected</p>
      ) : null}

      {loading ? (
        <p className={styles.loading}>Loading queue…</p>
      ) : entries.length === 0 ? (
        <p className={styles.empty}>No registrations need attention right now.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {canWriteLeagues ? (
                  <th className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      aria-label="Select all"
                      onChange={toggleSelectAll}
                    />
                  </th>
                ) : null}
                <th>Status</th>
                <th>League</th>
                <th>Entrant</th>
                <th>Division</th>
                <th>Submitted by</th>
                <th>Submitted</th>
                {canWriteLeagues ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const acting = actingId === entry._id || bulkActing;
                const selectable = canApprove(entry) || canReject(entry);

                return (
                  <tr key={entry._id}>
                    {canWriteLeagues ? (
                      <td className={styles.checkboxCell}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry._id)}
                          disabled={!selectable || acting}
                          aria-label={`Select ${entrantLabel(entry)}`}
                          onChange={() => toggleSelected(entry._id)}
                        />
                      </td>
                    ) : null}
                    <td>
                      <span className={`${styles.statusBadge} ${statusBadgeClass(entry.status)}`}>
                        {REGISTRATION_STATUS_LABELS[entry.status]}
                      </span>
                      {entry.amountDisplay ? (
                        <div className={styles.muted}>{entry.amountDisplay}</div>
                      ) : null}
                    </td>
                    <td>
                      <Link to={`/admin/leagues/${entry.leagueId}`} className={styles.leagueLink}>
                        {entry.leagueName}
                      </Link>
                      <div className={styles.muted}>{SPORT_LABELS[entry.leagueSport]}</div>
                    </td>
                    <td>{entrantLabel(entry)}</td>
                    <td>{entry.divisionName ?? '—'}</td>
                    <td>{entry.submittedByPlayerName ?? entry.submittedByPlayerId}</td>
                    <td>{formatSubmittedAt(entry.createdAt)}</td>
                    {canWriteLeagues ? (
                      <td>
                        <div className={styles.rowActions}>
                          {canApprove(entry) ? (
                            <button
                              type="button"
                              className="btn btn-green"
                              disabled={acting}
                              onClick={() => void handleApprove(entry._id)}
                            >
                              Approve
                            </button>
                          ) : null}
                          {canPromote(entry) ? (
                            <button
                              type="button"
                              className="btn btn-outline"
                              disabled={acting}
                              onClick={() => void handlePromote(entry._id)}
                            >
                              Promote
                            </button>
                          ) : null}
                          {canReject(entry) ? (
                            <button
                              type="button"
                              className={styles.rejectBtn}
                              disabled={acting}
                              onClick={() => void handleReject(entry._id)}
                            >
                              Reject
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {lastNotification ? (
        <details className={styles.emailPreview} open>
          <summary>
            {lastNotification.delivery === 'resend' && lastNotification.emailSent
              ? `Email sent — ${lastNotification.emailSubject}`
              : `Copy email — ${lastNotification.emailSubject}`}
          </summary>
          <p className={styles.muted}>To: {lastNotification.recipientEmail}</p>
          <pre className={styles.emailBody}>{lastNotification.emailBody}</pre>
        </details>
      ) : null}
    </div>
  );
}

export default RegistrationQueuePage;
