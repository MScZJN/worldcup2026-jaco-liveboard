const root = document.querySelector('#studio');
const params = new URLSearchParams(location.search);
const forceMock = params.get('mock') === '1';
const transparent = params.get('transparent') === '1';
const refreshMs = Number(params.get('refresh') || 45000);
const initialLang = params.get('lang') || localStorage.getItem('studio-lang') || 'ar';
const staticMode = params.get('static') === '1' || location.hostname === 'worldcup2026.jiananzhu.cloud' || location.hostname.endsWith('.github.io');

if (transparent) document.body.classList.add('transparent');

const state = {
  lang: initialLang === 'en' ? 'en' : 'ar',
  meta: null,
  matches: [],
  odds: [],
  standings: null,
  activeIndex: 0,
  cue: 0,
  updatedAt: new Date(),
  error: ''
};

const i18n = {
  en: {
    htmlLang: 'en',
    dir: 'ltr',
    brand: 'Jaco Live',
    subtitle: 'Official text broadcast',
    skill: 'Skill Live',
    liveSync: 'real-time sync',
    mock: 'demo fallback',
    next: 'Next',
    hostSlot: 'Host position',
    interaction: 'Live interaction',
    schedule: "Today's matches",
    qualification: 'Qualification · Group',
    talking: 'Presenter rundown',
    home: 'Home',
    away: 'Away',
    live: 'Live',
    finished: 'Full time',
    pending: 'Not started',
    heat: 'Heat',
    matchFlow: 'Match flow',
    oddsWatch: 'Odds watch',
    audienceQuestion: 'Audience question',
    flowCopy: (home, away) => `${home} press high; ${away} look for space on counters`,
    questionCopy: (home, away) => `Do you back ${home} to extend the lead, or ${away} to answer?`,
    tickerQuestion: (home) => `Should ${home} keep attacking or slow the tempo?`,
    goal: 'GOAL',
    report: 'Report',
    preview: 'Kickoff preview',
    odds: 'Win/Draw/Lose',
    cues: ['Talking points', 'Odds', 'Qualification'],
    chats: [
      ['JACO-1024', 'Will Brazil keep pushing forward?'],
      ['Fan Riyadh', 'Morocco counterattacks are quick; the wing is the key.'],
      ['Data Desk', 'Could goal difference decide the third-place race?'],
      ['Viewer Noura', 'Who is more watchable in Haiti vs Scotland?']
    ],
    tickerLabels: {
      schedule: "Today's matches",
      goal: 'Goal alert',
      odds: 'Odds',
      question: 'Audience question'
    }
  },
  ar: {
    htmlLang: 'ar',
    dir: 'rtl',
    brand: 'Jaco Live',
    subtitle: 'البث النصي الرسمي',
    skill: 'Skill Live',
    liveSync: 'مزامنة مباشرة',
    mock: 'وضع تجريبي',
    next: 'التالي',
    hostSlot: 'موضع المعلق',
    interaction: 'التفاعل المباشر',
    schedule: 'مباريات اليوم',
    qualification: 'فرص التأهل · المجموعة',
    talking: 'محاور المعلق',
    home: 'صاحب الأرض',
    away: 'الضيف',
    live: 'مباشر',
    finished: 'انتهت',
    pending: 'لم تبدأ',
    heat: 'الاهتمام',
    matchFlow: 'إيقاع المباراة',
    oddsWatch: 'قراءة الاحتمالات',
    audienceQuestion: 'سؤال للجمهور',
    flowCopy: (home, away) => `${home} يضغط عالياً، و${away} يبحث عن المساحات في المرتدات`,
    questionCopy: (home, away) => `هل تتوقع أن يوسع ${home} الفارق أم يعود ${away}؟`,
    tickerQuestion: (home) => `هل على ${home} مواصلة الهجوم أم تهدئة الإيقاع؟`,
    goal: 'هدف',
    report: 'تقرير',
    preview: 'قبل البداية',
    odds: 'فوز / تعادل / خسارة',
    cues: ['نقاط الحديث', 'الاحتمالات', 'التأهل'],
    chats: [
      ['JACO-1024', 'هل سيواصل البرازيل الضغط للأمام؟'],
      ['مشجع الرياض', 'مرتدات المغرب سريعة، والطرف سيكون مفتاحاً.'],
      ['منصة البيانات', 'هل يؤثر فارق الأهداف على ترتيب الثالث؟'],
      ['نورة', 'من الأجدر بالمتابعة في هايتي ضد اسكتلندا؟']
    ],
    tickerLabels: {
      schedule: 'مباريات اليوم',
      goal: 'تنبيه هدف',
      odds: 'الاحتمالات',
      question: 'سؤال الجمهور'
    }
  }
};

