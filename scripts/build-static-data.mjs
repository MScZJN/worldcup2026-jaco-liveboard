import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const skillDir = join(rootDir, 'vendor', 'haizei-worldcup-2026-skill');
const scriptDir = join(skillDir, 'scripts');
const outFile = join(rootDir, 'data', 'snapshot.json');

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

function sampleOdds() {
  return [
    {
      matchId: 2040167,
      matchNum: '周六006',
      league: '世界杯',
      homeTeam: '巴西',
      awayTeam: '摩洛哥',
      date: '2026-06-14',
      time: '06:00:00',
      pools: [
        { poolCode: 'had', name: '胜平负', homeWin: '1.49', draw: '3.60', awayWin: '5.55' },
        { poolCode: 'hhad', name: '让球胜平负', goalLine: '-1', homeWin: '2.72', draw: '3.11', awayWin: '2.27' },
        { poolCode: 'ttg', name: '总进球', goals: { 0: '13.00', 1: '5.00', 2: '3.35', 3: '3.45', 4: '5.40', 5: '9.50', 6: '18.00', '7+': '25.00' } }
      ]
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

const teams = JSON.parse(await readFile(join(skillDir, 'data', 'teams.json'), 'utf8'));
const [today, tomorrow, scheduleStats, standings, players] = await Promise.all([
  runSkill('worldcup-schedule.js', ['today']),
  runSkill('worldcup-schedule.js', ['tomorrow']),
  runSkill('worldcup-schedule.js', ['stats']),
  runSkill('worldcup-rankings.js', ['standings']),
  runSkill('worldcup-rankings.js', ['players', '进球', '10'])
]);

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
    sampleMatches: sampleMatches(),
    sampleOdds: sampleOdds()
  },
  run: {
    'schedule:today': today.ok && Array.isArray(today.data) && today.data.length ? today : { ok: true, data: sampleMatches(), fallback: true },
    'schedule:tomorrow': tomorrow.ok && Array.isArray(tomorrow.data) && tomorrow.data.length ? tomorrow : { ok: true, data: sampleMatches(), fallback: true },
    'schedule:stats': scheduleStats.ok ? scheduleStats : { ok: true, data: { total: sampleMatches().length, finished: 1, pending: 2, live: 0 } },
    'rankings:standings': standings.ok ? standings : { ok: true, data: null, fallback: true },
    'rankings:players:进球:10': players.ok ? players : { ok: true, data: null, fallback: true }
  },
  odds: {
    ok: true,
    data: { matches: sampleOdds(), fallback: true, reason: 'GitHub Pages static snapshot' }
  }
};

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
