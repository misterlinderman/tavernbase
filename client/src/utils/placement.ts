export type StandingsType = 'season' | 'placement';

export function formatPlacement(placement: number): string {
  const mod100 = placement % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${placement}th`;
  }

  switch (placement % 10) {
    case 1:
      return `${placement}st`;
    case 2:
      return `${placement}nd`;
    case 3:
      return `${placement}rd`;
    default:
      return `${placement}th`;
  }
}

export function isPlacementStandings(standingsType?: StandingsType): boolean {
  return standingsType === 'placement';
}