const teamNames = {
  巴西: { en: 'Brazil', ar: 'البرازيل' },
  摩洛哥: { en: 'Morocco', ar: 'المغرب' },
  海地: { en: 'Haiti', ar: 'هايتي' },
  苏格兰: { en: 'Scotland', ar: 'اسكتلندا' },
  美国: { en: 'United States', ar: 'الولايات المتحدة' },
  巴拉圭: { en: 'Paraguay', ar: 'باراغواي' },
  澳大利亚: { en: 'Australia', ar: 'أستراليا' },
  土耳其: { en: 'Türkiye', ar: 'تركيا' },
  卡塔尔: { en: 'Qatar', ar: 'قطر' },
  瑞士: { en: 'Switzerland', ar: 'سويسرا' },
  德国: { en: 'Germany', ar: 'ألمانيا' },
  日本: { en: 'Japan', ar: 'اليابان' },
  西班牙: { en: 'Spain', ar: 'إسبانيا' },
  法国: { en: 'France', ar: 'فرنسا' },
  阿根廷: { en: 'Argentina', ar: 'الأرجنتين' },
  英格兰: { en: 'England', ar: 'إنجلترا' },
  新西兰: { en: 'New Zealand', ar: 'نيوزيلندا' }
};

const mockMatches = [
  {
    matchId: 'studio-live-brazil-morocco',
    date: '2026-06-14',
    time: '06:00',
    stage: 'C组第1轮',
    group: 'C',
    homeTeam: '巴西',
    awayTeam: '摩洛哥',
    scoreLine: '2-1',
    homeScore: 2,
    awayScore: 1,
    status: '进行中',
    statusId: '1',
    hot: 88
  },
  {
    matchId: 'studio-next-haiti-scotland',
    date: '2026-06-14',
    time: '09:00',
    stage: 'C组第1轮',
    group: 'C',
    homeTeam: '海地',
    awayTeam: '苏格兰',
    scoreLine: '-',
    status: '未开赛',
    statusId: '0',
    hot: 29
  },
  {
    matchId: 'studio-next-usa-paraguay',
    date: '2026-06-14',
    time: '09:00',
    stage: 'D组第1轮',
    group: 'D',
    homeTeam: '美国',
    awayTeam: '巴拉圭',
    scoreLine: '4-1',
    status: '已结束',
    statusId: '2',
    hot: 51
  },
  {
    matchId: 'studio-next-australia-turkey',
    date: '2026-06-14',
    time: '12:00',
    stage: 'D组第1轮',
    group: 'D',
    homeTeam: '澳大利亚',
    awayTeam: '土耳其',
    scoreLine: '-',
    status: '未开赛',
    statusId: '0',
    hot: 33
  }
];

const mockOdds = [
  {
    homeTeam: '巴西',
    awayTeam: '摩洛哥',
    pools: [
      { poolCode: 'had', name: '胜平负', homeWin: '1.49', draw: '3.60', awayWin: '5.55' },
      { poolCode: 'hhad', name: '让球', goalLine: '-1', homeWin: '2.72', draw: '3.11', awayWin: '2.27' }
    ]
  }
];

