import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Toggle from '../../components/admin/shared/Toggle';
import { useToast } from '../../components/admin/shared/Toast';
import { useAdminApi } from '../../hooks/useAdminApi';
import { useStaffProfile } from '../../hooks/useStaffProfile';
import {
  ENTRANT_TYPE_LABELS,
  ENTRANT_TYPES,
  FORMAT_LABELS,
  KIND_LABELS,
  LEAGUE_FORMATS,
  LEAGUE_KINDS,
  LEAGUE_STATUSES,
  POOL_FORMAT_LABELS,
  POOL_FORMATS,
  SPORT_LABELS,
  SPORTS,
  STATUS_LABELS,
  TOURNAMENT_MAX_DAYS,
  TOURNAMENT_WARN_DAYS,
} from '../../constants/leagues';
import {
  createLeague,
  deleteLeague,
  getLeaguesOverview,
} from '../../services/leagues';
import type { SiteSettings } from '../../types';
import type { LeagueFormState, LeaguesOverview, LeaguesOverviewLeague } from '../../types/leagues';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './LeaguesPage.module.css';

const DEFAULT_SPORTS_LICENSED: SiteSettings['sportsEnabled'] = {
  pool: true,
  darts: true,
  volleyball: true,
};

const LICENSE_TOOLTIP =
  'This sport is not included in your venue license. Contact support to add it.';

const EMPTY_FORM: LeagueFormState = {
  sport: 'pool',
  name: '',
  seasonStart: '',
  seasonEnd: '',
  kind: 'league',
  entrantType: 'team',
  format: 'round_robin',
  status: 'draft',
  poolFormat: '8_ball',
};

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultTournamentDates(): { start: string; end: string } {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7);
  return { start: formatDateInput(start), end: formatDateInput(end) };
}

const DARTS_501_SINGLES_PRESET: LeagueFormState = {
  sport: 'darts',
  kind: 'tournament',
  entrantType: 'player',
  format: 'bracket',
  name: '',
  seasonStart: '',
  seasonEnd: '',
  status: 'draft',
  poolFormat: '8_ball',
};

const POOL_9_BALL_SINGLES_PRESET: LeagueFormState = {
  sport: 'pool',
  kind: 'tournament',
  entrantType: 'player',
  format: 'bracket',
  name: '',
  seasonStart: '',
  seasonEnd: '',
  status: 'draft',
  poolFormat: '9_ball',
};

function applyDarts501SinglesPreset(): LeagueFormState {
  const dates = defaultTournamentDates();
  return {
    ...DARTS_501_SINGLES_PRESET,
    seasonStart: dates.start,
    seasonEnd: dates.end,
  };
}

function applyPool9BallSinglesPreset(): LeagueFormState {
  const dates = defaultTournamentDates();
  return {
    ...POOL_9_BALL_SINGLES_PRESET,
    seasonStart: dates.start,
    seasonEnd: dates.end,
  };
}

function seasonSpanDays(start: string, end: string): number | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  return Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000);
}

function resolveLeagueKind(kind?: LeagueFormState['kind']): LeagueFormState['kind'] {
  return kind ?? 'league';
}

function formatSeasonRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return '—';
  }

  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}`;
}

function activeLeagueTotal(overview: LeaguesOverview): number {
  return SPORTS.reduce((sum, sport) => sum + overview.activeBySport[sport], 0);
}

function LeaguesPage() {
  const { adminFetch } = useAdminApi();
  const { toast } = useToast();
  const { canWriteLeagues, canManageSiteSettings } = useStaffProfile();
  const [overview, setOverview] = useState<LeaguesOverview | null>(null);
  const [sportsEnabled, setSportsEnabled] = useState<SiteSettings['sportsEnabled']>({
    pool: false,
    darts: false,
    volleyball: false,
  });
  const [sportsLicensed, setSportsLicensed] =
    useState<SiteSettings['sportsEnabled']>(DEFAULT_SPORTS_LICENSED);
  const [form, setForm] = useState<LeagueFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    const [overviewData, settings] = await Promise.all([
      getLeaguesOverview(adminFetch),
      adminFetch<SiteSettings>('/admin/site'),
    ]);
    setOverview(overviewData);
    setSportsEnabled(settings.sportsEnabled);
    setSportsLicensed(settings.sportsLicensed ?? DEFAULT_SPORTS_LICENSED);
    setForm((current) => {
      const licensedSports = SPORTS.filter(
        (sport) => (settings.sportsLicensed ?? DEFAULT_SPORTS_LICENSED)[sport]
      );
      const nextSport = licensedSports.includes(current.sport)
        ? current.sport
        : licensedSports[0] ?? 'pool';

      return { ...current, sport: nextSport };
    });
  }, [adminFetch]);

  useEffect(() => {
    loadData()
      .catch(() => toast('Could not load leagues', 'error'))
      .finally(() => setLoading(false));
  }, [loadData, toast]);

  const saveSportsEnabled = async (next: SiteSettings['sportsEnabled']) => {
    try {
      const updated = await adminFetch<SiteSettings>('/admin/site', {
        method: 'PUT',
        body: JSON.stringify({ sportsEnabled: next }),
      });
      setSportsEnabled(updated.sportsEnabled);
      toast('Sports settings saved', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save sports settings', 'error');
    }
  };

  const handleSportToggle = async (sport: keyof SiteSettings['sportsEnabled'], enabled: boolean) => {
    if (enabled && !sportsLicensed[sport]) {
      toast(`${SPORT_LABELS[sport]} is not licensed for this deployment`, 'error');
      return;
    }

    const next = { ...sportsEnabled, [sport]: enabled };
    setSportsEnabled(next);
    await saveSportsEnabled(next);
  };

  const licensedSports = SPORTS.filter((sport) => sportsLicensed[sport]);
  const formSpanDays = seasonSpanDays(form.seasonStart, form.seasonEnd);
  const tournamentDateWarning =
    form.kind === 'tournament' &&
    formSpanDays !== null &&
    formSpanDays > TOURNAMENT_WARN_DAYS &&
    formSpanDays <= TOURNAMENT_MAX_DAYS;

  const handleKindChange = (kind: LeagueFormState['kind']) => {
    setForm((prev) => {
      if (kind === 'tournament') {
        const dates =
          prev.seasonStart && prev.seasonEnd
            ? { seasonStart: prev.seasonStart, seasonEnd: prev.seasonEnd }
            : defaultTournamentDates();
        return {
          ...prev,
          kind,
          format: 'bracket',
          poolFormat: prev.sport === 'pool' ? '9_ball' : prev.poolFormat,
          ...dates,
        };
      }

      return {
        ...prev,
        kind,
        format: prev.format === 'bracket' ? 'round_robin' : prev.format,
        poolFormat: prev.sport === 'pool' && prev.poolFormat === '9_ball' ? '8_ball' : prev.poolFormat,
      };
    });
  };

  const handleSportChange = (sport: LeagueFormState['sport']) => {
    setForm((prev) => ({
      ...prev,
      sport,
      poolFormat:
        sport === 'pool'
          ? prev.kind === 'tournament'
            ? '9_ball'
            : prev.poolFormat
          : prev.poolFormat,
    }));
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast('League name is required', 'error');
      return;
    }

    if (!form.seasonStart || !form.seasonEnd) {
      toast('Season start and end dates are required', 'error');
      return;
    }

    const spanDays = seasonSpanDays(form.seasonStart, form.seasonEnd);
    if (form.kind === 'tournament' && spanDays !== null && spanDays > TOURNAMENT_MAX_DAYS) {
      toast(`Tournament dates cannot span more than ${TOURNAMENT_MAX_DAYS} days`, 'error');
      return;
    }

    setCreating(true);

    try {
      const { poolFormat, ...rest } = form;
      await createLeague(adminFetch, {
        ...rest,
        format: form.kind === 'tournament' ? 'bracket' : rest.format,
        ...(form.sport === 'pool' ? { poolFormat } : {}),
      });
      setForm(EMPTY_FORM);
      await loadData();
      toast('League created', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not create league', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (league: LeaguesOverviewLeague) => {
    const confirmed = window.confirm(
      `Delete "${league.name}"? This removes all divisions, teams, and schedules for this league.`
    );

    if (!confirmed) return;

    try {
      await deleteLeague(adminFetch, league._id);
      await loadData();
      toast('League deleted', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not delete league', 'error');
    }
  };

  if (loading) {
    return <p className={styles.loading}>Loading leagues…</p>;
  }

  if (!overview) {
    return (
      <div>
        <h1 className={formStyles.pageTitle}>Leagues</h1>
        <p className={styles.loading} role="alert">
          Unable to load leagues dashboard. Try refreshing the page.
        </p>
      </div>
    );
  }

  const leagues = overview.leagues;

  return (
    <div>
      <h1 className={formStyles.pageTitle}>Leagues</h1>
      <p className={styles.intro}>
        All pool, darts, and volleyball leagues in one place. Review disputes and upcoming matches,
        then drill into any league to manage teams and schedules.
      </p>

      <div className={styles.statGrid}>
        <div className={`${styles.statCard} ${styles.green}`}>
          <span className={styles.statValue}>{activeLeagueTotal(overview)}</span>
          <span className={styles.statLabel}>Active leagues</span>
          <span className={styles.statDetail}>
            {SPORTS.map((sport) => `${overview.activeBySport[sport]} ${SPORT_LABELS[sport]}`)
              .join(' · ')}
          </span>
        </div>

        <div
          className={`${styles.statCard} ${styles.amber} ${
            overview.disputedMatchCount > 0 ? styles.statAlert : ''
          }`}
        >
          <span className={styles.statValue}>{overview.disputedMatchCount}</span>
          <span className={styles.statLabel}>Disputed matches</span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statValue}>{overview.upcomingMatchCount}</span>
          <span className={styles.statLabel}>Matches this week</span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statValue}>{leagues.length}</span>
          <span className={styles.statLabel}>Total leagues</span>
        </div>
      </div>

      {overview.disputedMatches.length > 0 ? (
        <section className={`${formStyles.panel} ${styles.section} ${styles.disputePanel}`}>
          <h2 className={formStyles.sectionTitle}>Needs your attention</h2>
          <p className={styles.help}>
            Captains entered conflicting scores. Open the league to review and finalize.
          </p>
          <ul className={styles.attentionList}>
            {overview.disputedMatches.map((dispute) => (
              <li key={dispute.matchId} className={styles.attentionItem}>
                <div className={styles.attentionBody}>
                  <p className={styles.attentionLeague}>
                    {dispute.leagueName}
                    <span className={styles.sportBadge}>{SPORT_LABELS[dispute.sport]}</span>
                  </p>
                  <p className={styles.attentionMatch}>
                    {dispute.homeTeamName} vs {dispute.awayTeamName}
                  </p>
                </div>
                <Link
                  to={`/admin/leagues/${dispute.leagueId}`}
                  className="btn btn-outline"
                  aria-label={`Resolve dispute in ${dispute.leagueName}`}
                >
                  Resolve
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={`${formStyles.panel} ${styles.section}`}>
        <h2 className={formStyles.sectionTitle}>Sports enabled</h2>
        <p className={styles.help}>
          {canManageSiteSettings
            ? 'Turn on the sports your venue runs. Disabled sports stay hidden from the public site.'
            : 'Sports shown on the public site. Contact a manager to change these settings.'}
        </p>
        <div className={styles.toggles}>
          {SPORTS.map((sport) => (
            <Toggle
              key={sport}
              checked={sportsEnabled[sport]}
              onChange={(enabled) => handleSportToggle(sport, enabled)}
              label={SPORT_LABELS[sport]}
              disabled={!canManageSiteSettings || !sportsLicensed[sport]}
              title={!sportsLicensed[sport] ? LICENSE_TOOLTIP : undefined}
            />
          ))}
        </div>
        {licensedSports.length === 0 ? (
          <p className={styles.licenseNote}>
            No league sports are licensed for this deployment. Update{' '}
            <code>config/establishment.json</code> to enable modules.
          </p>
        ) : null}
      </section>

      {canWriteLeagues ? (
        <section className={`${formStyles.panel} ${styles.section}`}>
          <h2 className={formStyles.sectionTitle}>Create league or tournament</h2>
          <p className={styles.presetHelp}>
            Quick start:{' '}
            <button
              type="button"
              className={styles.presetButton}
              onClick={() => setForm(applyDarts501SinglesPreset())}
            >
              Darts 501 singles knockout
            </button>
            {' · '}
            <button
              type="button"
              className={styles.presetButton}
              onClick={() => setForm(applyPool9BallSinglesPreset())}
            >
              Pool 9-ball singles knockout
            </button>{' '}
            — individual players, bracket schedule.
          </p>
          <form className={styles.formGrid} onSubmit={handleCreate}>
            <div>
              <label className={formStyles.fieldLabel} htmlFor="league-kind">
                Type
              </label>
              <select
                id="league-kind"
                className={formStyles.select}
                value={form.kind}
                onChange={(e) => handleKindChange(e.target.value as LeagueFormState['kind'])}
              >
                {LEAGUE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="league-entrant-type">
                Entrants
              </label>
              <select
                id="league-entrant-type"
                className={formStyles.select}
                value={form.entrantType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    entrantType: e.target.value as LeagueFormState['entrantType'],
                  }))
                }
              >
                {ENTRANT_TYPES.map((entrantType) => (
                  <option key={entrantType} value={entrantType}>
                    {ENTRANT_TYPE_LABELS[entrantType]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="league-sport">
                Sport
              </label>
              <select
                id="league-sport"
                className={formStyles.select}
                value={form.sport}
                onChange={(e) => handleSportChange(e.target.value as LeagueFormState['sport'])}
              >
                {licensedSports.map((sport) => (
                  <option key={sport} value={sport}>
                    {SPORT_LABELS[sport]}
                  </option>
                ))}
              </select>
            </div>

            {form.sport === 'pool' ? (
              <div>
                <label className={formStyles.fieldLabel} htmlFor="league-pool-format">
                  Pool format
                </label>
                <select
                  id="league-pool-format"
                  className={formStyles.select}
                  value={form.poolFormat}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      poolFormat: e.target.value as LeagueFormState['poolFormat'],
                    }))
                  }
                >
                  {POOL_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {POOL_FORMAT_LABELS[format]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className={styles.fullWidth}>
              <label className={formStyles.fieldLabel} htmlFor="league-name">
                {form.kind === 'tournament' ? 'Tournament name' : 'League name'}
              </label>
              <input
                id="league-name"
                className={formStyles.input}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={
                  form.kind === 'tournament' && form.sport === 'pool' && form.entrantType === 'player'
                    ? 'e.g. Saturday 9-Ball Singles'
                    : form.kind === 'tournament' && form.sport === 'darts' && form.entrantType === 'player'
                      ? 'e.g. Saturday 501 Singles'
                      : form.kind === 'tournament'
                        ? 'e.g. Saturday 9-Ball Singles'
                        : 'e.g. Tuesday Night 8-Ball'
                }
                maxLength={120}
              />
            </div>

            {form.entrantType === 'player' ? (
              <p className={`${styles.help} ${styles.fullWidth}`}>
                Individual player rosters are managed on the league detail page after you create
                this {form.kind === 'tournament' ? 'tournament' : 'league'}.
              </p>
            ) : null}

            <div>
              <label className={formStyles.fieldLabel} htmlFor="league-start">
                {form.kind === 'tournament' ? 'Event start' : 'Season start'}
              </label>
              <input
                id="league-start"
                type="date"
                className={formStyles.input}
                value={form.seasonStart}
                onChange={(e) => setForm((prev) => ({ ...prev, seasonStart: e.target.value }))}
              />
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="league-end">
                {form.kind === 'tournament' ? 'Event end' : 'Season end'}
              </label>
              <input
                id="league-end"
                type="date"
                className={formStyles.input}
                value={form.seasonEnd}
                onChange={(e) => setForm((prev) => ({ ...prev, seasonEnd: e.target.value }))}
              />
            </div>

            {tournamentDateWarning ? (
              <p className={`${styles.help} ${styles.fullWidth} ${styles.dateWarning}`}>
                Tournaments usually run a few days — this span is longer than{' '}
                {TOURNAMENT_WARN_DAYS} days. You can still create it if that is intentional.
              </p>
            ) : null}

            <div>
              <label className={formStyles.fieldLabel} htmlFor="league-format">
                Format
              </label>
              <select
                id="league-format"
                className={formStyles.select}
                value={form.format}
                disabled={form.kind === 'tournament'}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    format: e.target.value as LeagueFormState['format'],
                  }))
                }
              >
                {LEAGUE_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {FORMAT_LABELS[format]}
                  </option>
                ))}
              </select>
              {form.kind === 'tournament' ? (
                <span className={styles.fieldNote}>Tournaments use bracket format.</span>
              ) : null}
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="league-status">
                Status
              </label>
              <select
                id="league-status"
                className={formStyles.select}
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as LeagueFormState['status'],
                  }))
                }
              >
                {LEAGUE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className="btn btn-green" disabled={creating}>
                {creating
                  ? 'Creating…'
                  : form.kind === 'tournament'
                    ? 'Create tournament'
                    : 'Create league'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className={`${formStyles.panel} ${styles.section}`}>
        <h2 className={formStyles.sectionTitle}>All leagues</h2>
        {leagues.length === 0 ? (
          <p className={styles.empty}>
            {canWriteLeagues
              ? 'No leagues yet. Enable a sport above and create your first league.'
              : 'No leagues yet — check back once your venue has seasons set up.'}
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.leagueTable}>
              <thead>
                <tr>
                  <th scope="col">League</th>
                  <th scope="col">Sport</th>
                  <th scope="col">Status</th>
                  <th scope="col">Divisions</th>
                  <th scope="col">Disputes</th>
                  <th scope="col">Season</th>
                  <th scope="col">
                    <span className={styles.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {leagues.map((league) => (
                  <tr key={league._id}>
                    <td>
                      <Link to={`/admin/leagues/${league._id}`} className={styles.leagueLink}>
                        {league.name}
                      </Link>
                      <span className={styles.tableMeta}>
                        {resolveLeagueKind(league.kind) === 'tournament' ? (
                          <span className={styles.tournamentBadge}>Tournament</span>
                        ) : null}{' '}
                        {FORMAT_LABELS[league.format]}
                        {(league.entrantType ?? 'team') === 'player' ? ' · Players' : ''}
                      </span>
                    </td>
                    <td>
                      <span className={styles.sportBadge}>{SPORT_LABELS[league.sport]}</span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          league.status === 'active'
                            ? styles.statusActive
                            : league.status === 'completed'
                              ? styles.statusCompleted
                              : styles.statusDraft
                        }`}
                      >
                        {STATUS_LABELS[league.status]}
                      </span>
                    </td>
                    <td>{league.divisionCount}</td>
                    <td>
                      {league.disputedCount > 0 ? (
                        <Link
                          to={`/admin/leagues/${league._id}`}
                          className={styles.disputeLink}
                        >
                          {league.disputedCount}
                        </Link>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className={styles.seasonCell}>
                      {formatSeasonRange(league.seasonStart, league.seasonEnd)}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <Link to={`/admin/leagues/${league._id}`} className="btn btn-outline">
                          {canWriteLeagues ? 'Manage' : 'View'}
                        </Link>
                        {canWriteLeagues ? (
                          <button
                            type="button"
                            className={formStyles.btnDanger}
                            onClick={() => handleDelete(league)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default LeaguesPage;
