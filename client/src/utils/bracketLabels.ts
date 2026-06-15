/** Plain-English bracket round label from round index and total rounds. */
export function bracketRoundLabel(roundNumber: number, totalRounds: number): string {
  if (totalRounds <= 0) {
    return `Round ${roundNumber}`;
  }

  const roundsFromFinal = totalRounds - roundNumber;

  if (roundsFromFinal === 0) {
    return 'Final';
  }

  if (roundsFromFinal === 1) {
    return 'Semifinal';
  }

  if (roundsFromFinal === 2) {
    return 'Quarterfinal';
  }

  return `Round ${roundNumber}`;
}
