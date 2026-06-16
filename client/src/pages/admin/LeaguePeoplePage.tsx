import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import LinkLoginModal, {
  type LinkLoginModalPlayer,
} from '../../components/admin/LinkLoginModal';
import { useToast } from '../../components/admin/shared/Toast';
import { useAdminApi } from '../../hooks/useAdminApi';
import { useStaffProfile } from '../../hooks/useStaffProfile';
import {
  SPORT_LABELS,
  SPORTS,
  type Sport,
} from '../../constants/leagues';
import { listPeopleDirectory, resendPlayerLoginInvite } from '../../services/leagues';
import type {
  PeopleDirectoryEntry,
  PeopleDirectoryMeta,
  PeopleLoginStatus,
  PeopleRole,
} from '../../types/leagues';
import styles from './LeaguePeoplePage.module.css';

const LOGIN_STATUS_LABELS: Record<PeopleLoginStatus, string> = {
  linked: 'Linked',
  invited: 'Invited',
  unlinked: 'Unlinked',
};

const ROLE_LABELS: Record<PeopleRole, string> = {
  captain: 'Captain',
  player: 'Player',
  none: '—',
};

function loginBadgeClass(status: PeopleLoginStatus): string {
  switch (status) {
    case 'linked':
      return styles.badgeLinked;
    case 'invited':
      return styles.badgeInvited;
    default:
      return styles.badgeUnlinked;
  }
}

