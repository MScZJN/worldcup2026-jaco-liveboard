const app = document.querySelector('#app');

const state = {
  active: 'schedule',
  selectedTeam: '巴西',
  selectedDate: '2026-06-14',
  selectedMatch: null,
  loading: '',
  error: '',
  meta: null,
  schedule: [],
  standings: null,
  rankings: null,
  odds: [],
  teamDetail: null,
  playerDetail: null,
  matchAnalysis: null,
  matchLive: null,
  matchStats: null,
  matchLineup: null
};

const capabilities = [
  { id: 'schedule', label: '今日赛程', icon: 'calendar' },
  { id: 'preview', label: '前瞻', icon: 'spark' },
  { id: 'report', label: '战报', icon: 'flag' },
  { id: 'standings', label: '积分榜', icon: 'table' },
  { id: 'teams', label: '球队', icon: 'shield' },
  { id: 'players', label: '球员', icon: 'user' },
  { id: 'odds', label: '竞彩', icon: 'ticket' }
];

const workflows = [
  ['赛程查询', 'today / tomorrow / date / group / team / stage / dates / stats'],
  ['比赛详情', 'analysis / lineup / live / stats / odds'],
  ['球队数据', 'info / schedule / lineup / history / stats'],
  ['球员数据', 'info / news / stats / schedule'],
  ['排名数据', 'standings / fifa / players / knockout'],
  ['竞彩赔率', 'had / hhad / crs / ttg / hafu / history']
];

function icon(name) {
  const common = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const paths = {
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    spark: '<path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z"/>',
    flag: '<path d="M4 22V4"/><path d="M4 4c5-3 8 3 13 0v11c-5 3-8-3-13 0"/>',
    table: '<path d="M3 5h18v14H3z"/><path d="M3 10h18M8 5v14M16 5v14"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    ticket: '<path d="M2 9a3 3 0 0 0 0 6v3h20v-3a3 3 0 0 0 0-6V6H2v3Z"/><path d="M13 6v12"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/><path d="M3 12A9 9 0 0 1 18.5 5.8L21 8"/><path d="M21 3v5h-5"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 20h.01"/>'
  };
  return `<svg ${common}>${paths[name] || paths.spark}</svg>`;
}

function normalizeData(response, fallback) {
  if (!response?.ok) {
    state.error = response?.error || '接口暂不可用，已使用演示数据';
    return fallback;
  }
  return response.data ?? fallback;
}

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function runSkill(tool, ...args) {
  const qs = new URLSearchParams({ tool });
  args.filter(Boolean).forEach((arg) => qs.append('arg', arg));
  return getJson(`/api/run?${qs}`);
}

async function withLoading(label, task) {
  state.loading = label;
  state.error = '';
  render();
  try {
    await task();
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = '';
    render();
  }
}

async function init() {
  const metaResponse = await getJson('/api/meta');
  state.meta = metaResponse?.ok ? metaResponse : null;
  if (!state.meta) throw new Error('无法读取世界杯 Skill 元数据');
  state.schedule = state.meta.sampleMatches;
  state.odds = state.meta.sampleOdds;
  state.selectedMatch = state.schedule[0];
  render();
  await Promise.allSettled([loadSchedule('today'), loadStandings(), loadOdds()]);
  render();
}

async function loadSchedule(mode = 'today') {
  await withLoading('同步赛程', async () => {
    const response = await runSkill('schedule', mode);
    const data = normalizeData(response, state.meta.sampleMatches);
    state.schedule = Array.isArray(data) && data.length ? data : state.meta.sampleMatches;
    state.selectedMatch = state.schedule[0] || state.selectedMatch;
  });
}

async function loadStandings() {
  await withLoading('刷新积分榜', async () => {
    const response = await runSkill('rankings', 'standings');
    state.standings = normalizeData(response, buildLocalStandings());
  });
}

