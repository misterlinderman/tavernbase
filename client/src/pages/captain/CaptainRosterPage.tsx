import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../../components/admin/shared/Toast';
import { SPORT_LABELS, STATUS_LABELS } from '../../constants/leagues';
import { useCaptainApi } from '../../hooks/useCaptainApi';
import {
  addCaptainTeamRosterPlayer,
  getCaptainTeamRoster,
  removeCaptainTeamRosterPlayer,
} from '../../services/captain';
import type { CaptainTeamRosterView } from '../../types/captain';
import styles from './CaptainRosterPage.module.css';

function CaptainRosterPage() {
  const { teamId = '' } = useParams();
  const { captainFetch } = useCaptainApi();
  const { toast } = useToast();
  const [roster, setRoster] = useState<CaptainTeamRosterView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [inviteNote, setInviteNote] = useState('');

  const loadRoster = useCallback(async () => {
    if (!teamId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getCaptainTeamRoster(captainFetch, teamId);
      setRoster(data);
    } catch (loadError) {
      setRoster(null);
      setError(loadError instanceof Error ? loadError.message : 'Could not load roster');
    } finally {
      setLoading(false);
    }
  }, [captainFetch, teamId]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const handleAddPlayer = async (event: FormEvent) => {
    event.preventDefault();

    if (!teamId || !roster?.canEdit) {
      return;
    }

    setSubmitting(true);
    setError('');
    setInviteNote('');

    try {
      const result = await addCaptainTeamRosterPlayer(captainFetch, teamId, {
        name: playerName.trim(),
        email: playerEmail.trim().toLowerCase(),
      });

      setRoster(result.roster);
      setPlayerName('');
      setPlayerEmail('');

      if (result.inviteNote) {
        setInviteNote(result.inviteNote);
      }

      toast(result.inviteSent ? 'Player added and invite sent' : 'Player added', 'success');
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Could not add player');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePlayer = async (playerId: string, playerLabel: string) => {
    if (!teamId || !roster?.canEdit) {
      return;
    }

    const confirmed = window.confirm(`Remove ${playerLabel} from the roster?`);

    if (!confirmed) {
      return;
    }

    setRemovingId(playerId);
    setError('');

    try {
      const updated = await removeCaptainTeamRosterPlayer(captainFetch, teamId, playerId);
      setRoster(updated);
      toast('Player removed', 'success');
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Could not remove player');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return <p className={styles.pageLead}>Loading roster…</p>;
  }

  if (error && !roster) {
    return (
      <div>
        <Link to="/captain/teams" className={styles.backLink}>
          ← My teams
        </Link>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  if (!roster) {
    return null;
  }

  const atMax = roster.players.length >= roster.rosterMax;
  const atMin = roster.players.length <= roster.rosterMin;

  return (
    <div>
      <Link to="/captain/teams" className={styles.backLink}>
        ← My teams
      </Link>

      <h1 className={styles.pageTitle}>{roster.teamName}</h1>
      <p className={styles.pageLead}>
        Manage your roster for {roster.leagueName}. Changes appear immediately for league staff.
      </p>

      <p className={styles.meta}>
        {SPORT_LABELS[roster.sport]} · {STATUS_LABELS[roster.leagueStatus]} · {roster.players.length}{' '}
        / {roster.rosterMax} players (minimum {roster.rosterMin})
      </p>

      {!roster.canEdit && roster.editBlockedReason ? (
        <p className={styles.notice}>{roster.editBlockedReason}</p>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
      {inviteNote ? <p className={styles.success}>{inviteNote}</p> : null}

      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>Roster</h2>

        {roster.players.length === 0 ? (
          <p className={styles.empty}>No players on this roster yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Portal</th>
                {roster.canEdit ? <th aria-label="Actions" /> : null}
              </tr>
            </thead>
            <tbody>
              {roster.players.map((player) => (
                <tr key={player.playerId}>
                  <td>
                    {player.name}
                    {player.isCaptain ? (
                      <span className={styles.captainBadge}>Captain</span>
                    ) : null}
                  </td>
                  <td>{player.email ?? '—'}</td>
                  <td>{player.loginLinked ? 'Linked' : 'Invite pending'}</td>
                  {roster.canEdit ? (
                    <td>
                      {player.isCaptain ? (
                        <span className={styles.meta}>Transfer captain first</span>
                      ) : (
                        <button
                          type="button"
                          className={styles.removeBtn}
                          disabled={atMin || removingId === player.playerId}
                          onClick={() => void handleRemovePlayer(player.playerId, player.name)}
                        >
                          {removingId === player.playerId ? 'Removing…' : 'Remove'}
                        </button>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {roster.canEdit ? (
        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Add player</h2>
          {atMax ? (
            <p className={styles.notice}>
              Roster is full ({roster.rosterMax} players). Remove someone before adding a sub.
            </p>
          ) : (
            <form className={styles.formGrid} onSubmit={(event) => void handleAddPlayer(event)}>
              <div className={styles.field}>
                <label htmlFor="roster-player-name">Name</label>
                <input
                  id="roster-player-name"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder="Player name"
                  maxLength={120}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="roster-player-email">Email</label>
                <input
                  id="roster-player-email"
                  type="email"
                  value={playerEmail}
                  onChange={(event) => setPlayerEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
              <button type="submit" className="btn btn-green" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add player'}
              </button>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default CaptainRosterPage;