function icon(name) {
  const common = 'width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"';
  const paths = {
    signal: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 20h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 5h-5L8 10l4-3Z"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    chart: '<path d="M4 19V5"/><path d="M8 19v-7"/><path d="M12 19V9"/><path d="M16 19v-4"/><path d="M20 19V7"/>',
    chat: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
    spark: '<path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/>'
  };
  return `<svg ${common}>${paths[name] || paths.spark}</svg>`;
}

function t() {
  return i18n[state.lang];
}

function localTeam(name) {
  return teamNames[name]?.[state.lang] || name;
}

function groupLabel(match) {
  const group = match.group || 'C';
  return state.lang === 'ar' ? `المجموعة ${group}` : `Group ${group}`;
}

function stageLabel(match) {
  const round = String(match.stage || '').match(/第(\d)轮/)?.[1] || '1';
  if (state.lang === 'ar') return `${groupLabel(match)} · الجولة ${round}`;
  return `${groupLabel(match)} · Round ${round}`;
}

function statusLabel(match) {
  if (match.statusId === '1' || /进行中/.test(match.status || '')) return t().live;
  if (match.statusId === '2' || /已结束/.test(match.status || '')) return t().finished;
  return t().pending;
}

let staticSnapshotPromise = null;

async function getStaticSnapshot() {
  staticSnapshotPromise ||= fetch('./data/snapshot.json', { cache: 'no-store' }).then((response) => {
    if (!response.ok) throw new Error(`static snapshot ${response.status}`);
    return response.json();
  });
  return staticSnapshotPromise;
}

async function getStaticJson(url) {
  const snapshot = await getStaticSnapshot();
  const target = new URL(url, location.origin);
  if (target.pathname === '/api/meta') return snapshot.meta;
  if (target.pathname === '/api/odds') return snapshot.odds;
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
      state.odds = mockOdds;
      state.updatedAt = new Date();
      state.error = '';
      render();
      return;
    }

    const [schedule, odds, standings] = await Promise.allSettled([
      getJson('/api/run?tool=schedule&arg=today'),
      getJson('/api/odds?wc=1&pool=summary'),
      getJson('/api/run?tool=rankings&arg=standings')
    ]);

    const liveSchedule = schedule.value?.ok ? schedule.value.data : [];
    state.matches = Array.isArray(liveSchedule) && liveSchedule.length ? liveSchedule : mockMatches;
    const oddsMatches = odds.value?.data?.matches || [];
    state.odds = oddsMatches.length ? oddsMatches : mockOdds;
    state.standings = standings.value?.ok ? standings.value.data : state.standings;
    state.updatedAt = new Date();
    state.error = '';
  } catch (error) {
    state.error = error.message;
    state.matches = state.matches.length ? state.matches : mockMatches;
    state.odds = state.odds.length ? state.odds : mockOdds;
  }
  render();
}

function focusMatch() {
  const live = state.matches.find((match) => match.statusId === '1' || /进行中/.test(match.status || ''));
  return live || state.matches[state.activeIndex % Math.max(state.matches.length, 1)] || mockMatches[0];
}

function nextMatches(focus) {
  return state.matches.filter((match) => match.matchId !== focus.matchId).slice(0, 4);
}

function score(match) {
  const found = String(match.scoreLine || '').match(/(\d+)\s*-\s*(\d+)/);
  if (found) return [found[1], found[2]];
  if (match.homeScore !== null && match.homeScore !== undefined) return [match.homeScore, match.awayScore ?? 0];
  return ['0', '0'];
}

function matchMinute(match) {
  if (/进行中/.test(match.status || '')) return "74'";
  if (/已结束/.test(match.status || '')) return 'FT';
  return match.time || '--:--';
}