async function loadRankings(type = '进球') {
  await withLoading('刷新球员榜', async () => {
    const response = await runSkill('rankings', 'players', type, '10');
    state.rankings = normalizeData(response, samplePlayerRankings());
  });
}

async function loadOdds() {
  await withLoading('读取竞彩', async () => {
    const response = await getJson('/api/odds?wc=1&pool=summary');
    const data = normalizeData(response, { matches: state.meta.sampleOdds });
    state.odds = data.matches?.length ? data.matches : state.meta.sampleOdds;
  });
}

async function loadTeam(teamName = state.selectedTeam) {
  state.selectedTeam = teamName;
  await withLoading('读取球队档案', async () => {
    const lookup = await runSkill('team', 'lookup', teamName);
    const found = normalizeData(lookup, null);
    const teamId = found?.teamId;
    if (!teamId) throw new Error('未找到球队 ID');
    const [info, lineup, history, schedule] = await Promise.all([
      runSkill('team', 'info', teamId),
      runSkill('team', 'lineup', teamId),
      runSkill('team', 'history', teamId),
      runSkill('team', 'schedule', teamId, '世界杯')
    ]);
    state.teamDetail = {
      lookup: found,
      info: normalizeData(info, {}),
      lineup: normalizeData(lineup, {}),
      history: normalizeData(history, {}),
      schedule: normalizeData(schedule, {})
    };
  });
}

async function loadMatchDeep(match = state.selectedMatch) {
  if (!match?.matchId || String(match.matchId).startsWith('sample-')) {
    state.matchAnalysis = sampleAnalysis(match);
    state.matchLive = sampleLive(match);
    state.matchStats = sampleStats(match);
    state.matchLineup = sampleLineup(match);
    render();
    return;
  }
  await withLoading('读取比赛详情', async () => {
    const [analysis, live, stats, lineup] = await Promise.all([
      runSkill('match', 'analysis', match.matchId),
      runSkill('match', 'live', match.matchId),
      runSkill('match', 'stats', match.matchId),
      runSkill('match', 'lineup', match.matchId)
    ]);
    state.matchAnalysis = normalizeData(analysis, sampleAnalysis(match));
    state.matchLive = normalizeData(live, sampleLive(match));
    state.matchStats = normalizeData(stats, sampleStats(match));
    state.matchLineup = normalizeData(lineup, sampleLineup(match));
  });
}

async function loadPlayer() {
  const players = state.teamDetail?.lineup?.players?.flatMap((group) => group.players || []) || [];
  const candidate = players.find((player) => player.playerId) || { name: '内马尔', playerId: '8b95bfb75b6abad75a141fbfee809950' };
  await withLoading('读取球员追踪', async () => {
    const [info, news, stats, schedule] = await Promise.all([
      runSkill('player', 'info', candidate.playerId),
      runSkill('player', 'news', candidate.playerId),
      runSkill('player', 'stats', candidate.playerId, '2026', '世界杯'),
      runSkill('player', 'schedule', candidate.playerId)
    ]);
    state.playerDetail = {
      name: candidate.name,
      info: normalizeData(info, samplePlayer(candidate.name)),
      news: normalizeData(news, { newsList: [] }),
      stats: normalizeData(stats, {}),
      schedule: normalizeData(schedule, {})
    };
  });
}

function setTab(id) {
  state.active = id;
  if (id === 'standings' && !state.standings) loadStandings();
  if (id === 'teams' && !state.teamDetail) loadTeam();
  if (id === 'players') {
    if (!state.teamDetail) loadTeam().then(loadPlayer);
    else if (!state.playerDetail) loadPlayer();
  }
  if ((id === 'preview' || id === 'report') && !state.matchAnalysis) loadMatchDeep();
  if (id === 'odds' && !state.odds.length) loadOdds();
  render();
}

function render() {
  if (!state.meta) return;
  app.innerHTML = `
    ${header()}
    ${hero()}
    ${tabs()}
    <section class="workspace">${panel()}</section>
    ${capabilityMatrix()}
    ${toast()}
  `;
  bind();
}

