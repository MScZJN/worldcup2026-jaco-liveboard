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
  match: ['info', 'analysis', 'lineup', 'live', 'stats', 'odds', 'detail'],
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

async function fetchSporttery(query) {
  const pool = query.get('pool');
  const team = query.get('team') || '';
  const date = query.get('date') || '';
  const wcOnly = query.get('wc') !== '0';
  const url = new URL('https://webapi.sporttery.cn/gateway/uniform/football/getMatchCalculatorV1.qry');
  url.searchParams.set('channel', 'mchannel');
  if (pool && pool !== 'summary') url.searchParams.set('poolCode', pool);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      'Referer': 'https://m.sporttery.cn/',
      'Accept': 'application/json'
    }
  });
  if (!response.ok) throw new Error(`sporttery HTTP ${response.status}`);
  const json = await response.json();
  if (json.success !== true) throw new Error(json.errorMessage || json.errorCode || 'sporttery API error');
  const raw = json.value?.matchInfoList || json.value?.matchList || [];
  return raw.map(normalizeSportteryMatch)
    .filter((match) => !wcOnly || /世界杯/.test(match.league))
    .filter((match) => !team || match.homeTeam.includes(team) || match.awayTeam.includes(team))
    .filter((match) => !date || match.date === date);
}

function normalizeSportteryMatch(match) {
  const pools = [];
  const poolList = match.poolList || [];
  for (const poolInfo of poolList) {
    const code = String(poolInfo.poolCode || '').toLowerCase();
    const odds = match[code];
    if (!odds) continue;
    if (code === 'had' || code === 'hhad') {
      pools.push({
        poolCode: code,
        name: code === 'had' ? '胜平负' : '让球胜平负',
        homeWin: odds.h,
        draw: odds.d,
        awayWin: odds.a,
        goalLine: odds.goalLine || '',
        homeTrend: odds.hf || '',
        drawTrend: odds.df || '',
        awayTrend: odds.af || ''
      });
    }
    if (code === 'ttg') {
      pools.push({ poolCode: code, name: '总进球', goals: { 0: odds.s0, 1: odds.s1, 2: odds.s2, 3: odds.s3, 4: odds.s4, 5: odds.s5, 6: odds.s6, '7+': odds.s7 } });
    }
    if (code === 'crs') {
      pools.push({ poolCode: code, name: '比分', scores: { '1:0': odds.s01s00, '2:1': odds.s02s01, '0:0': odds.s00s00, '1:1': odds.s01s01, '0:1': odds.s00s01 } });
    }
    if (code === 'hafu') {
      pools.push({ poolCode: code, name: '半全场', options: { '胜胜': odds.hh, '平胜': odds.dh, '平平': odds.dd, '负负': odds.aa } });
    }
  }
  return {
    matchId: match.matchId,
    matchNum: match.matchNumStr || match.matchNum,
    league: match.leagueName || match.leagueAbbName || '',
    homeTeam: match.homeTeamAbbName || match.homeTeamAllName || match.homeTeam,
    awayTeam: match.awayTeamAbbName || match.awayTeamAllName || match.awayTeam,
    date: match.businessDate || match.matchDate || '',
    time: match.matchTime || '',
    status: match.matchStatus || match.status,
    pools
  };
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
      sampleMatches: sampleMatches(),
      sampleOdds: sampleOdds()
    });
    return;
  }

  if (url.pathname === '/api/run') {
    const tool = url.searchParams.get('tool');
    const args = url.searchParams.getAll('arg').filter(Boolean);
    sendJson(res, 200, await runSkill(tool, args));
    return;
  }

  if (url.pathname === '/api/odds') {
    try {
      const matches = await fetchSporttery(url.searchParams);
      if (!matches.length) {
        sendJson(res, 200, { ok: true, data: { matches: sampleOdds(), fallback: true, reason: '当前没有可展示的世界杯竞彩场次' } });
        return;
      }
      sendJson(res, 200, { ok: true, data: { matches, fallback: false } });
    } catch (error) {
      sendJson(res, 200, { ok: false, error: error.message, data: { matches: sampleOdds(), fallback: true } });
    }
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
