import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const skillDir = join(rootDir, 'vendor', 'haizei-worldcup-2026-skill');
const scriptDir = join(skillDir, 'scripts');
const outFile = join(rootDir, 'data', 'snapshot.json');
const minFreshScheduleMatches = 10;

function sampleMatches() {
  return [
    {
      matchId: 'sample-brazil-morocco',
      date: '2026-06-14',
      time: '06:00',
      stage: '小组赛C组第1轮',
      group: 'C',
      homeTeam: '巴西',
      awayTeam: '摩洛哥',
      status: '未开赛',
      hot: 51,
      scoreLine: '-'
    },
    {
      matchId: 'sample-qatar-switzerland',
      date: '2026-06-14',
      time: '03:00',
      stage: '小组赛B组第1轮',
      group: 'B',
      homeTeam: '卡塔尔',
      awayTeam: '瑞士',
      status: '未开赛',
      hot: 21,
      scoreLine: '-'
    },
    {
      matchId: 'sample-usa-paraguay',
      date: '2026-06-13',
      time: '09:00',
      stage: '小组赛D组第1轮',
      group: 'D',
      homeTeam: '美国',
      awayTeam: '巴拉圭',
      status: '已结束',
      hot: 48,
      scoreLine: '4-1'
    }
  ];
}

function flattenTeams(data) {
  return Object.entries(data.groups).flatMap(([group, teams]) =>
    teams.map((team) => ({ group, ...team }))
  );
}

function runSkill(tool, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(scriptDir, tool), ...args], {
      cwd: skillDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ ok: false, error: 'Skill script timed out' });
    }, 18000);

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({ ok: false, error: stderr || stdout || `Exit ${code}` });
        return;
      }
      try {
        resolve({ ok: true, data: JSON.parse(stdout), raw: stdout });
      } catch {
        resolve({ ok: true, data: stdout.trim(), raw: stdout });
      }
    });
  });
}

async function readPreviousSnapshot() {
  try {
    return JSON.parse(await readFile(outFile, 'utf8'));
  } catch {
    return null;
  }
}

const teams = JSON.parse(await readFile(join(skillDir, 'data', 'teams.json'), 'utf8'));
const previousSnapshot = await readPreviousSnapshot();
const [dates, today, tomorrow, scheduleWindow, scheduleStats, standings, players] = await Promise.all([
  runSkill('worldcup-schedule.js', ['dates']),
  runSkill('worldcup-schedule.js', ['today']),
  runSkill('worldcup-schedule.js', ['tomorrow']),
  runSkill('worldcup-schedule.js', ['all']),
  runSkill('worldcup-schedule.js', ['stats']),
  runSkill('worldcup-rankings.js', ['standings']),
  runSkill('worldcup-rankings.js', ['players', '进球', '10'])
]);

const dateList = dates.ok && Array.isArray(dates.data) ? dates.data : [];
const dailySchedules = await Promise.all(dateList.map((date) => runSkill('worldcup-schedule.js', ['date', date])));
const allSchedule = dailySchedules
  .flatMap((result) => result.ok && Array.isArray(result.data) ? result.data : [])
  .filter((match, index, list) => list.findIndex((item) => item.matchId === match.matchId) === index)
  .sort((a, b) => Number(a.startTimeStamp || 0) - Number(b.startTimeStamp || 0));
const completeSchedule = allSchedule.length
  ? allSchedule
  : scheduleWindow.ok && Array.isArray(scheduleWindow.data) && scheduleWindow.data.length
    ? scheduleWindow.data
    : sampleMatches();
const previousSchedule = previousSnapshot?.run?.['schedule:all']?.data || [];
const freshScheduleEnough = completeSchedule.length >= minFreshScheduleMatches;

if (!freshScheduleEnough && previousSchedule.length >= minFreshScheduleMatches) {
  console.warn(`Keeping previous snapshot: fetched ${completeSchedule.length} matches, previous has ${previousSchedule.length}.`);
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, `${JSON.stringify(previousSnapshot, null, 2)}\n`);
  console.log(`Preserved ${outFile}`);
  process.exit(0);
}

if (!freshScheduleEnough && process.env.CI) {
  throw new Error(`Refusing to publish degraded static snapshot: fetched ${completeSchedule.length} matches.`);
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  meta: {
    ok: true,
    static: true,
    tournament: teams.tournament,
    season: teams.season,
    totalTeams: teams.totalTeams,
    totalGroups: teams.totalGroups,
    hosts: teams.hostCountries,
    teams: flattenTeams(teams),
    sampleMatches: sampleMatches()
  },
  run: {
    'schedule:today': today.ok && Array.isArray(today.data) && today.data.length ? today : { ok: true, data: sampleMatches(), fallback: true },
    'schedule:tomorrow': tomorrow.ok && Array.isArray(tomorrow.data) && tomorrow.data.length ? tomorrow : { ok: true, data: sampleMatches(), fallback: true },
    'schedule:dates': dates.ok ? dates : { ok: true, data: dateList, fallback: true },
    'schedule:all': { ok: true, data: completeSchedule },
    'schedule:stats': scheduleStats.ok ? scheduleStats : { ok: true, data: { total: sampleMatches().length, finished: 1, pending: 2, live: 0 } },
    'rankings:standings': standings.ok ? standings : { ok: true, data: null, fallback: true },
    'rankings:players:进球:10': players.ok ? players : { ok: true, data: null, fallback: true }
  }
};

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
