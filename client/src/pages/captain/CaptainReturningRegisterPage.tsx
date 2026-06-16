import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useToast } from '../../components/admin/shared/Toast';
import { useRegisterApi } from '../../hooks/useRegisterApi';
import {
  getReturningTeamRegistrationPreview,
  submitReturningTeamRegistration,
  type TeamRegistrationRosterEntry,
} from '../../services/register';
import type { ReturningTeamRegistrationPreview } from '../../types/captain';
import styles from './CaptainReturningRegisterPage.module.css';

function emptyRosterRow(): TeamRegistrationRosterEntry {
  return { name: '', email: '' };
}

function CaptainReturningRegisterPage() {
  const { targetLeagueId = '', priorTeamId = '' } = useParams();
  const navigate = useNavigate();
  const { registerFetch } = useRegisterApi();
  const { toast } = useToast();
  const { user } = useAuth0();

  const [preview, setPreview] = useState<ReturningTeamRegistrationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teamName, setTeamName] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [additionalRoster, setAdditionalRoster] = useState<TeamRegistrationRosterEntry[]>([]);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const userEmail = user?.email?.trim().toLowerCase() ?? '';

  useEffect(() => {
    if (!targetLeagueId || !priorTeamId) {
      return;
    }

    getReturningTeamRegistrationPreview(registerFetch, targetLeagueId, priorTeamId)
      .then((data) => {
        setPreview(data);
        setTeamName(data.teamName);
        setSelectedPlayerIds(new Set(data.roster.map((player) => player.playerId)));
        if (data.divisions.length === 1) {
          setDivisionId(data.divisions[0]._id);
        }
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Could not load returning registration');
      })
      .finally(() => setLoading(false));
  }, [registerFetch, targetLeagueId, priorTeamId]);

  const selectedRoster = useMemo(() => {
    if (!preview) {
      return [];
    }

    const fromPrior = preview.roster
      .filter((player) => selectedPlayerIds.has(player.playerId))
      .map((player) => ({ name: player.name, email: player.email.trim().toLowerCase() }));

    const extras = additionalRoster
      .map((entry) => ({
        name: entry.name.trim(),
        email: entry.email.trim().toLowerCase(),
      }))
      .filter((entry) => entry.name && entry.email.includes('@'));

    return [...fromPrior, ...extras];
  }, [additionalRoster, preview, selectedPlayerIds]);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((current) => {
      const next = new Set(current);

      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }

      return next;
    });
  };

  const updateAdditionalRow = (index: number, field: keyof TeamRegistrationRosterEntry, value: string) => {
    setAdditionalRoster((current) =>
      current.map((entry, rowIndex) => (rowIndex === index ? { ...entry, [field]: value } : entry))
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!preview || !targetLeagueId || !priorTeamId) {
      return;
    }

    if (!teamName.trim()) {
      setError('Enter a team name');
      return;
    }

    if (preview.divisions.length > 1 && !divisionId) {
      setError('Choose a division');
      return;
    }

    if (selectedRoster.length < preview.rosterMin) {
      setError(`Select at least ${preview.rosterMin} returning players`);
      return;
    }

    if (selectedRoster.length > preview.rosterMax) {
      setError(`Teams can have at most ${preview.rosterMax} players`);
      return;
    }

    if (!selectedRoster.some((entry) => entry.email === userEmail)) {
      setError('Include yourself on the roster using your sign-in email');
      return;
    }

    if (!waiverAccepted) {
      setError('Accept the waiver to continue');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await submitReturningTeamRegistration(registerFetch, targetLeagueId, {
        priorTeamId,
        teamName: teamName.trim(),
        divisionId: divisionId || undefined,
        roster: selectedRoster,
        waiverAccepted: true,
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      toast('Returning team registration submitted', 'success');
      navigate('/captain/teams', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit registration');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className={styles.lead}>Loading your prior roster…</p>;
  }

  if (error && !preview) {
    return (
      <div>
        <Link to="/captain/teams" className={styles.backLink}>
          ← My teams
        </Link>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  const waiverText =
    preview.registration.waiverText?.trim() ||
    'I agree to participate under league rules and venue policies.';

  return (
    <div>
      <Link to="/captain/teams" className={styles.backLink}>
        ← My teams
      </Link>

      <h1 className={styles.title}>Register for {preview.targetLeagueName}</h1>
      <p className={styles.lead}>
        Returning from {preview.priorLeagueName} as {preview.priorTeamName}. Confirm who is back,
        adjust your team name, and submit — your prior season record stays untouched.
      </p>

      <p className={styles.meta}>
        Entry fee: {preview.registration.entryFeeDisplay}
        {preview.registration.requiresApproval ? ' · Manager approval required' : ''}
      </p>

      <form className={styles.panel} onSubmit={(event) => void handleSubmit(event)}>
        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.field}>
          <label htmlFor="returning-team-name">Team name</label>
          <input
            id="returning-team-name"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            maxLength={120}
            required
          />
        </div>

        {preview.divisions.length > 1 ? (
          <div className={styles.field}>
            <label htmlFor="returning-division">Division</label>
            <select
              id="returning-division"
              value={divisionId}
              onChange={(event) => setDivisionId(event.target.value)}
              required
            >
              <option value="">Choose division</option>
              {preview.divisions.map((division) => (
                <option key={division._id} value={division._id}>
                  {division.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Who is returning?</h2>
          <ul className={styles.playerList}>
            {preview.roster.map((player) => (
              <li key={player.playerId}>
                <label className={styles.playerRow}>
                  <input
                    type="checkbox"
                    checked={selectedPlayerIds.has(player.playerId)}
                    onChange={() => togglePlayer(player.playerId)}
                    disabled={player.isCaptain}
                  />
                  <span>
                    {player.name}
                    {player.isCaptain ? ' (you)' : ''}
                    <span className={styles.playerEmail}>{player.email || 'No email on file'}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Add new players</h2>
          {additionalRoster.map((entry, index) => (
            <div key={index} className={styles.additionalRow}>
              <input
                value={entry.name}
                onChange={(event) => updateAdditionalRow(index, 'name', event.target.value)}
                placeholder="Name"
              />
              <input
                type="email"
                value={entry.email}
                onChange={(event) => updateAdditionalRow(index, 'email', event.target.value)}
                placeholder="Email"
              />
            </div>
          ))}
          <button
            type="button"
            className="btn btn-outline"
            disabled={selectedRoster.length >= preview.rosterMax}
            onClick={() => setAdditionalRoster((current) => [...current, emptyRosterRow()])}
          >
            Add row
          </button>
        </div>

        <label className={styles.waiverRow}>
          <input
            type="checkbox"
            checked={waiverAccepted}
            onChange={(event) => setWaiverAccepted(event.target.checked)}
          />
          <span>{waiverText}</span>
        </label>

        <p className={styles.summary}>
          Submitting {selectedRoster.length} player{selectedRoster.length === 1 ? '' : 's'} (minimum{' '}
          {preview.rosterMin})
        </p>

        <button type="submit" className="btn btn-green" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit returning team'}
        </button>
      </form>
    </div>
  );
}

export default CaptainReturningRegisterPage;
