/**
 * Assertion script for CompuSport CSV alias detection and mapping.
 * Run: npx ts-node server/src/scripts/verifyCompusportImport.ts
 */
import fs from 'fs';
import path from 'path';
import { pickField } from '../services/leagues/import/parseCsv';
import {
  detectImportFormat,
  mapHeaderToCanonical,
  prepareCsvRecords,
} from '../services/leagues/import/compusportAliases';

const FIXTURES_DIR = path.resolve(__dirname, '../__fixtures__/compusport');

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
}

function run(): void {
  const teamsCsv = readFixture('teams.compusport.csv');
  const playersCsv = readFixture('players.compusport.csv');
  const scheduleCsv = readFixture('schedule.compusport.csv');

  assert(detectImportFormat(['DivnID', 'TeamName']) === 'compusport', 'teams format detect');
  assert(detectImportFormat(['division', 'team']) === 'canonical', 'canonical teams detect');

  const teamsPrepared = prepareCsvRecords(teamsCsv);
  assert(teamsPrepared.format === 'compusport', 'teams prepared format');
  assert(teamsPrepared.records.length === 3, 'teams record count');
  assert(
    pickField(teamsPrepared.records[0], ['team']) === 'Shark Attack',
    'teams team field mapped'
  );
  assert(
    pickField(teamsPrepared.records[0], ['division']) === 'A Flight',
    'teams division field mapped'
  );

  const playersPrepared = prepareCsvRecords(playersCsv);
  assert(playersPrepared.format === 'compusport', 'players prepared format');
  assert(
    pickField(playersPrepared.records[0], ['name']) === 'Alex Player',
    'players name mapped'
  );
  assert(
    pickField(playersPrepared.records[0], ['captain']).toLowerCase() === 'yes',
    'players captain mapped'
  );

  const schedulePrepared = prepareCsvRecords(scheduleCsv);
  assert(schedulePrepared.format === 'compusport', 'schedule prepared format');
  assert(
    pickField(schedulePrepared.records[0], ['home']) === 'Shark Attack',
    'schedule home mapped'
  );
  assert(
    pickField(schedulePrepared.records[0], ['date']) === '2026-03-10',
    'schedule date mapped'
  );
  assert(pickField(schedulePrepared.records[0], ['round']) === '1', 'schedule round mapped');

  assert(mapHeaderToCanonical('HomeTeam') === 'home', 'header alias HomeTeam');
  assert(mapHeaderToCanonical('division') === 'division', 'canonical header passthrough');

  const canonicalCsv = 'division,team\nA Flight,Shark Attack\n';
  const canonicalPrepared = prepareCsvRecords(canonicalCsv);
  assert(canonicalPrepared.format === 'canonical', 'canonical csv unchanged');
  assert(canonicalPrepared.records.length === 1, 'canonical record count');

  console.log('CompuSport import alias checks passed');
}

run();