function eventText(match) {
  if (/进行中/.test(match.status || '')) {
    return state.lang === 'ar' ? `هدف موريسيو 74'` : `GOAL Mauricio 74'`;
  }
  if (/已结束/.test(match.status || '')) {
    return `${t().report} ${localTeam(match.homeTeam)} ${match.scoreLine} ${localTeam(match.awayTeam)}`;
  }
  return `${t().preview} ${match.time || '--:--'} ${localTeam(match.homeTeam)} vs ${localTeam(match.awayTeam)}`;
}

function oddsText(match) {
  const related = state.odds.find((item) => [item.homeTeam, item.awayTeam].some((name) => name && (match.homeTeam.includes(name) || match.awayTeam.includes(name) || name.includes(match.homeTeam) || name.includes(match.awayTeam)))) || state.odds[0] || mockOdds[0];
  const had = related.pools?.find((pool) => pool.poolCode === 'had') || related.pools?.[0];
  if (!had) return `${t().odds} -- / -- / --`;
  return `${t().odds} ${had.homeWin || '-'} / ${had.draw || '-'} / ${had.awayWin || '-'}`;
}

function groupStanding(match) {
  const groups = state.standings?.groups || [];
  const group = groups.find((item) => (item.groupName || item.name || '').includes(match.group || '')) || groups[0];
  if (group?.list?.length) return group.list.slice(0, 4);
  const teams = [match.homeTeam, match.awayTeam, '海地', '苏格兰'];
  return teams.map((team, index) => ({ teamName: team, points: index === 0 ? 3 : 0, goals: index === 0 ? '2/1' : '0/0' }));
}

function tickerText(focus, next) {
  const schedule = [focus, ...next].slice(0, 5).map((match) => `${match.time || matchMinute(match)} ${localTeam(match.homeTeam)} vs ${localTeam(match.awayTeam)}`).join('  ·  ');
  return [
    `${t().tickerLabels.schedule} ${schedule}`,
    `${t().tickerLabels.goal} ${eventText(focus)}`,
    `${t().tickerLabels.odds} ${oddsText(focus)}`,
    `${t().tickerLabels.question} ${t().tickerQuestion(localTeam(focus.homeTeam))}`
  ].join('     ');
}

function setLanguage(lang) {
  state.lang = lang === 'en' ? 'en' : 'ar';
  localStorage.setItem('studio-lang', state.lang);
  const url = new URL(location.href);
  url.searchParams.set('lang', state.lang);
  history.replaceState(null, '', url);
  render();
}

