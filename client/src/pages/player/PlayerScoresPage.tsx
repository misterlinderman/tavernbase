import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/admin/shared/Toast';
import { usePlayerApi } from '../../hooks/usePlayerApi';
import { listPlayerMatches, submitPlayerScoresheet } from '../../services/player';
import type {
  CaptainMatch,
  CaptainSubmissionState,
  DartsScoresheetPayload,
  PoolScoresheetPayload,
  VolleyballScoresheetPayload,
} from '../../types/captain';
import type { Sport } from '../../constants/leagues';
import { formatScoresheetSummary } from '../../utils/scoresheetPayload';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from '../captain/CaptainPage.module.css';

const STATE_LABELS: Record<CaptainSubmissionState, string> = {
  scheduled: 'Ready to play',
  awaiting_you: 'Your score needed',
  awaiting_opponent: 'Waiting on opponent',
  disputed: 'Score dispute',
  final: 'Final',
};

function stateClassName(state: CaptainSubmissionState): string {
  switch (state) {
    case 'awaiting_you':
      return styles.awaitingYou;
    case 'awaiting_opponent':
      return styles.awaitingOpponent;
    case 'disputed':
      return styles.disputed;
    case 'final':
      return styles.final;
    default:
      return styles.scheduled;
  }
}

function formatMatchDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function PoolScoresheetForm({
  match,
  onSubmitted,
}: {
  match: CaptainMatch;
  onSubmitted: () => void;
}) {
  const { playerFetch } = usePlayerApi();
  const { toast } = useToast();
  const opponentSheet = match.mySide === 'home' ? match.scoresheets.away : match.scoresheets.home;
  const opponentPayload = opponentSheet?.payload;
  const [homeRaceWins, setHomeRaceWins] = useState(
    String(
      opponentPayload && 'homeRaceWins' in opponentPayload ? opponentPayload.homeRaceWins : ''
    )
  );
  const [awayRaceWins, setAwayRaceWins] = useState(
    String(
      opponentPayload && 'awayRaceWins' in opponentPayload ? opponentPayload.awayRaceWins : ''
    )
  );
  const [submitting, setSubmitting] = useState(false);
  const raceTo = match.raceTo ?? 5;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const payload: PoolScoresheetPayload = {
      homeRaceWins: Number(homeRaceWins),
      awayRaceWins: Number(awayRaceWins),
    };

    if (!Number.isInteger(payload.homeRaceWins) || payload.homeRaceWins < 0) {
      toast('Enter a valid home games won', 'error');
      return;
    }

    if (!Number.isInteger(payload.awayRaceWins) || payload.awayRaceWins < 0) {
      toast('Enter a valid away games won', 'error');
      return;
    }

    setSubmitting(true);

    try {
      await submitPlayerScoresheet(playerFetch, match._id, payload);
      toast('Scoresheet submitted', 'success');
      onSubmitted();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not submit scoresheet', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.scoreForm} onSubmit={handleSubmit}>
      <p className={styles.matchMeta}>Race to {raceTo} games — enter games won for each player.</p>
      <div>
        <label className={formStyles.fieldLabel} htmlFor={`home-${match._id}`}>
          {match.homeTeamName} games won
        </label>
        <input
          id={`home-${match._id}`}
          type="number"
          min={0}
          className={formStyles.input}
          value={homeRaceWins}
          onChange={(e) => setHomeRaceWins(e.target.value)}
          required
        />
      </div>
      <div>
        <label className={formStyles.fieldLabel} htmlFor={`away-${match._id}`}>
          {match.awayTeamName} games won
        </label>
        <input
          id={`away-${match._id}`}
          type="number"
          min={0}
          className={formStyles.input}
          value={awayRaceWins}
          onChange={(e) => setAwayRaceWins(e.target.value)}
          required
        />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <button type="submit" className="btn btn-green" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit score'}
        </button>
      </div>
    </form>
  );
}

