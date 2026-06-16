import http from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT || 4177);
const DEFAULT_SKILL_DIR = join(__dirname, 'vendor', 'haizei-worldcup-2026-skill');
const SKILL_DIR = resolve(process.env.WORLDCUP_SKILL_DIR || DEFAULT_SKILL_DIR);
const SCRIPT_DIR = join(SKILL_DIR, 'scripts');
const TEAMS_PATH = join(SKILL_DIR, 'data', 'teams.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const scriptMap = {
  teams: 'worldcup-teams.js',
  schedule: 'worldcup-schedule.js',
  match: 'worldcup-match.js',
  team: 'worldcup-team.js',
  player: 'worldcup-player.js',
  rankings: 'worldcup-rankings.js'
};

const allowedArgs = {
  teams: ['list', 'group', 'find', 'info', 'hosts', 'pot'],
  schedule: ['all', 'today', 'tomorrow', 'date', 'group', 'team', 'stage', 'dates', 'stats'],
  match: ['info', 'analysis', 'lineup', 'live', 'stats', 'detail'],
  team: ['lookup', 'info', 'schedule', 'lineup', 'history', 'stats'],
  player: ['info', 'news', 'stats', 'schedule', 'detail'],
  rankings: ['standings', 'fifa', 'players', 'team-rank', 'categories', 'knockout']
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function staticFile(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const target = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = resolve(__dirname, target);
  if (!filePath.startsWith(resolve(__dirname)) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
}

function readTeams() {
  return JSON.parse(readFileSync(TEAMS_PATH, 'utf8'));
}

function runSkill(tool, args) {
  return new Promise((resolveRun) => {
    const script = scriptMap[tool];
    if (!script) {
      resolveRun({ ok: false, error: `未知工具: ${tool}` });
      return;
    }
    const firstArg = args[0] || 'list';
    if (!allowedArgs[tool].includes(firstArg)) {
      resolveRun({ ok: false, error: `不允许的命令: ${tool} ${firstArg}` });
      return;
    }

    const child = spawn(process.execPath, [join(SCRIPT_DIR, script), ...args], {
      cwd: SKILL_DIR,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolveRun({ ok: false, error: 'Skill 脚本超时', stderr });
    }, 18000);

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolveRun({ ok: false, code, error: stderr || stdout || `退出码 ${code}` });
        return;
      }
      try {
        resolveRun({ ok: true, data: JSON.parse(stdout), raw: stdout });
      } catch {
        resolveRun({ ok: true, data: stdout.trim(), raw: stdout });
      }
    });
  });
}

function flattenTeams(data) {
  return Object.entries(data.groups).flatMap(([group, teams]) =>
    teams.map((team) => ({ group, ...team }))
  );
}

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

async function routeApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'worldcup2026-jaco-liveboard',
      skillReady: existsSync(TEAMS_PATH)
    });
    return;
  }

  if (url.pathname === '/api/meta') {
    const teams = readTeams();
    sendJson(res, 200, {
      ok: true,
      skillDir: SKILL_DIR,
      tournament: teams.tournament,
      season: teams.season,
      totalTeams: teams.totalTeams,
      totalGroups: teams.totalGroups,
      hosts: teams.hostCountries,
      teams: flattenTeams(teams),
      sampleMatches: sampleMatches()
    });
    return;
  }

  if (url.pathname === '/api/run') {
    const tool = url.searchParams.get('tool');
    const args = url.searchParams.getAll('arg').filter(Boolean);
    sendJson(res, 200, await runSkill(tool, args));
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Unknown API route' });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    routeApi(req, res).catch((error) => sendJson(res, 500, { ok: false, error: error.message }));
    return;
  }
  staticFile(req, res);
});

server.listen(PORT, () => {
  console.log(`World Cup H5 dashboard: http://localhost:${PORT}`);
  console.log(`Using Skill: ${SKILL_DIR}`);
});