function header() {
  return `
    <header class="topbar">
      <button class="icon-btn" data-refresh aria-label="刷新">${icon('refresh')}</button>
      <div>
        <h1>世界杯活动看板</h1>
        <p>${state.meta.tournament} · ${state.meta.totalTeams}队 · 北京时间</p>
      </div>
      <button class="signal" aria-label="Skill Live">${icon('wifi')}<span>Skill Live</span></button>
    </header>
  `;
}

function hero() {
  const match = state.selectedMatch || state.schedule[0];
  const odds = state.odds[0]?.pools?.find((pool) => pool.poolCode === 'had');
  return `
    <section class="match-console">
      <div class="match-main">
        <div class="status-row"><span class="live-dot"></span>${match.status || '未开赛'} · ${match.stage || 'C组第1轮'}</div>
        <div class="versus">
          <strong>${match.homeTeam}</strong>
          <span>vs</span>
          <strong>${match.awayTeam}</strong>
        </div>
        <div class="time-line"><span>${match.time || '06:00'}</span><span>${match.date || '2026-06-14'}</span><span>热度 ${match.hot ?? 51}</span></div>
      </div>
      <div class="odds-chip">
        <span>胜平负</span>
        <b>${odds ? `${odds.homeWin} / ${odds.draw} / ${odds.awayWin}` : '1.49 / 3.60 / 5.55'}</b>
      </div>
    </section>
  `;
}

function tabs() {
  return `
    <nav class="tabs" aria-label="能力导航">
      ${capabilities.map((item) => `
        <button class="${state.active === item.id ? 'active' : ''}" data-tab="${item.id}">
          ${icon(item.icon)}<span>${item.label}</span>
        </button>
      `).join('')}
    </nav>
  `;
}

function panel() {
  const map = {
    schedule: schedulePanel,
    preview: previewPanel,
    report: reportPanel,
    standings: standingsPanel,
    teams: teamsPanel,
    players: playersPanel,
    odds: oddsPanel
  };
  return map[state.active]();
}

function schedulePanel() {
  return `
    <div class="panel-head">
      <div><h2>今日赛程</h2><p>today / tomorrow / date / group / team / stage</p></div>
      <button class="mini-btn" data-action="schedule-tomorrow">明日</button>
    </div>
    <div class="quick-row">
      ${['today', 'tomorrow', 'dates', 'stats'].map((cmd) => `<button data-schedule="${cmd}">${cmd}</button>`).join('')}
    </div>
    <div class="match-list">
      ${state.schedule.map((match, index) => matchCard(match, index)).join('')}
    </div>
  `;
}

function matchCard(match, index) {
  return `
    <button class="match-row ${state.selectedMatch?.matchId === match.matchId ? 'selected' : ''}" data-match="${index}">
      <span class="match-time">${match.time || '--:--'}</span>
      <span class="match-names">${match.homeTeam}<em>vs</em>${match.awayTeam}</span>
      <span class="match-state">${match.scoreLine && match.scoreLine !== '-' ? match.scoreLine : match.status}</span>
      ${icon('chevron')}
    </button>
  `;
}

function previewPanel() {
  const prediction = state.matchAnalysis?.prediction || { homeWinRate: '40%', awayWinRate: '32%', sampleSize: '相似赔率样本' };
  const intelligence = state.matchAnalysis?.intelligence || [
    { title: '有利情报', homeTeamPoints: ['巴西进攻端个人能力突出'], awayTeamPoints: ['摩洛哥反击速度快'] },
    { title: '不利情报', homeTeamPoints: ['让球压力较高'], awayTeamPoints: ['控球稳定性待验证'] }
  ];
  return `
    <div class="panel-head">
      <div><h2>赛前前瞻</h2><p>analysis + odds + intelligence</p></div>
      <button class="mini-btn" data-action="match-deep">刷新</button>
    </div>
    <div class="metric-grid">
      <div><span>主胜预测</span><strong>${prediction.homeWinRate || '40%'}</strong></div>
      <div><span>客胜预测</span><strong>${prediction.awayWinRate || '32%'}</strong></div>
      <div><span>样本</span><strong>${prediction.sampleSize || '相似赔率'}</strong></div>
    </div>
    <div class="intel-list">
      ${intelligence.slice(0, 2).map((item) => `
        <article>
          <h3>${item.title}</h3>
          <p>${[...(item.homeTeamPoints || []), ...(item.awayTeamPoints || [])].slice(0, 2).join(' / ') || '等待上游更新'}</p>
        </article>
      `).join('')}
    </div>
  `;
}