function DartsScoresheetForm({
  match,
  onSubmitted,
}: {
  match: CaptainMatch;
  onSubmitted: () => void;
}) {
  const { playerFetch } = usePlayerApi();
  const { toast } = useToast();
  const opponentSheet = match.mySide === 'home' ? match.scoresheets.away : match.scoresheets.home;
  const opponentPayload = opponentSheet?.payload;
  const [homeLegsWon, setHomeLegsWon] = useState(
    String(opponentPayload && 'homeLegsWon' in opponentPayload ? opponentPayload.homeLegsWon : '')
  );
  const [awayLegsWon, setAwayLegsWon] = useState(
    String(opponentPayload && 'awayLegsWon' in opponentPayload ? opponentPayload.awayLegsWon : '')
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const payload: DartsScoresheetPayload = {
      homeLegsWon: Number(homeLegsWon),
      awayLegsWon: Number(awayLegsWon),
    };

    if (!Number.isInteger(payload.homeLegsWon) || payload.homeLegsWon < 0) {
      toast('Enter a valid home legs won', 'error');
      return;
    }

    if (!Number.isInteger(payload.awayLegsWon) || payload.awayLegsWon < 0) {
      toast('Enter a valid away legs won', 'error');
      return;
    }

    setSubmitting(true);

    try {
      await submitPlayerScoresheet(playerFetch, match._id, payload);
      toast('Scoresheet submitted', 'success');
      onSubmitted();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not submit scoresheet', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.scoreForm} onSubmit={handleSubmit}>
      <div>
        <label className={formStyles.fieldLabel} htmlFor={`home-legs-${match._id}`}>
          {match.homeTeamName} legs won
        </label>
        <input
          id={`home-legs-${match._id}`}
          type="number"
          min={0}
          className={formStyles.input}
          value={homeLegsWon}
          onChange={(e) => setHomeLegsWon(e.target.value)}
          required
        />
      </div>
      <div>
        <label className={formStyles.fieldLabel} htmlFor={`away-legs-${match._id}`}>
          {match.awayTeamName} legs won
        </label>
        <input
          id={`away-legs-${match._id}`}
          type="number"
          min={0}
          className={formStyles.input}
          value={awayLegsWon}
          onChange={(e) => setAwayLegsWon(e.target.value)}
          required
        />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <button type="submit" className="btn btn-green" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit score'}
        </button>
      </div>
    </form>
  );
}

function VolleyballScoresheetForm({
  match,
  onSubmitted,
}: {
  match: CaptainMatch;
  onSubmitted: () => void;
}) {
  const { playerFetch } = usePlayerApi();
  const { toast } = useToast();
  const opponentSheet = match.mySide === 'home' ? match.scoresheets.away : match.scoresheets.home;
  const opponentPayload = opponentSheet?.payload;
  const [homeSetWins, setHomeSetWins] = useState(
    String(opponentPayload && 'homeSetWins' in opponentPayload ? opponentPayload.homeSetWins : '')
  );
  const [awaySetWins, setAwaySetWins] = useState(
    String(opponentPayload && 'awaySetWins' in opponentPayload ? opponentPayload.awaySetWins : '')
  );
  const [submitting, setSubmitting] = useState(false);
  const setsToWin = match.setsToWin ?? 2;
  const formatLabel = setsToWin === 3 ? 'Best of 5' : 'Best of 3';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const payload: VolleyballScoresheetPayload = {
      homeSetWins: Number(homeSetWins),
      awaySetWins: Number(awaySetWins),
    };

    if (!Number.isInteger(payload.homeSetWins) || payload.homeSetWins < 0) {
      toast('Enter a valid home sets won', 'error');
      return;
    }

    if (!Number.isInteger(payload.awaySetWins) || payload.awaySetWins < 0) {
      toast('Enter a valid away sets won', 'error');
      return;
    }

    setSubmitting(true);

    try {
      await submitPlayerScoresheet(playerFetch, match._id, payload);
      toast('Scoresheet submitted', 'success');
      onSubmitted();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not submit scoresheet', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.scoreForm} onSubmit={handleSubmit}>
      <p className={styles.matchMeta}>
        {formatLabel} — first player to {setsToWin} sets wins the match.
      </p>
      <div>
        <label className={formStyles.fieldLabel} htmlFor={`home-sets-${match._id}`}>
          {match.homeTeamName} sets won
        </label>
        <input
          id={`home-sets-${match._id}`}
          type="number"
          min={0}
          max={setsToWin}
          className={formStyles.input}
          value={homeSetWins}
          onChange={(e) => setHomeSetWins(e.target.value)}
          required
        />
      </div>
      <div>
        <label className={formStyles.fieldLabel} htmlFor={`away-sets-${match._id}`}>
          {match.awayTeamName} sets won
        </label>
        <input
          id={`away-sets-${match._id}`}
          type="number"
          min={0}
          max={setsToWin}
          className={formStyles.input}
          value={awaySetWins}
          onChange={(e) => setAwaySetWins(e.target.value)}
          required
        />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <button type="submit" className="btn btn-green" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit score'}
        </button>
      </div>
    </form>
  );
}

function MatchScoreForm({
  match,
  onSubmitted,
}: {
  match: CaptainMatch;
  onSubmitted: () => void;
}) {
  if (match.sport === 'volleyball') {
    return <VolleyballScoresheetForm match={match} onSubmitted={onSubmitted} />;
  }

  if (match.sport === 'darts') {
    return <DartsScoresheetForm match={match} onSubmitted={onSubmitted} />;
  }

  return <PoolScoresheetForm match={match} onSubmitted={onSubmitted} />;
}

function PlayerScoresPage() {
  const { playerFetchList } = usePlayerApi();
  const { toast } = useToast();
  const [matches, setMatches] = useState<CaptainMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = useCallback(async () => {
    const data = await listPlayerMatches(playerFetchList, 'open');
    setMatches(data);
  }, [playerFetchList]);

  useEffect(() => {
    loadMatches()
      .catch(() => toast('Could not load your matches', 'error'))
      .finally(() => setLoading(false));
  }, [loadMatches, toast]);

  if (loading) {
    return <p className={styles.scheduled}>Loading your matches…</p>;
  }

  return (
    <div>
      <h1 className={formStyles.pageTitle}>Submit scores</h1>
      <p className={styles.matchMeta}>
        Enter results for your individual matches. Both players must submit matching scores before
        the result is final.
      </p>

      {matches.length === 0 ? (
        <p className={styles.matchMeta}>No open matches right now.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {matches.map((match) => {
            const sport: Sport = match.sport ?? 'pool';
            const mySheet =
              match.mySide === 'home' ? match.scoresheets.home : match.scoresheets.away;
            const opponentSheet =
              match.mySide === 'home' ? match.scoresheets.away : match.scoresheets.home;
            const mySummary = mySheet
              ? formatScoresheetSummary(mySheet.payload, sport, { playerPool: sport === 'pool' })
              : null;
            const opponentSummary = opponentSheet
              ? formatScoresheetSummary(opponentSheet.payload, sport, { playerPool: sport === 'pool' })
              : null;

            return (
              <article key={match._id} className={styles.matchCard}>
                <div className={styles.matchHeader}>
                  <div>
                    <h2 className={styles.matchTitle}>
                      {match.homeTeamName} vs {match.awayTeamName}
                    </h2>
                    <p className={styles.matchMeta}>
                      {match.leagueName} · Round {match.roundNumber} ·{' '}
                      {formatMatchDate(match.scheduledAt)}
                      {match.handicapLabel ? ` · ${match.handicapLabel}` : ''}
                      {match.raceTo && match.sport === 'pool' ? ` · Race to ${match.raceTo}` : ''}
                    </p>
                  </div>
                  <span
                    className={`${styles.submissionState} ${stateClassName(match.submissionState)}`}
                  >
                    {STATE_LABELS[match.submissionState]}
                  </span>
                </div>

                {mySheet?.status === 'submitted' || mySheet?.status === 'approved' ? (
                  <p className={styles.scoreReadout}>
                    Your submission: {mySummary?.home}–{mySummary?.away} (home–away{' '}
                    {mySummary?.unit})
                  </p>
                ) : null}

                {opponentSheet?.status === 'submitted' && match.canSubmit && opponentSummary ? (
                  <div className={styles.opponentScore}>
                    Opponent submitted {opponentSummary.home}–{opponentSummary.away}. Enter the
                    same score to confirm.
                  </div>
                ) : null}

                {match.submissionState === 'disputed' ? (
                  <p className={styles.scoreReadout}>
                    Scores don&apos;t match — league staff will review and finalize.
                  </p>
                ) : null}

                {match.canSubmit ? <MatchScoreForm match={match} onSubmitted={loadMatches} /> : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PlayerScoresPage;
