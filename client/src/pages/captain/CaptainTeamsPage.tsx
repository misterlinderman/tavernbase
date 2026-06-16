import { Link, useOutletContext } from 'react-router-dom';
import {
  REGISTRATION_STATUS_LABELS,
  SPORT_LABELS,
  STATUS_LABELS,
} from '../../constants/leagues';
import type { LeagueStatus } from '../../constants/leagues';
import type { CaptainProfile, CaptainReturningSeasonOption, CaptainTeamSummary } from '../../types/captain';
import styles from './CaptainTeamsPage.module.css';

function statusBadgeClass(status: LeagueStatus): string {
  switch (status) {
    case 'active':
      return styles.statusActive;
    case 'draft':
      return styles.statusDraft;
    case 'completed':
      return styles.statusCompleted;
    default:
      return styles.statusCompleted;
  }
}

function ReturningSeasonCard({ option }: { option: CaptainReturningSeasonOption }) {
  const hasRegistration = Boolean(option.registrationId);

  return (
    <article className={styles.teamCard}>
      <div className={styles.teamHeader}>
        <div>
          <h2 className={styles.teamName}>{option.priorTeamName}</h2>
          <p className={styles.leagueMeta}>
            {option.priorLeagueName} → {option.targetLeagueName}
          </p>
        </div>
        <span className={`${styles.statusBadge} ${styles.statusActive}`}>Registration open</span>
      </div>

      <p className={styles.registrationNote}>
        Entry fee: {option.entryFeeDisplay}
        {option.requiresApproval ? ' · Manager approval required' : ''}
      </p>

      <div className={styles.actions}>
        {hasRegistration ? (
          <span className={styles.registrationNote}>
            Registration: {REGISTRATION_STATUS_LABELS[option.registrationStatus!]}
          </span>
        ) : (
          <Link
            to={`/captain/register/${option.targetLeagueId}/${option.priorTeamId}`}
            className="btn btn-green"
          >
            Register for {option.targetLeagueName}
          </Link>
        )}
      </div>
    </article>
  );
}

function TeamCard({
  team,
  pastSeason = false,
  returningOption,
}: {
  team: CaptainTeamSummary;
  pastSeason?: boolean;
  returningOption?: CaptainReturningSeasonOption;
}) {
  const canRegister =
    team.registration.isOpen &&
    !team.registration.registrationId &&
    team.status !== 'completed';
  const hasPendingRegistration = Boolean(team.registration.registrationStatus);

  return (
    <article className={styles.teamCard}>
      <div className={styles.teamHeader}>
        <div>
          <h2 className={styles.teamName}>{team.teamName}</h2>
          <p className={styles.leagueMeta}>
            {team.leagueName} · {SPORT_LABELS[team.sport]} · {STATUS_LABELS[team.status]}
          </p>
        </div>
        <span className={`${styles.statusBadge} ${statusBadgeClass(team.status)}`}>
          {pastSeason ? 'Past season' : STATUS_LABELS[team.status]}
        </span>
      </div>

      {hasPendingRegistration && team.registration.registrationStatus ? (
        <p className={styles.registrationNote}>
          Registration: {REGISTRATION_STATUS_LABELS[team.registration.registrationStatus]}
          {team.registration.entryFeeDisplay ? ` · ${team.registration.entryFeeDisplay}` : ''}
        </p>
      ) : team.registration.isOpen ? (
        <p className={styles.registrationNote}>
          Registration open
          {team.registration.entryFeeDisplay ? ` · ${team.registration.entryFeeDisplay}` : ''}
        </p>
      ) : null}

      <div className={styles.actions}>
        {!pastSeason ? (
          <Link to="/captain" className="btn btn-green">
            Submit scores
          </Link>
        ) : null}
        {!pastSeason ? (
          <Link to={`/captain/teams/${team.teamId}/roster`} className="btn btn-outline">
            Manage roster
          </Link>
        ) : null}
        {returningOption && !returningOption.registrationId ? (
          <Link
            to={`/captain/register/${returningOption.targetLeagueId}/${returningOption.priorTeamId}`}
            className="btn btn-green"
          >
            Register for {returningOption.targetLeagueName}
          </Link>
        ) : null}
        {canRegister && !returningOption ? (
          <Link to={`/register/${team.leagueId}/team`} className="btn btn-outline">
            Register for season
          </Link>
        ) : null}
        {pastSeason ? (
          <Link to="/register" className="btn btn-outline">
            Browse registrations
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function CaptainTeamsPage() {
  const profile = useOutletContext<CaptainProfile>();

  const returningOptionByPriorTeamId = Object.fromEntries(
    profile.returningSeasonOptions.map((option) => [option.priorTeamId, option])
  );

  return (
    <div>
      <h1 className={styles.pageTitle}>My teams</h1>
      <p className={styles.pageLead}>
        Every team you captain across active leagues. Submit scores, manage rosters, and register
        for upcoming seasons from here.
      </p>

      {profile.returningSeasonOptions.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Register for a new season</h2>
          <div className={styles.grid}>
            {profile.returningSeasonOptions.map((option) => (
              <ReturningSeasonCard key={`${option.priorTeamId}-${option.targetLeagueId}`} option={option} />
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Active teams</h2>
        {profile.teams.length === 0 ? (
          <p className={styles.empty}>
            No active teams yet.{' '}
            <Link to="/register">Browse open registrations</Link> to sign up a new team.
          </p>
        ) : (
          <div className={styles.grid}>
            {profile.teams.map((team) => (
              <TeamCard key={team.teamId} team={team} />
            ))}
          </div>
        )}
      </section>

      {profile.pastTeams.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Past seasons</h2>
          <div className={styles.grid}>
            {profile.pastTeams.map((team) => (
              <TeamCard
                key={team.teamId}
                team={team}
                pastSeason
                returningOption={returningOptionByPriorTeamId[team.teamId]}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default CaptainTeamsPage;