function reportPanel() {
  const live = state.matchLive || sampleLive(state.selectedMatch);
  const stats = state.matchStats || sampleStats(state.selectedMatch);
  return `
    <div class="panel-head">
      <div><h2>战报回顾</h2><p>live + stats + lineup</p></div>
      <button class="mini-btn" data-action="match-deep">同步</button>
    </div>
    <div class="stat-bars">
      ${(stats.items || []).slice(0, 5).map((item) => statBar(item)).join('')}
    </div>
    <div class="timeline">
      ${(live.incidents || live.narrative || []).slice(0, 5).map((event) => `
        <div><span>${event.passedTime || '--'}</span><p>${event.text || event.goalType || event.iconType || '比赛事件'}</p></div>
      `).join('')}
    </div>
  `;
}

function statBar(item) {
  const home = Number.parseFloat(item.home) || 0;
  const away = Number.parseFloat(item.away) || 0;
  const total = Math.max(home + away, 1);
  return `
    <div class="bar-row">
      <span>${item.home}</span>
      <div><label>${item.name}</label><i style="--home:${(home / total) * 100}%"></i></div>
      <span>${item.away}</span>
    </div>
  `;
}

function standingsPanel() {
  const groups = state.standings?.groups || buildLocalStandings().groups;
  return `
    <div class="panel-head">
      <div><h2>积分榜</h2><p>standings / fifa / players / knockout</p></div>
      <button class="mini-btn" data-action="standings">刷新</button>
    </div>
    <div class="standings">
      ${groups.slice(0, 4).map((group, index) => groupTable(group, String.fromCharCode(65 + index))).join('')}
    </div>
  `;
}

function groupTable(group, fallbackName) {
  const name = group.groupName || group.name || `${fallbackName}组`;
  const list = group.list || [];
  return `
    <article class="group-table">
      <h3>${name}</h3>
      ${list.slice(0, 4).map((team, i) => `
        <div class="team-line">
          <span>${i + 1}</span><b>${team.teamName}</b><em>${team.points ?? 0}</em>
        </div>
      `).join('')}
    </article>
  `;
}

function teamsPanel() {
  const teams = state.meta.teams;
  const detail = state.teamDetail;
  return `
    <div class="panel-head">
      <div><h2>球队档案</h2><p>info / schedule / lineup / history / stats</p></div>
      <button class="mini-btn" data-action="team">拉取</button>
    </div>
    <div class="team-picker">
      ${teams.filter((team) => [1, 2].includes(team.pot)).slice(0, 14).map((team) => `
        <button class="${state.selectedTeam === team.teamName ? 'active' : ''}" data-team="${team.teamName}">${team.teamName}</button>
      `).join('')}
    </div>
    <div class="profile">
      <div>
        <span>${detail?.lookup?.group || 'C'}组 · 第${detail?.lookup?.position || 1}位</span>
        <strong>${detail?.lookup?.teamName || state.selectedTeam}</strong>
        <p>${teamInfoText(detail)}</p>
      </div>
      <div class="mini-roster">
        ${(detail?.lineup?.players || []).slice(0, 3).map((group) => `<span>${group.position} ${group.players?.length || 0}</span>`).join('') || '<span>阵容</span><span>历史</span><span>数据</span>'}
      </div>
    </div>
  `;
}

