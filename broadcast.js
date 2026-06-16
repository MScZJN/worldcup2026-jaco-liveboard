const root = document.querySelector('#broadcast');
const params = new URLSearchParams(location.search);
const forceMock = params.get('mock') === '1';
const transparent = params.get('transparent') === '1';
const refreshMs = Number(params.get('refresh') || 45000);
const refreshOffsetMs = Number(params.get('refreshOffset') || 600);
const staticMode = params.get('static') === '1' || location.hostname === 'worldcup2026.jiananzhu.cloud' || location.hostname.endsWith('.github.io');

if (transparent) document.body.classList.add('transparent');

const state = {
  meta: null,
  matches: [],
  standings: null,
  activeIndex: 0,
  updatedAt: new Date(),
  error: '',
  cue: 0
};

const cueChips = ['讲看点', '聊预测', '看出线'];
const mockMatches = [
  {
    matchId: 'sample-live-brazil-morocco',
    date: '2026-06-14',
    time: '06:00',
    stage: 'C组第1轮',
    group: 'C',
    homeTeam: '巴西',
    awayTeam: '摩洛哥',
    homeScore: 2,
    awayScore: 1,
    scoreLine: '2-1',
    status: '进行中',
    statusId: '1',
    hot: 88
  },
  {
    matchId: 'sample-next-haiti-scotland',
    date: '2026-06-14',
    time: '09:00',
    stage: 'C组第1轮',
    group: 'C',
    homeTeam: '海地',
    awayTeam: '苏格兰',
    homeScore: null,
    awayScore: null,
    scoreLine: '-',
    status: '未开赛',
    statusId: '0',
    hot: 29
  },
  {
    matchId: 'sample-finished-usa-paraguay',
    date: '2026-06-13',
    time: '09:00',
    stage: 'D组第1轮',
    group: 'D',
    homeTeam: '美国',
    awayTeam: '巴拉圭',
    homeScore: 4,
    awayScore: 1,
    scoreLine: '4-1',
    status: '已结束',
    statusId: '2',
    hot: 51
  }
];

function icon(name) {
  const common = 'width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  const paths = {
    signal: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 20h.01"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 5h-5L8 10l4-3Z"/><path d="M12 7V3M16 10l4-2M14.5 15l2.5 4M9.5 15 7 19M8 10 4 8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    spark: '<path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z"/>'
  };
  return `<svg ${common}>${paths[name] || paths.spark}</svg>`;
}

let staticSnapshotPromise = null;
let staticSnapshotBucket = null;

function refreshBucket() {
  return Math.floor(Date.now() / refreshMs);
}

async function getStaticSnapshot() {
  const bucket = refreshBucket();
  if (bucket !== staticSnapshotBucket) {
    staticSnapshotBucket = bucket;
    staticSnapshotPromise = null;
  }

  staticSnapshotPromise ||= fetch(`./data/snapshot.json?sync=${bucket}`, { cache: 'reload' }).then((response) => {
    if (!response.ok) throw new Error(`static snapshot ${response.status}`);
    return response.json();
  });
  return staticSnapshotPromise;
}

async function getStaticJson(url) {
  const snapshot = await getStaticSnapshot();
  const target = new URL(url, location.origin);
  if (target.pathname === '/api/meta') return snapshot.meta;
  if (target.pathname === '/api/run') {
    const key = [target.searchParams.get('tool'), ...target.searchParams.getAll('arg')].filter(Boolean).join(':');
    return snapshot.run?.[key] || { ok: false, error: `Static snapshot missing ${key}` };
  }
  return { ok: false, error: `Static snapshot missing ${target.pathname}` };
}