function render() {
  const copy = t();
  document.documentElement.lang = copy.htmlLang;
  document.documentElement.dir = copy.dir;
  document.body.classList.toggle('lang-ar', state.lang === 'ar');
  document.body.classList.toggle('lang-en', state.lang === 'en');

  const focus = focusMatch();
  const next = nextMatches(focus);
  const [homeScore, awayScore] = score(focus);
  const standings = groupStanding(focus);
  const activeCue = copy.cues[state.cue % copy.cues.length];

  root.innerHTML = `
    <section class="studio-scene">
      <header class="top-strip">
        <div class="brand">
          <span class="jaco-mark">J</span>
          <div>
            <h1>${copy.brand}</h1>
            <strong>${copy.subtitle}</strong>
            <p>${icon('signal')} ${copy.skill} · ${state.error ? copy.mock : copy.liveSync} · ${timeLabel(state.updatedAt)}</p>
          </div>
        </div>
        <div class="top-score">
          <b>${localTeam(focus.homeTeam)}</b>
          <strong>${homeScore} - ${awayScore}</strong>
          <b>${localTeam(focus.awayTeam)}</b>
          <span>${matchMinute(focus)} · ${stageLabel(focus)}</span>
        </div>
        <div class="next-mini">
          <span>${copy.next} ${next[0]?.time || '09:00'} ${localTeam(next[0]?.homeTeam || '海地')} vs ${localTeam(next[0]?.awayTeam || '苏格兰')}</span>
          <div class="language-switch" aria-label="Language switch">
            <button data-lang="en" class="${state.lang === 'en' ? 'active' : ''}">EN</button>
            <button data-lang="ar" class="${state.lang === 'ar' ? 'active' : ''}">العربية</button>
          </div>
        </div>
      </header>

      <section class="main-board">
        <article class="hero-card">
          <div class="hero-meta">
            <span>${statusLabel(focus)}</span>
            <span>${stageLabel(focus)}</span>
            <span>${copy.heat} ${focus.hot ?? 88}</span>
          </div>
          <div class="scoreboard">
            <div class="team-card home"><small>${copy.home}</small><b>${localTeam(focus.homeTeam)}</b></div>
            <strong class="score">${homeScore}<em>-</em>${awayScore}</strong>
            <div class="team-card away"><small>${copy.away}</small><b>${localTeam(focus.awayTeam)}</b></div>
          </div>
          <div class="goal-alert">${icon('ball')} <b>${eventText(focus)}</b><span>${oddsText(focus)}</span></div>
        </article>

        <article class="talking-points">
          <h2>${copy.talking}</h2>
          <div class="point-grid">
            <div><span>${copy.matchFlow}</span><b>${copy.flowCopy(localTeam(focus.homeTeam), localTeam(focus.awayTeam))}</b></div>
            <div><span>${copy.oddsWatch}</span><b>${oddsText(focus)}</b></div>
            <div><span>${copy.audienceQuestion}</span><b>${copy.questionCopy(localTeam(focus.homeTeam), localTeam(focus.awayTeam))}</b></div>
          </div>
        </article>

        <article class="schedule-card">
          <h2>${icon('calendar')} ${copy.schedule}</h2>
          ${[focus, ...next].slice(0, 5).map((match) => `
            <div class="schedule-row">
              <span>${match.time || matchMinute(match)}</span>
              <b>${localTeam(match.homeTeam)} <em>vs</em> ${localTeam(match.awayTeam)}</b>
              <i>${statusLabel(match)}</i>
            </div>
          `).join('')}
        </article>

        <article class="standing-card">
          <h2>${icon('chart')} ${copy.qualification} ${focus.group || 'C'}</h2>
          ${standings.map((team, index) => `
            <div class="standing-row">
              <span>${index + 1}</span>
              <b>${localTeam(team.teamName)}</b>
              <i>${team.goals || '0/0'}</i>
              <strong>${team.points ?? 0}</strong>
            </div>
          `).join('')}
        </article>
      </section>

      <aside class="side-rail">
        <section class="host-box">
          <div class="camera-frame">
            <div class="camera-grid"></div>
            <span>${copy.hostSlot}</span>
          </div>
          <div class="cue-buttons">
            ${copy.cues.map((cue, index) => `<button data-cue="${index}" class="${cue === activeCue ? 'active' : ''}">${cue}</button>`).join('')}
          </div>
        </section>

        <section class="chat-box">
          <h2>${icon('chat')} ${copy.interaction}</h2>
          ${copy.chats.map(([name, text]) => `
            <div class="chat-row">
              <span>${name}</span>
              <p>${text}</p>
            </div>
          `).join('')}
        </section>
      </aside>

      <footer class="bottom-ticker">
        <span>${tickerText(focus, next)}     ${tickerText(focus, next)}</span>
      </footer>
    </section>
  `;
  bind();
}

function bind() {
  document.querySelectorAll('[data-cue]').forEach((button) => {
    button.addEventListener('click', () => {
      state.cue = Number(button.dataset.cue);
      render();
    });
  });
  document.querySelectorAll('[data-lang]').forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.lang));
  });
}

function timeLabel(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

window.addEventListener('keydown', (event) => {
  if (['1', '2', '3'].includes(event.key)) {
    state.cue = Number(event.key) - 1;
    render();
  }
  if (event.key.toLowerCase() === 'l') {
    setLanguage(state.lang === 'ar' ? 'en' : 'ar');
  }
});

load();
setInterval(() => {
  state.activeIndex += 1;
  state.cue += 1;
  render();
}, 9000);
setInterval(load, refreshMs);
