import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../../components/admin/shared/Toast';
import { useAdminApi } from '../../hooks/useAdminApi';
import { useStaffProfile } from '../../hooks/useStaffProfile';
import {
  ENTRANT_TYPE_LABELS,
  FORMAT_LABELS,
  KIND_LABELS,
  MATCH_STATUS_LABELS,
  POOL_FORMAT_LABELS,
  POOL_FORMATS,
  POOL_HANDICAP_SYSTEM_LABELS,
  POOL_HANDICAP_SYSTEMS,
  SPORT_LABELS,
  STATUS_LABELS,
} from '../../constants/leagues';
import type { EntrantType, LeagueKind, PoolFormat, PoolHandicapSystem } from '../../constants/leagues';
import {
  addDivisionEntrant,
  createDivision,
  createPlayer,
  createTeam,
  deleteDivision,
  deleteTeam,
  finalizeAdminMatch,
  generateSchedule,
  getLeague,
  getStandings,
  importLeagueCsv,
  inviteCaptain,
  linkCaptainUser,
  linkPlayerUser,
  listDisputes,
  listDivisions,
  listMatches,
  listPlayers,
  listTeams,
  recalculateStandings,
  removeDivisionEntrant,
  reorderDivisionEntrants,
  resolveDispute,
  updateDivision,
  updateLeague,
  updateTeam,
} from '../../services/leagues';
import type {
  CaptainInviteResult,
  CsvImportType,
  Division,
  LeagueDetail,
  MatchListItem,
  Player,
  PoolHandicapRules,
  StandingsView,
  Team,
} from '../../types/leagues';
import type { DisputedMatch, SportScoresheetPayload } from '../../types/captain';
import type { Sport } from '../../constants/leagues';
import { buildSportScoresheetPayload, disputeFieldLabels, formatScoresheetSummary } from '../../utils/scoresheetPayload';
import { formatPlacement, isPlacementStandings } from '../../utils/placement';
import { poolHandicapBadge } from '../../utils/poolMatch';
import { detectCsvImportFormat, formatImportFormatLabel } from '../../utils/csvImportFormat';
import type { CsvImportFormat } from '../../types/leagues';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './LeagueDetailPage.module.css';

function resolveLeagueKind(kind?: LeagueKind): LeagueKind {
  return kind ?? 'league';
}

function resolveEntrantType(entrantType?: EntrantType): EntrantType {
  return entrantType ?? 'team';
}

function formatMatchDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function DisputeResolveForm({
  matchId,
  sport,
  resolving,
  onResolve,
  submitLabel = 'Finalize',
  playerPool = false,
}: {
  matchId: string;
  sport: Sport;
  resolving: boolean;
  onResolve: (matchId: string, payload: SportScoresheetPayload) => void;
  submitLabel?: string;
  playerPool?: boolean;
}) {
  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');
  const labels = disputeFieldLabels(sport, { playerPool });

  return (
    <form
      className={styles.disputeForm}
      onSubmit={(event) => {
        event.preventDefault();
        onResolve(
          matchId,
          buildSportScoresheetPayload(sport, Number(homeScore), Number(awayScore))
        );
      }}
    >
      <input
        type="number"
        min={0}
        className={formStyles.input}
        value={homeScore}
        onChange={(e) => setHomeScore(e.target.value)}
        aria-label={labels.home}
      />
      <input
        type="number"
        min={0}
        className={formStyles.input}
        value={awayScore}
        onChange={(e) => setAwayScore(e.target.value)}
        aria-label={labels.away}
      />
      <button type="submit" className="btn btn-green" disabled={resolving}>
        {resolving ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

function LeagueDetailPage() {
  const { leagueId = '' } = useParams();
  const { adminFetch, adminFetchList } = useAdminApi();
  const { toast } = useToast();
  const { canWriteLeagues } = useStaffProfile();
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [disputes, setDisputes] = useState<DisputedMatch[]>([]);
  const [standings, setStandings] = useState<StandingsView[]>([]);
  const [divisionName, setDivisionName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamDivisionId, setTeamDivisionId] = useState('');
  const [scheduleDivisionId, setScheduleDivisionId] = useState('');
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleIntervalDays, setScheduleIntervalDays] = useState('7');
  const [scheduleMatchTime, setScheduleMatchTime] = useState('19:00');
  const [scheduleReplaceExisting, setScheduleReplaceExisting] = useState(false);
  const [scheduleSetsToWin, setScheduleSetsToWin] = useState<'2' | '3'>('2');
  const [schedulePoolFormat, setSchedulePoolFormat] = useState<PoolFormat>('8_ball');
  const [poolFormat, setPoolFormat] = useState<PoolFormat>('8_ball');
  const [savingPoolFormat, setSavingPoolFormat] = useState(false);
  const [handicapDivisionId, setHandicapDivisionId] = useState('');
  const [handicapSystem, setHandicapSystem] = useState<PoolHandicapSystem>('none');
  const [handicapSkillMin, setHandicapSkillMin] = useState('3');
  const [handicapSkillMax, setHandicapSkillMax] = useState('7');
  const [handicapPerLevel, setHandicapPerLevel] = useState('1');
  const [savingHandicapRules, setSavingHandicapRules] = useState(false);
  const [matchFilterDivisionId, setMatchFilterDivisionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingDivision, setAddingDivision] = useState(false);
  const [addingTeam, setAddingTeam] = useState(false);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [captainAuth0Sub, setCaptainAuth0Sub] = useState('');
  const [captainEmail, setCaptainEmail] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [captainPlayerId, setCaptainPlayerId] = useState('');
  const [linkingCaptain, setLinkingCaptain] = useState(false);
  const [playerAuth0Sub, setPlayerAuth0Sub] = useState('');
  const [playerLinkEmail, setPlayerLinkEmail] = useState('');
  const [playerLinkName, setPlayerLinkName] = useState('');
  const [playerLinkId, setPlayerLinkId] = useState('');
  const [linkingPlayer, setLinkingPlayer] = useState(false);
  const [resolvingMatchId, setResolvingMatchId] = useState<string | null>(null);
  const [finalizingMatchId, setFinalizingMatchId] = useState<string | null>(null);
  const [recalculatingStandings, setRecalculatingStandings] = useState(false);
  const [importType, setImportType] = useState<CsvImportType>('teams');
  const [importCsv, setImportCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [detectedImportFormat, setDetectedImportFormat] = useState<CsvImportFormat | null>(null);
  const [invitingTeamId, setInvitingTeamId] = useState<string | null>(null);
  const [inviteResults, setInviteResults] = useState<Record<string, CaptainInviteResult>>({});
  const [entrantDivisionId, setEntrantDivisionId] = useState('');
  const [entrantSelectedPlayerId, setEntrantSelectedPlayerId] = useState('');
  const [entrantNewName, setEntrantNewName] = useState('');
  const [entrantNewEmail, setEntrantNewEmail] = useState('');
  const [addingEntrant, setAddingEntrant] = useState(false);
  const [reorderingEntrant, setReorderingEntrant] = useState(false);

  const loadData = useCallback(async () => {
    if (!leagueId) return;

    const [leagueDetail, divisionList, teamList, matchList, playerList, disputeList, standingsList] =
      await Promise.all([
        getLeague(adminFetch, leagueId),
        listDivisions(adminFetchList, leagueId),
        listTeams(adminFetchList, leagueId),
        listMatches(adminFetchList, leagueId, matchFilterDivisionId || undefined),
        listPlayers(adminFetchList),
        listDisputes(adminFetchList, leagueId),
        getStandings(adminFetchList, leagueId),
      ]);

    setLeague(leagueDetail);
    setDivisions(divisionList);
    setTeams(teamList);
    setMatches(matchList);
    setPlayers(playerList);
    setDisputes(disputeList);
    setStandings(standingsList);
    setTeamDivisionId((current) => current || divisionList[0]?._id || '');
    setScheduleDivisionId((current) => current || divisionList[0]?._id || '');
    setHandicapDivisionId((current) => current || divisionList[0]?._id || '');
    setEntrantDivisionId((current) => current || divisionList[0]?._id || '');
    setCaptainPlayerId((current) => current || playerList[0]?._id || '');
  }, [adminFetch, adminFetchList, leagueId, matchFilterDivisionId]);

  useEffect(() => {
    setLoading(true);
    loadData()
      .catch(() => toast('Could not load league', 'error'))
      .finally(() => setLoading(false));
  }, [loadData, toast]);

  useEffect(() => {
    if (league?.sport === 'pool') {
      const format = league.poolFormat ?? '8_ball';
      setPoolFormat(format);
      setSchedulePoolFormat(format);
    }
  }, [league?.poolFormat, league?.sport]);

  useEffect(() => {
    if (!handicapDivisionId) return;

    const division = divisions.find((entry) => entry._id === handicapDivisionId);
    const rules = division?.handicapRules;

    if (!rules || rules.system === 'none') {
      setHandicapSystem('none');
      setHandicapSkillMin('3');
      setHandicapSkillMax('7');
      setHandicapPerLevel('1');
      return;
    }

    setHandicapSystem(rules.system);
    setHandicapSkillMin(String(rules.skillLevelRange?.[0] ?? 3));
    setHandicapSkillMax(String(rules.skillLevelRange?.[1] ?? 7));
    setHandicapPerLevel(String(rules.handicapPerSkillLevel ?? 1));
  }, [handicapDivisionId, divisions]);

  const handleSavePoolFormat = async (event: FormEvent) => {
    event.preventDefault();

    if (!league || league.sport !== 'pool') return;

    setSavingPoolFormat(true);

    try {
      const updated = await updateLeague(adminFetch, leagueId, { poolFormat });
      setLeague((current) => (current ? { ...current, poolFormat: updated.poolFormat } : current));
      setSchedulePoolFormat(poolFormat);
      toast('Pool format saved', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save pool format', 'error');
    } finally {
      setSavingPoolFormat(false);
    }
  };

  const buildHandicapRulesPayload = (): PoolHandicapRules | null => {
    if (handicapSystem === 'none') {
      return { system: 'none' };
    }

    const skillMin = Number(handicapSkillMin);
    const skillMax = Number(handicapSkillMax);
    const perLevel = Number(handicapPerLevel);

    if (!Number.isFinite(skillMin) || !Number.isFinite(skillMax) || !Number.isFinite(perLevel)) {
      toast('Handicap fields must be valid numbers', 'error');
      return null;
    }

    if (skillMin > skillMax) {
      toast('Skill level minimum must be less than or equal to maximum', 'error');
      return null;
    }

    return {
      system: handicapSystem,
      skillLevelRange: [skillMin, skillMax],
      handicapPerSkillLevel: perLevel,
    };
  };

  const handleSaveHandicapRules = async (event: FormEvent) => {
    event.preventDefault();

    if (!handicapDivisionId || league?.sport !== 'pool') return;

    const handicapRules = buildHandicapRulesPayload();
    if (!handicapRules) return;

    setSavingHandicapRules(true);

    try {
      const updated = await updateDivision(adminFetch, leagueId, handicapDivisionId, {
        handicapRules,
      });
      setDivisions((current) =>
        current.map((division) => (division._id === updated._id ? updated : division))
      );
      toast('Handicap rules saved', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save handicap rules', 'error');
    } finally {
      setSavingHandicapRules(false);
    }
  };

  const handleAddDivision = async (event: FormEvent) => {
    event.preventDefault();

    if (!divisionName.trim()) {
      toast('Division name is required', 'error');
      return;
    }

    setAddingDivision(true);

    try {
      await createDivision(adminFetch, leagueId, {
        name: divisionName.trim(),
        order: divisions.length,
      });
      setDivisionName('');
      await loadData();
      toast('Division added', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not add division', 'error');
    } finally {
      setAddingDivision(false);
    }
  };

  const handleDeleteDivision = async (division: Division) => {
    const confirmed = window.confirm(
      `Delete division "${division.name}"? Teams and schedules in this division will be removed.`
    );

    if (!confirmed) return;

    try {
      await deleteDivision(adminFetch, leagueId, division._id);
      await loadData();
      toast('Division deleted', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not delete division', 'error');
    }
  };

  const handleAddTeam = async (event: FormEvent) => {
    event.preventDefault();

    if (!teamName.trim()) {
      toast('Team name is required', 'error');
      return;
    }

    if (!teamDivisionId) {
      toast('Add a division first', 'error');
      return;
    }

    setAddingTeam(true);

    try {
      await createTeam(adminFetch, leagueId, {
        divisionId: teamDivisionId,
        name: teamName.trim(),
      });
      setTeamName('');
      await loadData();
      toast('Team added', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not add team', 'error');
    } finally {
      setAddingTeam(false);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    const confirmed = window.confirm(`Delete team "${team.name}"?`);

    if (!confirmed) return;

    try {
      await deleteTeam(adminFetch, leagueId, team._id);
      await loadData();
      toast('Team deleted', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not delete team', 'error');
    }
  };

  const handleGenerateSchedule = async (event: FormEvent) => {
    event.preventDefault();

    if (!scheduleDivisionId) {
      toast('Select a division', 'error');
      return;
    }

    if (!scheduleStartDate) {
      toast('First match night is required', 'error');
      return;
    }

    const divisionTeams = teams.filter((team) => team.divisionId === scheduleDivisionId);

    if (divisionTeams.length < 2) {
      toast('Add at least two teams to this division first', 'error');
      return;
    }

    setGeneratingSchedule(true);

    try {
      const result = await generateSchedule(adminFetch, leagueId, {
        divisionId: scheduleDivisionId,
        startDate: scheduleStartDate,
        roundIntervalDays: Number(scheduleIntervalDays) || 7,
        matchTime: scheduleMatchTime,
        replaceExisting: scheduleReplaceExisting,
        ...(league?.sport === 'volleyball'
          ? { setsToWin: Number(scheduleSetsToWin) as 2 | 3 }
          : {}),
        ...(league?.sport === 'pool' ? { poolFormat: schedulePoolFormat } : {}),
      });
      await loadData();
      toast(
        `Schedule created — ${result.matchesCreated} matches across ${result.rounds} rounds`,
        'success'
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not generate schedule', 'error');
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const handleAssignCaptain = async (team: Team, playerId: string) => {
    try {
      await updateTeam(adminFetch, leagueId, team._id, {
        captainPlayerId: playerId || undefined,
      });
      await loadData();
      toast('Captain updated', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not assign captain', 'error');
    }
  };

  const handleUpdateRoster = async (team: Team, playerIds: string[]) => {
    try {
      await updateTeam(adminFetch, leagueId, team._id, { playerIds });
      await loadData();
      toast('Team roster updated', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update roster', 'error');
    }
  };

  const handleInviteCaptain = async (team: Team) => {
    setInvitingTeamId(team._id);

    try {
      const result = await inviteCaptain(adminFetch, leagueId, team._id);
      setInviteResults((current) => ({ ...current, [team._id]: result }));

      if (result.alreadyLinked) {
        toast(`${result.playerName} is already linked to Auth0`, 'success');
        return;
      }

      try {
        await navigator.clipboard.writeText(result.emailBody);
        toast(`Invite ready — email copied for ${result.playerEmail}`, 'success');
      } catch {
        toast(`Invite ready for ${result.playerEmail}`, 'success');
      }

      await loadData();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not invite captain', 'error');
    } finally {
      setInvitingTeamId(null);
    }
  };

  const handleCreatePlayer = async (event: FormEvent) => {
    event.preventDefault();

    if (!playerName.trim()) {
      toast('Player name is required', 'error');
      return;
    }

    setCreatingPlayer(true);

    try {
      await createPlayer(adminFetch, {
        name: playerName.trim(),
        email: playerEmail.trim() || undefined,
      });
      setPlayerName('');
      setPlayerEmail('');
      await loadData();
      toast('Player added', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not add player', 'error');
    } finally {
      setCreatingPlayer(false);
    }
  };

  const refreshDivisions = async () => {
    const divisionList = await listDivisions(adminFetchList, leagueId);
    setDivisions(divisionList);
  };

  const handleAddExistingEntrant = async (event: FormEvent) => {
    event.preventDefault();

    if (!entrantDivisionId || !entrantSelectedPlayerId) {
      toast('Choose a division and player', 'error');
      return;
    }

    setAddingEntrant(true);

    try {
      await addDivisionEntrant(adminFetch, leagueId, entrantDivisionId, {
        playerId: entrantSelectedPlayerId,
      });
      setEntrantSelectedPlayerId('');
      await refreshDivisions();
      toast('Player added to division', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not add entrant', 'error');
    } finally {
      setAddingEntrant(false);
    }
  };

  const handleAddNewEntrant = async (event: FormEvent) => {
    event.preventDefault();

    if (!entrantDivisionId || !entrantNewName.trim()) {
      toast('Division and player name are required', 'error');
      return;
    }

    setAddingEntrant(true);

    try {
      await addDivisionEntrant(adminFetch, leagueId, entrantDivisionId, {
        name: entrantNewName.trim(),
        email: entrantNewEmail.trim() || undefined,
      });
      setEntrantNewName('');
      setEntrantNewEmail('');
      await Promise.all([refreshDivisions(), loadData()]);
      toast('Player created and added to division', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not add entrant', 'error');
    } finally {
      setAddingEntrant(false);
    }
  };

  const handleRemoveEntrant = async (playerId: string) => {
    if (!entrantDivisionId) return;

    try {
      await removeDivisionEntrant(adminFetch, leagueId, entrantDivisionId, playerId);
      await refreshDivisions();
      toast('Player removed from division', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not remove entrant', 'error');
    }
  };

  const handleMoveEntrant = async (index: number, direction: 'up' | 'down') => {
    if (!entrantDivisionId) return;

    const division = divisions.find((item) => item._id === entrantDivisionId);
    const ids = [...(division?.playerIds ?? [])];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;

    if (swapIndex < 0 || swapIndex >= ids.length) {
      return;
    }

    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
    setReorderingEntrant(true);

    try {
      await reorderDivisionEntrants(adminFetch, leagueId, entrantDivisionId, ids);
      await refreshDivisions();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not reorder entrants', 'error');
    } finally {
      setReorderingEntrant(false);
    }
  };

  const handleLinkCaptain = async (event: FormEvent) => {
    event.preventDefault();

    if (!captainPlayerId || !captainAuth0Sub.trim() || !captainEmail.trim() || !captainName.trim()) {
      toast('Player, Auth0 sub, email, and name are required', 'error');
      return;
    }

    setLinkingCaptain(true);

    try {
      await linkCaptainUser(adminFetch, {
        playerId: captainPlayerId,
        auth0Sub: captainAuth0Sub.trim(),
        email: captainEmail.trim(),
        name: captainName.trim(),
      });
      setCaptainAuth0Sub('');
      setCaptainEmail('');
      setCaptainName('');
      toast('Captain login linked — they can sign in at /captain/login', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not link captain', 'error');
    } finally {
      setLinkingCaptain(false);
    }
  };

  const handleLinkPlayer = async (event: FormEvent) => {
    event.preventDefault();

    if (!playerLinkId || !playerAuth0Sub.trim() || !playerLinkEmail.trim() || !playerLinkName.trim()) {
      toast('Player, Auth0 sub, email, and name are required', 'error');
      return;
    }

    setLinkingPlayer(true);

    try {
      await linkPlayerUser(adminFetch, {
        playerId: playerLinkId,
        auth0Sub: playerAuth0Sub.trim(),
        email: playerLinkEmail.trim(),
        name: playerLinkName.trim(),
      });
      setPlayerAuth0Sub('');
      setPlayerLinkEmail('');
      setPlayerLinkName('');
      toast('Player login linked — they can sign in at /player/login', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not link player', 'error');
    } finally {
      setLinkingPlayer(false);
    }
  };

  const handleResolveDispute = async (matchId: string, payload: SportScoresheetPayload) => {
    setResolvingMatchId(matchId);

    try {
      await resolveDispute(adminFetch, leagueId, matchId, payload);
      await loadData();
      toast('Dispute resolved — match finalized', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not resolve dispute', 'error');
    } finally {
      setResolvingMatchId(null);
    }
  };

  const handleStaffFinalize = async (matchId: string, payload: SportScoresheetPayload) => {
    setFinalizingMatchId(matchId);

    try {
      await finalizeAdminMatch(adminFetch, leagueId, matchId, payload);
      await loadData();
      toast('Match result saved', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save match result', 'error');
    } finally {
      setFinalizingMatchId(null);
    }
  };

  const handleRecalculateStandings = async () => {
    setRecalculatingStandings(true);

    try {
      const updated = await recalculateStandings(adminFetch, leagueId);
      setStandings(updated);
      toast('Standings recalculated', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not recalculate standings', 'error');
    } finally {
      setRecalculatingStandings(false);
    }
  };

  const handleCsvImport = async (event: FormEvent) => {
    event.preventDefault();

    if (!importCsv.trim()) {
      toast('Paste CSV content or upload a file first', 'error');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const result = await importLeagueCsv(adminFetch, leagueId, {
        type: importType,
        csv: importCsv,
        defaultDivisionName: 'Division 1',
      });
      await loadData();
      setImportResult(
        `${formatImportFormatLabel(result.format)} format — created ${result.created}, updated ${result.updated}, skipped ${result.skipped}` +
          (result.errors.length ? ` — ${result.errors.length} error(s)` : '')
      );
      setDetectedImportFormat(result.format);
      toast('CSV import complete', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleCsvFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setImportCsv(text);
    setDetectedImportFormat(detectCsvImportFormat(text));
  };

  const handleImportCsvChange = (value: string) => {
    setImportCsv(value);
    setDetectedImportFormat(detectCsvImportFormat(value));
  };

  const matchesByRound = useMemo(() => {
    const grouped = new Map<number, MatchListItem[]>();

    for (const match of matches) {
      const roundMatches = grouped.get(match.roundNumber) ?? [];
      roundMatches.push(match);
      grouped.set(match.roundNumber, roundMatches);
    }

    return [...grouped.entries()].sort(([a], [b]) => a - b);
  }, [matches]);

  const divisionById = useMemo(
    () => Object.fromEntries(divisions.map((division) => [division._id, division])),
    [divisions]
  );

  if (loading) {
    return <p className={styles.loading}>Loading league…</p>;
  }

  if (!league) {
    return (
      <div>
        <p className={styles.loading}>League not found.</p>
        <Link to="/admin/leagues" className="btn btn-outline">
          Back to leagues
        </Link>
      </div>
    );
  }

  const divisionNameById = Object.fromEntries(divisions.map((d) => [d._id, d.name]));
  const playerNameById = Object.fromEntries(players.map((p) => [p._id, p.name]));
  const playerById = Object.fromEntries(players.map((p) => [p._id, p]));

  const formatHandicapSummary = (rules?: PoolHandicapRules): string | null => {
    if (!rules || rules.system === 'none') {
      return null;
    }

    const range = rules.skillLevelRange
      ? `${rules.skillLevelRange[0]}–${rules.skillLevelRange[1]}`
      : '—';
    const perLevel =
      rules.handicapPerSkillLevel !== undefined ? `${rules.handicapPerSkillLevel} pts/level` : '';

    return `${POOL_HANDICAP_SYSTEM_LABELS[rules.system]} · SL ${range}${perLevel ? ` · ${perLevel}` : ''}`;
  };

  const isCaptainLinked = (team: Team): boolean => {
    if (!team.captainPlayerId) {
      return false;
    }

    return Boolean(playerById[team.captainPlayerId]?.auth0Sub);
  };

  const captainInviteBlockedReason = (team: Team): string | null => {
    if (!team.captainPlayerId) {
      return 'Assign a captain first';
    }

    if (isCaptainLinked(team)) {
      return null;
    }

    const captain = playerById[team.captainPlayerId];

    if (!captain?.email?.trim()) {
      return 'Add captain email in Players section';
    }

    return null;
  };
  const teamsInScheduleDivision = teams.filter((team) => team.divisionId === scheduleDivisionId);
  const scheduleDivision = divisions.find((division) => division._id === scheduleDivisionId);
  const entrantsInScheduleDivision = scheduleDivision?.playerIds?.length ?? 0;
  const activeEntrantDivision = divisions.find((division) => division._id === entrantDivisionId);
  const divisionEntrantIds = activeEntrantDivision?.playerIds ?? [];
  const availableEntrantPlayers = players.filter(
    (player) => !divisionEntrantIds.includes(player._id)
  );

  const leagueKind = resolveLeagueKind(league.kind);
  const leagueEntrantType = resolveEntrantType(league.entrantType);
  const isDarts501SinglesTournament =
    leagueKind === 'tournament' && leagueEntrantType === 'player' && league.sport === 'darts';
  const isPool9BallSinglesTournament =
    leagueKind === 'tournament' && leagueEntrantType === 'player' && league.sport === 'pool';

  const scheduleHelpText =
    league.format === 'ladder'
      ? leagueEntrantType === 'player'
        ? 'Ladder pairings rotate the player list each round and match bottom vs top rungs. Odd entrant counts get one bye per round.'
        : 'Ladder pairings rotate the team list each round and match bottom vs top rungs. Odd team counts get one bye per round.'
      : league.format === 'bracket'
        ? isDarts501SinglesTournament
          ? 'Singles knockout — 501, first to 2 legs. Player order is the bracket seed (#1 is top seed). The bracket pads to the next power of eight with byes when needed.'
          : isPool9BallSinglesTournament
            ? 'Singles knockout — 9-ball, race to 5 games. Player order is the bracket seed (#1 is top seed). The bracket pads to the next power of eight with byes when needed.'
            : leagueEntrantType === 'player'
            ? 'Single-elimination bracket seeded by player order. The bracket pads to the next power of two — top seeds receive byes when needed.'
            : 'Single-elimination bracket seeded by team name order. The bracket pads to the next power of two — top seeds receive byes when needed.'
        : 'Round-robin pairings for the selected division. Each round is spaced by the interval below. Odd entrant counts get one bye per round.';

  return (
    <div>
      <Link to="/admin/leagues" className={styles.backLink}>
        ← All leagues
      </Link>

      <h1 className={formStyles.pageTitle}>{league.name}</h1>
      <p className={styles.meta}>
        {KIND_LABELS[leagueKind]} · {SPORT_LABELS[league.sport]} · {FORMAT_LABELS[league.format]} ·{' '}
        {ENTRANT_TYPE_LABELS[leagueEntrantType]} · {STATUS_LABELS[league.status]}
        {league.sport === 'pool' && league.poolFormat
          ? ` · ${POOL_FORMAT_LABELS[league.poolFormat]}`
          : ''}{' '}
        · {league.divisionCount} division
        {league.divisionCount === 1 ? '' : 's'}
        {leagueEntrantType === 'team'
          ? ` · ${league.teamCount} team${league.teamCount === 1 ? '' : 's'}`
          : ''}
      </p>

      {league.sport === 'pool' && canWriteLeagues ? (
        <section className={`${formStyles.panel} ${styles.section}`}>
          <h2 className={formStyles.sectionTitle}>Pool format</h2>
          <p className={styles.help}>
            Default game type for new schedules. Existing matches keep their saved format.
          </p>
          <form className={styles.formGrid} onSubmit={handleSavePoolFormat}>
            <div>
              <label className={formStyles.fieldLabel} htmlFor="league-pool-format">
                Game type
              </label>
              <select
                id="league-pool-format"
                className={formStyles.select}
                value={poolFormat}
                onChange={(e) => setPoolFormat(e.target.value as PoolFormat)}
              >
                {POOL_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {POOL_FORMAT_LABELS[format]}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className="btn btn-green" disabled={savingPoolFormat}>
                {savingPoolFormat ? 'Saving…' : 'Save pool format'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {!canWriteLeagues ? (
        <p className={styles.help}>View only — you can browse leagues but cannot make changes.</p>
      ) : null}

      {isPool9BallSinglesTournament && canWriteLeagues ? (
        <section className={`${formStyles.panel} ${styles.section}`}>
          <h2 className={formStyles.sectionTitle}>Singles knockout</h2>
          <p className={styles.help}>
            Run a 9-ball singles tournament without teams. Add a division, add players in seed
            order, generate the bracket (race to 5 games), then link player logins so they can
            submit scores at <a href="/player/login">/player/login</a>.
          </p>
        </section>
      ) : null}

      {isDarts501SinglesTournament && canWriteLeagues ? (
        <section className={`${formStyles.panel} ${styles.section}`}>
          <h2 className={formStyles.sectionTitle}>Singles knockout</h2>
          <p className={styles.help}>
            Run a Saturday 501 tournament without teams. Add a division, add players in seed
            order, generate the bracket, then link player logins so they can submit scores at{' '}
            <a href="/player/login">/player/login</a>.
          </p>
        </section>
      ) : null}

      <section className={`${formStyles.panel} ${styles.section}`}>
        <h2 className={formStyles.sectionTitle}>Divisions</h2>
        <p className={styles.help}>
          Skill flights or tiers within this league (e.g. A Flight, Division 1).
        </p>

        {divisions.length === 0 ? (
          <p className={styles.empty}>No divisions yet.</p>
        ) : (
          <ul className={styles.itemList}>
            {divisions.map((division) => (
              <li key={division._id} className={styles.itemRow}>
                <div>
                  <span>{division.name}</span>
                  {league.sport === 'pool' && formatHandicapSummary(division.handicapRules) ? (
                    <span className={styles.handicapSummary}>
                      {formatHandicapSummary(division.handicapRules)}
                    </span>
                  ) : null}
                </div>
                {canWriteLeagues ? (
                <button
                  type="button"
                  className={formStyles.btnDanger}
                  onClick={() => handleDeleteDivision(division)}
                >
                  Delete
                </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canWriteLeagues ? (
        <form className={styles.inlineForm} onSubmit={handleAddDivision}>
          <input
            className={formStyles.input}
            value={divisionName}
            onChange={(e) => setDivisionName(e.target.value)}
            placeholder="New division name"
            maxLength={80}
          />
          <button type="submit" className="btn btn-green" disabled={addingDivision}>
            {addingDivision ? 'Adding…' : 'Add division'}
          </button>
        </form>
        ) : null}
      </section>

      {league.sport === 'pool' && divisions.length > 0 && canWriteLeagues ? (
        <section className={`${formStyles.panel} ${styles.section}`}>
          <h2 className={formStyles.sectionTitle}>Pool handicap rules</h2>
          <p className={styles.help}>
            Store APA or VNEA handicap settings for pilot leagues. Standings still use wins,
            losses, and ties only until v1.1.
          </p>
          <form className={styles.formGrid} onSubmit={handleSaveHandicapRules}>
            <div>
              <label className={formStyles.fieldLabel} htmlFor="handicap-division">
                Division
              </label>
              <select
                id="handicap-division"
                className={formStyles.select}
                value={handicapDivisionId}
                onChange={(e) => setHandicapDivisionId(e.target.value)}
              >
                {divisions.map((division) => (
                  <option key={division._id} value={division._id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="handicap-system">
                Handicap system
              </label>
              <select
                id="handicap-system"
                className={formStyles.select}
                value={handicapSystem}
                onChange={(e) => setHandicapSystem(e.target.value as PoolHandicapSystem)}
              >
                {POOL_HANDICAP_SYSTEMS.map((system) => (
                  <option key={system} value={system}>
                    {POOL_HANDICAP_SYSTEM_LABELS[system]}
                  </option>
                ))}
              </select>
            </div>

            {handicapSystem !== 'none' ? (
              <>
                <div>
                  <label className={formStyles.fieldLabel} htmlFor="handicap-skill-min">
                    Skill level min
                  </label>
                  <input
                    id="handicap-skill-min"
                    type="number"
                    className={formStyles.input}
                    value={handicapSkillMin}
                    onChange={(e) => setHandicapSkillMin(e.target.value)}
                    min={1}
                    max={9}
                  />
                </div>

                <div>
                  <label className={formStyles.fieldLabel} htmlFor="handicap-skill-max">
                    Skill level max
                  </label>
                  <input
                    id="handicap-skill-max"
                    type="number"
                    className={formStyles.input}
                    value={handicapSkillMax}
                    onChange={(e) => setHandicapSkillMax(e.target.value)}
                    min={1}
                    max={9}
                  />
                </div>

                <div>
                  <label className={formStyles.fieldLabel} htmlFor="handicap-per-level">
                    Handicap points per skill level
                  </label>
                  <input
                    id="handicap-per-level"
                    type="number"
                    className={formStyles.input}
                    value={handicapPerLevel}
                    onChange={(e) => setHandicapPerLevel(e.target.value)}
                    min={0}
                    step={0.5}
                  />
                </div>
              </>
            ) : null}

            <div className={styles.formActions}>
              <button type="submit" className="btn btn-green" disabled={savingHandicapRules}>
                {savingHandicapRules ? 'Saving…' : 'Save handicap rules'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className={`${formStyles.panel} ${styles.section}`}>
        <h2 className={formStyles.sectionTitle}>
          {isDarts501SinglesTournament || isPool9BallSinglesTournament
            ? 'Add players'
            : leagueEntrantType === 'player'
              ? 'Division entrants'
              : 'Teams'}
        </h2>
        {leagueEntrantType === 'player' ? (
          <>
            <p className={styles.help}>
              {isDarts501SinglesTournament || isPool9BallSinglesTournament
                ? 'Add each player to the division. List order is bracket seed — #1 is top seed. Players submit scores at /player/login once linked.'
                : `Add individual players to each division. List order is bracket seed order — #1 is top seed. Players can view this ${leagueKind === 'tournament' ? 'tournament' : 'league'} at `}
              {!isDarts501SinglesTournament && !isPool9BallSinglesTournament ? (
                <>
                  <a href="/player/login">/player/login</a> once their login is linked.
                </>
              ) : null}
            </p>

            {divisions.length === 0 ? (
              <p className={styles.empty}>Add a division first, then add entrants.</p>
            ) : (
              <>
                <div>
                  <label className={formStyles.fieldLabel} htmlFor="entrant-division">
                    Division
                  </label>
                  <select
                    id="entrant-division"
                    className={formStyles.select}
                    value={entrantDivisionId}
                    onChange={(e) => setEntrantDivisionId(e.target.value)}
                  >
                    {divisions.map((division) => (
                      <option key={division._id} value={division._id}>
                        {division.name}
                      </option>
                    ))}
                  </select>
                </div>

                {divisionEntrantIds.length === 0 ? (
                  <p className={styles.empty}>No entrants in this division yet.</p>
                ) : (
                  <ol className={styles.entrantList}>
                    {divisionEntrantIds.map((playerId, index) => (
                      <li key={playerId} className={styles.entrantRow}>
                        <span className={styles.entrantSeed}>#{index + 1}</span>
                        <span className={styles.entrantName}>
                          {playerNameById[playerId] ?? 'Unknown player'}
                        </span>
                        {canWriteLeagues ? (
                          <div className={styles.entrantActions}>
                            <button
                              type="button"
                              className="btn btn-outline"
                              disabled={reorderingEntrant || index === 0}
                              onClick={() => handleMoveEntrant(index, 'up')}
                              aria-label="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline"
                              disabled={
                                reorderingEntrant || index === divisionEntrantIds.length - 1
                              }
                              onClick={() => handleMoveEntrant(index, 'down')}
                              aria-label="Move down"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className={formStyles.btnDanger}
                              onClick={() => handleRemoveEntrant(playerId)}
                            >
                              Remove
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}

                {canWriteLeagues ? (
                  <>
                    <form className={styles.inlineForm} onSubmit={handleAddExistingEntrant}>
                      <select
                        className={formStyles.select}
                        value={entrantSelectedPlayerId}
                        onChange={(e) => setEntrantSelectedPlayerId(e.target.value)}
                      >
                        <option value="">Select existing player</option>
                        {availableEntrantPlayers.map((player) => (
                          <option key={player._id} value={player._id}>
                            {player.name}
                            {player.email ? ` (${player.email})` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="btn btn-green"
                        disabled={addingEntrant || !entrantSelectedPlayerId}
                      >
                        {addingEntrant ? 'Adding…' : 'Add player'}
                      </button>
                    </form>

                    <form className={styles.entrantCreateForm} onSubmit={handleAddNewEntrant}>
                      <input
                        className={formStyles.input}
                        value={entrantNewName}
                        onChange={(e) => setEntrantNewName(e.target.value)}
                        placeholder="New player name"
                        maxLength={120}
                      />
                      <input
                        className={formStyles.input}
                        value={entrantNewEmail}
                        onChange={(e) => setEntrantNewEmail(e.target.value)}
                        placeholder="Email (for player login)"
                        type="email"
                      />
                      <button
                        type="submit"
                        className="btn btn-outline"
                        disabled={addingEntrant || !entrantNewName.trim()}
                      >
                        {addingEntrant ? 'Adding…' : 'Create & add'}
                      </button>
                    </form>
                  </>
                ) : null}
              </>
            )}
          </>
        ) : (
          <>
            <p className={styles.help}>
              Assign a captain to each team, add players to the roster, then invite captains or link
              player logins. Players view standings at <a href="/player/login">/player/login</a>.
            </p>

            {teams.length === 0 ? (
              <p className={styles.empty}>No teams yet.</p>
            ) : (
          <ul className={styles.itemList}>
            {teams.map((team) => (
              <li key={team._id} className={styles.teamRow}>
                <div>
                  <strong>{team.name}</strong>
                  <span className={styles.teamDivision}>
                    {divisionNameById[team.divisionId] ?? 'Unknown division'}
                  </span>
                </div>
                <div className={styles.teamCaptain}>
                  <label className={formStyles.fieldLabel} htmlFor={`captain-${team._id}`}>
                    Captain
                  </label>
                  <select
                    id={`captain-${team._id}`}
                    className={formStyles.select}
                    value={team.captainPlayerId ?? ''}
                    onChange={(e) => handleAssignCaptain(team, e.target.value)}
                    disabled={!canWriteLeagues}
                  >
                    <option value="">Unassigned</option>
                    {players.map((player) => (
                      <option key={player._id} value={player._id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                  {team.captainPlayerId ? (
                    <span className={styles.fieldNote}>
                      {playerNameById[team.captainPlayerId] ?? 'Captain'}
                      {playerById[team.captainPlayerId]?.email
                        ? ` · ${playerById[team.captainPlayerId]?.email}`
                        : ' · no email'}
                    </span>
                  ) : null}
                  {canWriteLeagues ? (
                    <div className={styles.teamInvite}>
                      {isCaptainLinked(team) ? (
                        <span className={styles.linkedBadge}>Linked</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline"
                          disabled={
                            invitingTeamId === team._id ||
                            Boolean(captainInviteBlockedReason(team))
                          }
                          title={captainInviteBlockedReason(team) ?? undefined}
                          onClick={() => handleInviteCaptain(team)}
                        >
                          {invitingTeamId === team._id ? 'Inviting…' : 'Invite captain'}
                        </button>
                      )}
                      {inviteResults[team._id] && !inviteResults[team._id].alreadyLinked ? (
                        <details className={styles.inviteDetails}>
                          <summary>Invite email for {inviteResults[team._id].playerName}</summary>
                          <p className={styles.fieldNote}>
                            Subject: {inviteResults[team._id].emailSubject}
                          </p>
                          <pre className={styles.inviteEmailBody}>
                            {inviteResults[team._id].emailBody}
                          </pre>
                        </details>
                      ) : null}
                    </div>
                  ) : null}
                  <label className={formStyles.fieldLabel} htmlFor={`roster-${team._id}`}>
                    Roster
                  </label>
                  <select
                    id={`roster-${team._id}`}
                    className={`${formStyles.select} ${styles.rosterSelect}`}
                    multiple
                    value={team.playerIds}
                    onChange={(e) =>
                      handleUpdateRoster(
                        team,
                        Array.from(e.target.selectedOptions, (option) => option.value)
                      )
                    }
                    disabled={!canWriteLeagues}
                  >
                    {players.map((player) => (
                      <option key={player._id} value={player._id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                  <span className={styles.fieldNote}>
                    {team.playerIds.length} player{team.playerIds.length === 1 ? '' : 's'} on roster
                  </span>
                </div>
                {canWriteLeagues ? (
                <button
                  type="button"
                  className={formStyles.btnDanger}
                  onClick={() => handleDeleteTeam(team)}
                >
                  Delete
                </button>
                ) : null}
              </li>
            ))}
          </ul>
            )}

        {leagueEntrantType === 'team' && canWriteLeagues ? (
        <form className={styles.teamForm} onSubmit={handleAddTeam}>
          <input
            className={formStyles.input}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Team name"
            maxLength={120}
          />
          <select
            className={formStyles.select}
            value={teamDivisionId}
            onChange={(e) => setTeamDivisionId(e.target.value)}
            disabled={divisions.length === 0}
          >
            {divisions.length === 0 ? (
              <option value="">Add a division first</option>
            ) : (
              divisions.map((division) => (
                <option key={division._id} value={division._id}>
                  {division.name}
                </option>
              ))
            )}
          </select>
          <button
            type="submit"
            className="btn btn-green"
            disabled={addingTeam || divisions.length === 0}
          >
            {addingTeam ? 'Adding…' : 'Add team'}
          </button>
        </form>
        ) : null}
          </>
        )}
      </section>

      {canWriteLeagues ? (
      <section className={`${formStyles.panel} ${styles.section}`}>
        <h2 className={formStyles.sectionTitle}>Players & captain logins</h2>
        <p className={styles.help}>
          {leagueEntrantType === 'player'
            ? 'Register venue players and link logins for the player portal. Division entrant lists are managed above.'
            : 'Add players with email addresses. Assign them to team rosters above. Captains use '}
          {leagueEntrantType === 'team' ? (
            <>
              <a href="/captain/login">/captain/login</a>; roster players use{' '}
              <a href="/player/login">/player/login</a>. Advanced forms below are for manual Auth0
              sub paste.
            </>
          ) : (
            <>
              Use <a href="/player/login">/player/login</a> for read-only standings. Advanced
              forms below are for manual Auth0 sub paste.
            </>
          )}
        </p>

        <form className={styles.inlineForm} onSubmit={handleCreatePlayer}>
          <input
            className={formStyles.input}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Player name"
            maxLength={120}
          />
          <input
            className={formStyles.input}
            value={playerEmail}
            onChange={(e) => setPlayerEmail(e.target.value)}
            placeholder="Email (required for captain invites)"
            type="email"
          />
          <button type="submit" className="btn btn-green" disabled={creatingPlayer}>
            {creatingPlayer ? 'Adding…' : 'Add player'}
          </button>
        </form>

        {leagueEntrantType === 'team' && players.length > 0 ? (
          <form className={styles.captainLinkForm} onSubmit={handleLinkCaptain}>
            <select
              className={formStyles.select}
              value={captainPlayerId}
              onChange={(e) => setCaptainPlayerId(e.target.value)}
            >
              {players.map((player) => (
                <option key={player._id} value={player._id}>
                  {player.name}
                </option>
              ))}
            </select>
            <input
              className={formStyles.input}
              value={captainAuth0Sub}
              onChange={(e) => setCaptainAuth0Sub(e.target.value)}
              placeholder="Auth0 sub (e.g. auth0|abc123)"
            />
            <input
              className={formStyles.input}
              value={captainEmail}
              onChange={(e) => setCaptainEmail(e.target.value)}
              placeholder="Captain email"
              type="email"
            />
            <input
              className={formStyles.input}
              value={captainName}
              onChange={(e) => setCaptainName(e.target.value)}
              placeholder="Captain display name"
            />
            <button type="submit" className="btn btn-green" disabled={linkingCaptain}>
              {linkingCaptain ? 'Linking…' : 'Link captain login'}
            </button>
          </form>
        ) : leagueEntrantType === 'team' ? (
          <p className={styles.empty}>Add a player before linking a captain login.</p>
        ) : null}

        {players.length > 0 ? (
          <form className={styles.captainLinkForm} onSubmit={handleLinkPlayer}>
            <select
              className={formStyles.select}
              value={playerLinkId}
              onChange={(e) => setPlayerLinkId(e.target.value)}
            >
              {players.map((player) => (
                <option key={player._id} value={player._id}>
                  {player.name}
                </option>
              ))}
            </select>
            <input
              className={formStyles.input}
              value={playerAuth0Sub}
              onChange={(e) => setPlayerAuth0Sub(e.target.value)}
              placeholder="Auth0 sub (e.g. auth0|abc123)"
            />
            <input
              className={formStyles.input}
              value={playerLinkEmail}
              onChange={(e) => setPlayerLinkEmail(e.target.value)}
              placeholder="Player email"
              type="email"
            />
            <input
              className={formStyles.input}
              value={playerLinkName}
              onChange={(e) => setPlayerLinkName(e.target.value)}
              placeholder="Player display name"
            />
            <button type="submit" className="btn btn-green" disabled={linkingPlayer}>
              {linkingPlayer ? 'Linking…' : 'Link player login'}
            </button>
          </form>
        ) : null}
      </section>
      ) : null}

      {canWriteLeagues ? (
      <section className={`${formStyles.panel} ${styles.section}`}>
        <h2 className={formStyles.sectionTitle}>
          {league.format === 'bracket' &&
          (isDarts501SinglesTournament || isPool9BallSinglesTournament)
            ? 'Generate bracket'
            : 'Generate schedule'}
        </h2>
        <p className={styles.help}>
          <strong>{FORMAT_LABELS[league.format]}</strong> — {scheduleHelpText}
        </p>

        {divisions.length === 0 ? (
          <p className={styles.empty}>
            {leagueEntrantType === 'player'
              ? 'Add a division and at least two players first.'
              : 'Add a division and at least two teams first.'}
          </p>
        ) : leagueEntrantType === 'player' && entrantsInScheduleDivision < 2 ? (
          <p className={styles.empty}>Add at least two players to the selected division first.</p>
        ) : leagueEntrantType === 'team' && teamsInScheduleDivision.length < 2 ? (
          <p className={styles.empty}>Add at least two teams to the selected division first.</p>
        ) : (
          <form className={styles.scheduleForm} onSubmit={handleGenerateSchedule}>
            <div>
              <label className={formStyles.fieldLabel} htmlFor="schedule-division">
                Division
              </label>
              <select
                id="schedule-division"
                className={formStyles.select}
                value={scheduleDivisionId}
                onChange={(e) => setScheduleDivisionId(e.target.value)}
              >
                {divisions.map((division) => (
                  <option key={division._id} value={division._id}>
                    {division.name}
                  </option>
                ))}
              </select>
              <p className={styles.fieldNote}>
                {leagueEntrantType === 'player'
                  ? `${entrantsInScheduleDivision} player${entrantsInScheduleDivision === 1 ? '' : 's'} in this division`
                  : `${teamsInScheduleDivision.length} team${teamsInScheduleDivision.length === 1 ? '' : 's'} in this division`}
              </p>
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="schedule-start">
                First match night
              </label>
              <input
                id="schedule-start"
                type="date"
                className={formStyles.input}
                value={scheduleStartDate}
                onChange={(e) => setScheduleStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="schedule-interval">
                Days between rounds
              </label>
              <input
                id="schedule-interval"
                type="number"
                min={1}
                max={30}
                className={formStyles.input}
                value={scheduleIntervalDays}
                onChange={(e) => setScheduleIntervalDays(e.target.value)}
              />
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="schedule-time">
                Match time
              </label>
              <input
                id="schedule-time"
                type="time"
                className={formStyles.input}
                value={scheduleMatchTime}
                onChange={(e) => setScheduleMatchTime(e.target.value)}
              />
            </div>

            {league.sport === 'volleyball' ? (
              <div>
                <label className={formStyles.fieldLabel} htmlFor="schedule-sets-to-win">
                  Match format
                </label>
                <select
                  id="schedule-sets-to-win"
                  className={formStyles.select}
                  value={scheduleSetsToWin}
                  onChange={(e) => setScheduleSetsToWin(e.target.value as '2' | '3')}
                >
                  <option value="2">Best of 3 (first to 2 sets)</option>
                  <option value="3">Best of 5 (first to 3 sets)</option>
                </select>
              </div>
            ) : null}

            {league.sport === 'pool' ? (
              <div>
                <label className={formStyles.fieldLabel} htmlFor="schedule-pool-format">
                  Pool format
                </label>
                <select
                  id="schedule-pool-format"
                  className={formStyles.select}
                  value={schedulePoolFormat}
                  onChange={(e) => setSchedulePoolFormat(e.target.value as PoolFormat)}
                >
                  {POOL_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {POOL_FORMAT_LABELS[format]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={scheduleReplaceExisting}
                onChange={(e) => setScheduleReplaceExisting(e.target.checked)}
              />
              Replace existing scheduled matches for this division
            </label>

            <div className={styles.formActions}>
              <button
                type="submit"
                className="btn btn-green"
                disabled={
                  generatingSchedule ||
                  (leagueEntrantType === 'player'
                    ? entrantsInScheduleDivision < 2
                    : teamsInScheduleDivision.length < 2)
                }
              >
                {generatingSchedule
                  ? 'Generating…'
                  : league.format === 'bracket'
                    ? 'Generate bracket'
                    : `Generate ${FORMAT_LABELS[league.format].toLowerCase()} schedule`}
              </button>
            </div>
          </form>
        )}
      </section>
      ) : null}

      <section className={`${formStyles.panel} ${styles.section}`}>
        <div className={styles.matchHeader}>
          <h2 className={formStyles.sectionTitle}>Match schedule</h2>
          {divisions.length > 0 ? (
            <select
              className={formStyles.select}
              value={matchFilterDivisionId}
              onChange={(e) => setMatchFilterDivisionId(e.target.value)}
              aria-label="Filter matches by division"
            >
              <option value="">All divisions</option>
              {divisions.map((division) => (
                <option key={division._id} value={division._id}>
                  {division.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {matches.length === 0 ? (
          <p className={styles.empty}>No matches scheduled yet.</p>
        ) : (
          <div className={styles.roundList}>
            {matchesByRound.map(([roundNumber, roundMatches]) => (
              <div key={roundNumber} className={styles.roundBlock}>
                <h3 className={styles.roundTitle}>Round {roundNumber}</h3>
                <ul className={styles.matchList}>
                  {roundMatches.map((match) => (
                    <li key={match._id} className={styles.matchRow}>
                      <div className={styles.matchTeams}>
                        <span className={styles.matchTeamName}>
                          {match.homePlayerName ?? match.homeTeamName}
                        </span>
                        <span className={styles.matchVs}>vs</span>
                        <span className={styles.matchTeamName}>
                          {match.awayPlayerName ?? match.awayTeamName}
                        </span>
                      </div>
                      <div className={styles.matchMeta}>
                        <span>{formatMatchDate(match.scheduledAt)}</span>
                        <span className={styles.matchDivision}>{match.divisionName}</span>
                        <span className={styles.matchStatus}>
                          {MATCH_STATUS_LABELS[match.status]}
                          {match.raceTo && league.sport === 'pool' ? ` · Race to ${match.raceTo}` : ''}
                          {poolHandicapBadge(
                            divisionById[match.divisionId]?.handicapRules?.system
                          )
                            ? ` · ${poolHandicapBadge(divisionById[match.divisionId]?.handicapRules?.system)}`
                            : ''}
                          {match.status === 'final' && match.result
                            ? ` · ${match.result.homeScore}–${match.result.awayScore}`
                            : ''}
                        </span>
                      </div>
                      {canWriteLeagues &&
                      leagueEntrantType === 'player' &&
                      match.homePlayerId &&
                      match.status !== 'final' &&
                      match.status !== 'cancelled' ? (
                        <div className={styles.staffFinalize}>
                          <span className={styles.staffFinalizeLabel}>Staff enter result</span>
                          <DisputeResolveForm
                            matchId={match._id}
                            sport={match.sport}
                            resolving={finalizingMatchId === match._id}
                            onResolve={handleStaffFinalize}
                            submitLabel="Save result"
                            playerPool={leagueEntrantType === 'player' && match.sport === 'pool'}
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={`${formStyles.panel} ${styles.section}`}>
        <div className={styles.matchHeader}>
          <h2 className={formStyles.sectionTitle}>Standings</h2>
          {canWriteLeagues ? (
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleRecalculateStandings}
            disabled={recalculatingStandings || divisions.length === 0}
          >
            {recalculatingStandings ? 'Recalculating…' : 'Recalculate'}
          </button>
          ) : null}
        </div>
        <p className={styles.help}>
          {leagueKind === 'tournament' && league.format === 'bracket'
            ? 'Bracket placement — updated automatically when matches are finalized.'
            : 'Updated automatically when captains finalize a match. Win = 2 pts, tie = 1 pt.'}
        </p>

        {standings.length === 0 || standings.every((view) => view.entries.length === 0) ? (
          <p className={styles.empty}>
            {leagueKind === 'tournament' && league.format === 'bracket'
              ? 'No placements yet — finalize a match to assign bracket positions.'
              : 'No standings yet — finalize a match or add teams to a division.'}
          </p>
        ) : (
          <div className={styles.standingsList}>
            {standings.map((view) =>
              view.entries.length === 0 ? null : (
                <div key={view.divisionId} className={styles.standingsBlock}>
                  <h3 className={styles.roundTitle}>{view.divisionName}</h3>
                  <table className={styles.standingsTable}>
                    <thead>
                      <tr>
                        {isPlacementStandings(view.standingsType) ? (
                          <>
                            <th>Place</th>
                            <th>{leagueEntrantType === 'player' ? 'Player' : 'Team'}</th>
                          </>
                        ) : (
                          <>
                            <th>#</th>
                            <th>Team</th>
                            <th>W</th>
                            <th>L</th>
                            <th>T</th>
                            <th>Pts</th>
                            <th>GP</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {view.entries.map((entry) => (
                        <tr key={entry.playerId ?? entry.teamId ?? entry.teamName}>
                          {isPlacementStandings(view.standingsType) ? (
                            <>
                              <td>{formatPlacement(entry.placement ?? entry.rank)}</td>
                              <td>{entry.playerName ?? entry.teamName}</td>
                            </>
                          ) : (
                            <>
                              <td>{entry.rank}</td>
                              <td>{entry.teamName}</td>
                              <td>{entry.wins}</td>
                              <td>{entry.losses}</td>
                              <td>{entry.ties}</td>
                              <td>{entry.points}</td>
                              <td>{entry.gamesPlayed}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {disputes.length > 0 ? (
        <section className={`${formStyles.panel} ${styles.section} ${styles.disputePanel}`}>
          <h2 className={formStyles.sectionTitle}>Score disputes</h2>
          <p className={styles.help}>
            Captains entered different scores. Enter the correct result to finalize the match.
          </p>
          <ul className={styles.itemList}>
            {disputes.map((dispute) => {
              const sport = league?.sport ?? 'pool';
              const homeSummary = dispute.scoresheets.home
                ? formatScoresheetSummary(dispute.scoresheets.home.payload, sport)
                : null;
              const awaySummary = dispute.scoresheets.away
                ? formatScoresheetSummary(dispute.scoresheets.away.payload, sport)
                : null;

              return (
                <li key={dispute.match._id} className={styles.disputeRow}>
                  <div>
                    <strong>
                      {dispute.homeTeamName} vs {dispute.awayTeamName}
                    </strong>
                    <p className={styles.fieldNote}>
                      Home captain:{' '}
                      {homeSummary ? `${homeSummary.home}–${homeSummary.away}` : '—'} · Away
                      captain:{' '}
                      {awaySummary ? `${awaySummary.home}–${awaySummary.away}` : '—'}
                    </p>
                  </div>
                  {canWriteLeagues ? (
                  <DisputeResolveForm
                    matchId={dispute.match._id}
                    sport={sport}
                    resolving={resolvingMatchId === dispute.match._id}
                    onResolve={handleResolveDispute}
                  />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {canWriteLeagues ? (
      <section className={`${formStyles.panel} ${styles.section}`}>
        <h2 className={formStyles.sectionTitle}>Import from CSV</h2>
        <p className={styles.help}>
          Migrate CompuSport or spreadsheet data. Import order: teams → players → schedule →
          historical results. See <code>docs/leagues/CSV_IMPORT.md</code> for column format.
        </p>

        <form className={styles.importForm} onSubmit={handleCsvImport}>
          <div>
            <label className={formStyles.fieldLabel} htmlFor="import-type">
              Import type
            </label>
            <select
              id="import-type"
              className={formStyles.select}
              value={importType}
              onChange={(e) => setImportType(e.target.value as CsvImportType)}
            >
              <option value="teams">Teams</option>
              <option value="players">Players</option>
              <option value="schedule">Schedule</option>
              <option value="results">Match results (historical)</option>
            </select>
          </div>

          <div className={styles.fullWidth}>
            <label className={formStyles.fieldLabel} htmlFor="import-csv">
              CSV content
            </label>
            <textarea
              id="import-csv"
              className={formStyles.textarea}
              value={importCsv}
              onChange={(e) => handleImportCsvChange(e.target.value)}
              placeholder={
                importType === 'results'
                  ? 'divisionName,homeTeamName,awayTeamName,scheduledAt,homeScore,awayScore,status&#10;A Flight,Shark Attack,Cue Masters,2026-03-10,5,3,final'
                  : 'division,team&#10;A Flight,Shark Attack'
              }
              rows={8}
            />
            {detectedImportFormat ? (
              <p className={styles.fieldNote}>
                Detected format: <strong>{formatImportFormatLabel(detectedImportFormat)}</strong>
              </p>
            ) : null}
          </div>

          <div className={styles.fullWidth}>
            <label className={formStyles.fieldLabel} htmlFor="import-file">
              Or upload a .csv file
            </label>
            <input
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              className={formStyles.input}
              onChange={(e) => handleCsvFile(e.target.files?.[0])}
            />
          </div>

          {importResult ? <p className={styles.fieldNote}>{importResult}</p> : null}

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-green" disabled={importing}>
              {importing ? 'Importing…' : 'Run import'}
            </button>
          </div>
        </form>
      </section>
      ) : null}
    </div>
  );
}

export default LeagueDetailPage;