async function getJson(url) {
  if (staticMode) return getStaticJson(url);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

async function load() {
  try {
    const meta = await getJson('/api/meta');
    state.meta = meta?.ok ? meta : state.meta;

    if (forceMock) {
      state.matches = mockMatches;
      state.updatedAt = new Date();
      state.error = '';
      render();
      return;
    }

    const [schedule, standings] = await Promise.allSettled([
      getJson('/api/run?tool=schedule&arg=today'),
      getJson('/api/run?tool=rankings&arg=standings')
    ]);

    const scheduleData = schedule.value?.ok ? schedule.value.data : [];
    state.matches = Array.isArray(scheduleData) && scheduleData.length ? scheduleData : mockMatches;
    state.standings = standings.value?.ok ? standings.value.data : state.standings;
    state.updatedAt = new Date();
    state.error = '';
  } catch (error) {
    state.error = error.message;
    state.matches = state.matches.length ? state.matches : mockMatches;
  }
  render();
}

function pickFocus() {
  const live = state.matches.find((match) => match.statusId === '1' || /进行中/.test(match.status || ''));
  const finished = state.matches.find((match) => /已结束/.test(match.status || '') && parseScore(match).home !== null);
  return live || finished || state.matches[state.activeIndex % Math.max(state.matches.length, 1)] || mockMatches[0];
}

function pickNext(focus) {
  return state.matches.find((match) => match.matchId !== focus.matchId && /未开赛/.test(match.status || '')) ||
    state.matches.find((match) => match.matchId !== focus.matchId) ||
    mockMatches[1];
}

function parseScore(match) {
  const score = String(match.scoreLine || '').match(/(\d+)\s*-\s*(\d+)/);
  if (score) return { home: score[1], away: score[2] };
  if (match.homeScore !== null && match.homeScore !== undefined) return { home: match.homeScore, away: match.awayScore ?? 0 };
  return { home: 0, away: 0 };
}

function statusText(match) {
  if (/进行中/.test(match.status || '')) return "74'";
  if (/已结束/.test(match.status || '')) return 'FT';
  return match.time || '--:--';
}

function eventText(focus) {
  if (/进行中/.test(focus.status || '')) return `GOAL ${focus.awayTeam === '摩洛哥' ? '毛里西奥' : focus.awayTeam} 74'`;
  if (/已结束/.test(focus.status || '')) return `战报 ${focus.homeTeam} ${focus.scoreLine} ${focus.awayTeam}`;
  return `开赛预告 ${focus.time || '--:--'} ${focus.homeTeam} vs ${focus.awayTeam}`;
}

function tableCue(focus) {
  const groups = state.standings?.groups || [];
  const group = groups.find((item) => (item.groupName || item.name || '').includes(focus.group || '')) || groups[0];
  const first = group?.list?.[0];
  if (first) return `${group.groupName || focus.group + '组'} ${first.teamName} ${first.points}分领跑`;
  return `${focus.group || 'C'}组出线形势：小组前2 + 8个最好第3晋级`;
}

function ticker(focus, next) {
  const lines = [
    `今日赛程 ${state.matches.slice(0, 4).map((m) => `${m.time || '--:--'} ${m.homeTeam}vs${m.awayTeam}`).join('  ·  ')}`,
    `进球播报 ${eventText(focus)}`,
    `积分变化 ${tableCue(focus)}`,
    `互动提问 你更看好${focus.homeTeam}继续压上，还是${focus.awayTeam}反击扳平？`
  ];
  return [...lines, ...lines].join('     ');
}

function render() {
  const focus = pickFocus();
  const next = pickNext(focus);
  const score = parseScore(focus);
  const currentCue = cueChips[state.cue % cueChips.length];
  const refreshAt = new Date(state.updatedAt.getTime() + refreshMs);

  root.innerHTML = `
    <section class="broadcast-frame">
      <div class="brand-panel">
        <div class="brand-title">
          <span class="brand-mark">J</span>
          <div>
            <h1>Jaco 官方文字直播</h1>
            <p>${icon('signal')} Skill Live · ${state.error ? '演示降级' : '实时同步'}</p>
          </div>
        </div>
        <div class="refresh-line">${icon('clock')} 下次刷新 ${timeLabel(refreshAt)}</div>
      </div>

      <div class="score-panel">
        <div class="match-meta">
          <span>${focus.stage || `${focus.group || 'C'}组第1轮`}</span>
          <strong>${statusText(focus)}</strong>
          <span>${focus.status || '进行中'}</span>
        </div>
        <div class="score-line">
          <strong class="team home">${focus.homeTeam}</strong>
          <span class="score-num">${score.home}</span>
          <em>-</em>
          <span class="score-num away">${score.away}</span>
          <strong class="team away">${focus.awayTeam}</strong>
        </div>
        <div class="event-strip"><b>${eventText(focus)}</b><span>${tableCue(focus)}</span></div>
      </div>

      <aside class="next-panel">
        <span>下一场</span>
        <strong>${next.time || '09:00'} ${next.homeTeam} vs ${next.awayTeam}</strong>
        <p>${next.stage || '小组赛'} · 热度 ${next.hot ?? '--'} · ${tableCue(focus)}</p>
      </aside>

      <div class="cue-panel">
        ${cueChips.map((cue, index) => `<button data-cue="${index}" class="${cue === currentCue ? 'active' : ''}">${cue}</button>`).join('')}
      </div>

      <div class="ticker">
        <span>${ticker(focus, next)}</span>
      </div>
    </section>
  `;
  bind();
}

function timeLabel(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

load();
function bind() {
  document.querySelectorAll('[data-cue]').forEach((button) => {
    button.addEventListener('click', () => {
      state.cue = Number(button.dataset.cue);
      render();
    });
  });
}

window.addEventListener('keydown', (event) => {
  if (['1', '2', '3'].includes(event.key)) {
    state.cue = Number(event.key) - 1;
    render();
  }
});

setInterval(() => {
  state.activeIndex += 1;
  state.cue += 1;
  render();
}, 8000);
scheduleAlignedRefresh();

function nextAlignedDelay() {
  const now = Date.now();
  const nextBoundary = (Math.floor(now / refreshMs) + 1) * refreshMs;
  return Math.max(1000, nextBoundary - now + refreshOffsetMs);
}

function scheduleAlignedRefresh() {
  window.setTimeout(async () => {
    await load();
    scheduleAlignedRefresh();
  }, nextAlignedDelay());
}