function playersPanel() {
  const ranking = state.rankings || samplePlayerRankings();
  const player = state.playerDetail;
  return `
    <div class="panel-head">
      <div><h2>球员追踪</h2><p>info / news / stats / schedule + 射手榜</p></div>
      <button class="mini-btn" data-action="players">同步</button>
    </div>
    <div class="ranking-list">
      ${(ranking.players || []).slice(0, 5).map((p) => `
        <div><span>${p.rank}</span><b>${p.playerName}</b><em>${p.team} · ${p.score}</em></div>
      `).join('')}
    </div>
    <div class="player-card">
      <strong>${player?.name || '明星球员'}</strong>
      <p>${playerSummary(player)}</p>
      <div class="radar-row">${(player?.info?.ability?.radarDims || samplePlayer().ability.radarDims).slice(0, 6).map((dim) => `<span>${dim.name}<b>${dim.value}</b></span>`).join('')}</div>
    </div>
  `;
}

function oddsPanel() {
  return `
    <div class="panel-head">
      <div><h2>竞彩赔率</h2><p>had / hhad / crs / ttg / hafu</p></div>
      <button class="mini-btn" data-action="odds">刷新</button>
    </div>
    <div class="odds-list">
      ${state.odds.map((match) => `
        <article>
          <header><span>${match.matchNum || '世界杯'}</span><b>${match.homeTeam} vs ${match.awayTeam}</b><em>${match.time || ''}</em></header>
          ${(match.pools || []).slice(0, 4).map((pool) => oddsLine(pool)).join('')}
        </article>
      `).join('')}
    </div>
  `;
}

function oddsLine(pool) {
  if (pool.poolCode === 'ttg') {
    return `<div class="odds-line"><span>${pool.name}</span><b>${Object.entries(pool.goals || {}).slice(2, 5).map(([k, v]) => `${k}:${v}`).join('  ')}</b></div>`;
  }
  if (pool.poolCode === 'crs') {
    return `<div class="odds-line"><span>${pool.name}</span><b>${Object.entries(pool.scores || {}).slice(0, 3).map(([k, v]) => `${k}:${v}`).join('  ')}</b></div>`;
  }
  return `<div class="odds-line"><span>${pool.name}${pool.goalLine ? `(${pool.goalLine})` : ''}</span><b>${pool.homeWin || '-'} / ${pool.draw || '-'} / ${pool.awayWin || '-'}</b></div>`;
}

function capabilityMatrix() {
  return `
    <section class="matrix">
      <h2>Skill 能力矩阵</h2>
      ${workflows.map(([name, cmds]) => `<div><b>${name}</b><span>${cmds}</span></div>`).join('')}
    </section>
  `;
}

function toast() {
  if (state.loading) return `<div class="toast">${state.loading}...</div>`;
  if (state.error) return `<div class="toast warning">${state.error}</div>`;
  return '';
}

function bind() {
  document.querySelectorAll('[data-tab]').forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
  document.querySelectorAll('[data-schedule]').forEach((btn) => btn.addEventListener('click', () => loadSchedule(btn.dataset.schedule)));
  document.querySelectorAll('[data-match]').forEach((btn) => btn.addEventListener('click', () => {
    state.selectedMatch = state.schedule[Number(btn.dataset.match)];
    state.matchAnalysis = null;
    state.matchLive = null;
    setTab('preview');
  }));
  document.querySelectorAll('[data-team]').forEach((btn) => btn.addEventListener('click', () => loadTeam(btn.dataset.team)));
  document.querySelector('[data-refresh]')?.addEventListener('click', () => Promise.allSettled([loadSchedule('today'), loadStandings(), loadOdds()]));
  document.querySelector('[data-action="schedule-tomorrow"]')?.addEventListener('click', () => loadSchedule('tomorrow'));
  document.querySelector('[data-action="match-deep"]')?.addEventListener('click', () => loadMatchDeep());
  document.querySelector('[data-action="standings"]')?.addEventListener('click', () => loadStandings());
  document.querySelector('[data-action="team"]')?.addEventListener('click', () => loadTeam());
  document.querySelector('[data-action="players"]')?.addEventListener('click', async () => { await loadRankings(); await loadPlayer(); });
  document.querySelector('[data-action="odds"]')?.addEventListener('click', () => loadOdds());
}