function formatInviteDate(iso?: string): string {
  if (!iso) {
    return '—';
  }

  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function primaryLeagueId(entry: PeopleDirectoryEntry): string | null {
  return entry.teams[0]?.leagueId ?? null;
}

function LeaguePeoplePage() {
  const { adminFetch, adminFetchList } = useAdminApi();
  const { toast } = useToast();
  const { canWriteLeagues, role: staffRole } = useStaffProfile();
  const [linkModalPlayer, setLinkModalPlayer] = useState<LinkLoginModalPlayer | null>(null);
  const [linkModalRole, setLinkModalRole] = useState<'captain' | 'player'>('player');
  const [resendingPlayerId, setResendingPlayerId] = useState<string | null>(null);
  const [entries, setEntries] = useState<PeopleDirectoryEntry[]>([]);
  const [meta, setMeta] = useState<PeopleDirectoryMeta>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'captain' | 'player' | 'unlinked'>('all');
  const [loginStatusFilter, setLoginStatusFilter] = useState<'all' | PeopleLoginStatus>('all');
  const [sportFilter, setSportFilter] = useState<'all' | Sport>('all');
  const [page, setPage] = useState(1);

  const loadPeople = useCallback(async () => {
    setLoading(true);

    try {
      const result = await listPeopleDirectory(adminFetchList, {
        q: searchQuery || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        loginStatus: loginStatusFilter === 'all' ? undefined : loginStatusFilter,
        sport: sportFilter === 'all' ? undefined : sportFilter,
        page,
      });

      setEntries(result.entries);
      setMeta(result.meta);
    } catch {
      setEntries([]);
      setMeta({ page: 1, limit: 25, total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [adminFetchList, loginStatusFilter, page, roleFilter, searchQuery, sportFilter]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const handleResendInvite = async (entry: PeopleDirectoryEntry) => {
    const role = entry.role === 'captain' ? 'captain' : 'player';

    setResendingPlayerId(entry._id);

    try {
      const result = await resendPlayerLoginInvite(adminFetch, entry._id, { role });

      if (result.delivery === 'auth0_email' && result.auth0EmailSent) {
        toast(`Invite email resent to ${result.playerEmail} via Auth0`, 'success');
      } else {
        try {
          await navigator.clipboard.writeText(result.emailBody);
          toast(`Invite ready — email copied for ${result.playerEmail}`, 'success');
        } catch {
          toast(`Invite ready for ${result.playerEmail}`, 'success');
        }
      }

      await loadPeople();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not resend invite', 'error');
    } finally {
      setResendingPlayerId(null);
    }
  };

  return (
    <div className={styles.leaguePeoplePage}>
      <Link to="/admin/leagues" className={styles.backLink}>
        ← Leagues
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>People</h1>
        <p className={styles.intro}>
          Search players and captains across all leagues. Login status shows whether they can sign
          in at the captain or player portal.
        </p>
      </header>

      <form className={styles.filters} onSubmit={handleSearchSubmit}>
        <label className={styles.filterLabel}>
          Search
          <input
            type="search"
            className={styles.filterInput}
            placeholder="Name or email"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>

        <label className={styles.filterLabel}>
          Role
          <select
            className={styles.filterSelect}
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value as typeof roleFilter);
              setPage(1);
            }}
          >
            <option value="all">All roles</option>
            <option value="captain">Captains</option>
            <option value="player">Players</option>
            <option value="unlinked">Not linked</option>
          </select>
        </label>

        <label className={styles.filterLabel}>
          Login
          <select
            className={styles.filterSelect}
            value={loginStatusFilter}
            onChange={(event) => {
              setLoginStatusFilter(event.target.value as typeof loginStatusFilter);
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            <option value="linked">Linked</option>
            <option value="invited">Invited</option>
            <option value="unlinked">Unlinked</option>
          </select>
        </label>

        <label className={styles.filterLabel}>
          Sport
          <select
            className={styles.filterSelect}
            value={sportFilter}
            onChange={(event) => {
              setSportFilter(event.target.value as typeof sportFilter);
              setPage(1);
            }}
          >
            <option value="all">All sports</option>
            {SPORTS.map((sport) => (
              <option key={sport} value={sport}>
                {SPORT_LABELS[sport]}
              </option>
            ))}
          </select>
        </label>
      </form>

      {loading ? (
        <p className={styles.loading}>Loading people…</p>
      ) : entries.length === 0 ? (
        <p className={styles.empty}>No league participants match these filters.</p>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Teams</th>
                  <th>Login</th>
                  <th>Last invite</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const leagueId = primaryLeagueId(entry);

                  return (
                    <tr key={entry._id}>
                      <td>{entry.name}</td>
                      <td>{entry.email ?? '—'}</td>
                      <td>
                        <span
                          className={
                            entry.role === 'captain' ? styles.badgeCaptain : styles.badgePlayer
                          }
                        >
                          {ROLE_LABELS[entry.role]}
                        </span>
                      </td>
                      <td>
                        {entry.teams.length === 0 ? (
                          '—'
                        ) : (
                          <ul className={styles.teamList}>
                            {entry.teams.map((team) => (
                              <li key={`${team.leagueId}-${team.teamId}`} className={styles.teamItem}>
                                <strong>{team.teamName}</strong>
                                {' · '}
                                {SPORT_LABELS[team.sport]} — {team.leagueName}
                                {team.isCaptain ? ' (captain)' : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td>
                        <span className={loginBadgeClass(entry.loginStatus)}>
                          {LOGIN_STATUS_LABELS[entry.loginStatus]}
                        </span>
                      </td>
                      <td>{formatInviteDate(entry.lastInvitedAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          {leagueId ? (
                            <Link
                              to={`/admin/leagues/${leagueId}`}
                              className={styles.actionLink}
                            >
                              View league
                            </Link>
                          ) : (
                            <span className={styles.actionDisabled}>View league</span>
                          )}
                          {canWriteLeagues ? (
                            <button
                              type="button"
                              className={styles.actionLink}
                              onClick={() => {
                                setLinkModalRole(entry.role === 'captain' ? 'captain' : 'player');
                                setLinkModalPlayer({
                                  _id: entry._id,
                                  name: entry.name,
                                  email: entry.email,
                                  auth0Sub: entry.auth0Sub,
                                });
                              }}
                            >
                              {entry.loginStatus === 'linked' ? 'Manage login' : 'Link login'}
                            </button>
                          ) : (
                            <span className={styles.actionDisabled}>Link login</span>
                          )}
                          {canWriteLeagues && entry.loginStatus === 'invited' ? (
                            <button
                              type="button"
                              className={styles.actionLink}
                              disabled={resendingPlayerId === entry._id}
                              onClick={() => handleResendInvite(entry)}
                            >
                              {resendingPlayerId === entry._id ? 'Sending…' : 'Resend invite'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <span>
              {meta.total === 0
                ? 'No results'
                : `Showing ${(meta.page - 1) * meta.limit + 1}–${Math.min(meta.page * meta.limit, meta.total)} of ${meta.total}`}
            </span>
            <div className={styles.paginationButtons}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={meta.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <LinkLoginModal
        open={Boolean(linkModalPlayer)}
        player={linkModalPlayer}
        defaultRole={linkModalRole}
        canManualLink={staffRole === 'manager'}
        onClose={() => setLinkModalPlayer(null)}
        onSuccess={() => {
          loadPeople();
        }}
      />
    </div>
  );
}

export default LeaguePeoplePage;