function buildLocalStandings() {
  const groups = {};
  for (const team of state.meta.teams) {
    groups[team.group] ||= { groupName: `${team.group}组`, list: [] };
    groups[team.group].list.push({ teamName: team.teamName, points: team.qualifiedTop32 ? 3 : 0 });
  }
  return { updateTime: '本地配置', groups: Object.values(groups) };
}

function samplePlayerRankings() {
  return {
    statsName: '射手榜',
    players: [
      { rank: 1, playerName: '弗拉林·巴洛贡', team: '美国', position: '前锋', score: '2' },
      { rank: 2, playerName: '黄仁范', team: '韩国', position: '中场', score: '1' },
      { rank: 3, playerName: '雷纳', team: '美国', position: '中场', score: '1' },
      { rank: 4, playerName: '内马尔', team: '巴西', position: '前锋', score: '0' },
      { rank: 5, playerName: '姆巴佩', team: '法国', position: '前锋', score: '0' }
    ]
  };
}

function sampleAnalysis(match) {
  return {
    prediction: { homeWinRate: match?.homeTeam === '巴西' ? '58%' : '40%', awayWinRate: '29%', sampleSize: '相似赔率' },
    intelligence: [
      { title: '有利情报', homeTeamPoints: [`${match?.homeTeam || '主队'}边路推进效率高`], awayTeamPoints: [`${match?.awayTeam || '客队'}防守反击质量稳定`] },
      { title: '不利情报', homeTeamPoints: ['热门方让球压力明显'], awayTeamPoints: ['阵地战创造力需要验证'] }
    ]
  };
}

function sampleLive() {
  return {
    incidents: [
      { passedTime: "8'", text: '第1个进球！乌龙球' },
      { passedTime: "31'", text: '巴洛贡禁区内推射破门' },
      { passedTime: "74'", text: '客队扳回一城' },
      { passedTime: "90+8'", text: '补时阶段锁定比分' }
    ]
  };
}

function sampleStats() {
  return {
    items: [
      { name: '进球', home: 4, away: 1 },
      { name: '控球率', home: 65, away: 35 },
      { name: '射正', home: 6, away: 1 },
      { name: '角球', home: 3, away: 1 },
      { name: '黄牌', home: 1, away: 5 }
    ]
  };
}

function sampleLineup() {
  return { confirmed: false, court: '赛前约2小时更新', home: { formation: '4-3-3' }, away: { formation: '4-2-3-1' } };
}

function samplePlayer(name = '内马尔') {
  return {
    wiki: { detail: { position: '前锋', national: '巴西', age: '33岁' } },
    ability: {
      overall: 82,
      radarDims: [
        { name: '速度', value: 85 },
        { name: '射门', value: 86 },
        { name: '传球', value: 88 },
        { name: '盘带', value: 93 },
        { name: '防守', value: 42 },
        { name: '身体', value: 66 }
      ]
    },
    name
  };
}

function teamInfoText(detail) {
  const items = detail?.info?.baseInfo?.items || [];
  return items.slice(0, 3).map((item) => `${item.name}:${item.content}`).join(' · ') || '球队资料、赛程、阵容、历史成绩与数据统计统一接入。';
}

function playerSummary(player) {
  const info = player?.info?.wiki?.detail;
  if (!info) return '能力雷达、新闻动态、赛事数据和出场记录联动展示。';
  return `${info.national || ''} · ${info.position || ''} · ${info.age || ''}`;
}

init();
