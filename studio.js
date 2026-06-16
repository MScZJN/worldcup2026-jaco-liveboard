const root = document.querySelector('#studio');
const params = new URLSearchParams(location.search);
const forceMock = params.get('mock') === '1';
const transparent = params.get('transparent') === '1';
const refreshMs = Number(params.get('refresh') || 45000);
const refreshOffsetMs = Number(params.get('refreshOffset') || 600);
const initialLang = params.get('lang') || localStorage.getItem('studio-lang') || 'ar';
const staticMode = params.get('static') === '1' || location.hostname === 'worldcup2026.jiananzhu.cloud' || location.hostname.endsWith('.github.io');

if (transparent) document.body.classList.add('transparent');

const state = {
  lang: initialLang === 'en' ? 'en' : 'ar',
  meta: null,
  matches: [],
  odds: [],
  standings: null,
  selectedMatchId: params.get('match'),
  filter: params.get('filter') || 'all',
  cue: 0,
  updatedAt: new Date(),
  error: ''
};

const i18n = {
  en: {
    htmlLang: 'en',
    dir: 'ltr',
    brand: 'Jaco World Cup 2026 Dashboard',
    subtitle: 'Official match control desk',
    skill: 'Skill Live',
    liveSync: 'live data',
    mock: 'static fallback',
    refreshSync: '45s sync',
    selected: 'Selected match',
    allMatches: 'Match schedule',
    noMatches: 'No fixtures in this status',
    controlHint: 'UTC+3 · Click a fixture on the left. Use 1/2/3 for the discussion angle.',
    scheduleMeta: 'Full fixture control',
    utc3: 'UTC+3',
    discussionFocus: 'Discussion focus',
    hostBoard: 'Host board',
    interaction: 'Audience interaction',
    qualification: 'Qualification · Group',
    home: 'Home',
    away: 'Away',
    live: 'Live',
    finished: 'Full time',
    pending: 'Not started',
    heat: 'Heat',
    report: 'Report',
    preview: 'Kickoff preview',
    odds: 'Win/Draw/Lose',
    cues: ['Highlights', 'Prediction/Odds', 'Qualification'],
    filters: {
      all: 'All',
      finished: 'Finished',
      live: 'Live',
      upcoming: 'Not started'
    },
    phases: {
      finished: 'Post-match review',
      live: 'Live tracking',
      upcoming: 'Pre-match prediction'
    },
    phaseCopy: {
      finished: 'Lead the discussion with the final result, decisive highlights, turning points, and what the result changes in the group.',
      live: 'Anchor the talk on the current score, latest highlights, momentum swings, and what to watch over the next few minutes.',
      upcoming: 'Before kickoff, focus on prediction, tactical matchup, odds movement, likely first goal, and audience voting.'
    },
    phaseLabel: {
      finished: 'Result room',
      live: 'Live room',
      upcoming: 'Prediction room'
    },
    chats: [
      ['JACO-1024', 'Which highlight should we replay first?'],
      ['Fan Riyadh', 'The left side matchup feels decisive tonight.'],
      ['Data Desk', 'Goal difference may become the group story.'],
      ['Viewer Noura', 'Ask the room for score predictions before kickoff.']
    ],
    tickerLabels: {
      schedule: "Today's schedule",
      highlight: 'Highlight',
      odds: 'Odds',
      question: 'Audience question'
    }
  },
  ar: {
    htmlLang: 'ar',
    dir: 'rtl',
    brand: 'Jaco World Cup 2026 Dashboard',
    subtitle: 'لوحة التحكم الرسمية للمباريات',
    skill: 'Skill Live',
    liveSync: 'بيانات مباشرة',
    mock: 'بيانات ثابتة',
    refreshSync: 'تحديث 45ث',
    selected: 'المباراة المختارة',
    allMatches: 'جدول المباريات',
    noMatches: 'لا توجد مباريات بهذه الحالة',
    controlHint: 'UTC+3 · اختر مباراة من اليسار. استخدم 1/2/3 لتغيير زاوية النقاش.',
    scheduleMeta: 'تحكم كامل بالجدول',
    utc3: 'UTC+3',
    discussionFocus: 'محور النقاش',
    hostBoard: 'لوحة المعلق',
    interaction: 'تفاعل الجمهور',
    qualification: 'فرص التأهل · المجموعة',
    home: 'صاحب الأرض',
    away: 'الضيف',
    live: 'مباشر',
    finished: 'انتهت',
    pending: 'لم تبدأ',
    heat: 'الاهتمام',
    report: 'تقرير',
    preview: 'قبل البداية',
    odds: 'فوز / تعادل / خسارة',
    cues: ['اللقطات', 'التوقعات/الاحتمالات', 'التأهل'],
    filters: {
      all: 'الكل',
      finished: 'انتهت',
      live: 'مباشر',
      upcoming: 'لم تبدأ'
    },
    phases: {
      finished: 'مراجعة ما بعد المباراة',
      live: 'متابعة مباشرة',
      upcoming: 'توقعات قبل البداية'
    },
    phaseCopy: {
      finished: 'ابدأ النقاش بالنتيجة النهائية، أبرز اللقطات، نقاط التحول، وتأثير النتيجة على المجموعة.',
      live: 'اجعل الحديث حول النتيجة الحالية، آخر اللقطات، تغير الإيقاع، وما يجب مراقبته في الدقائق القادمة.',
      upcoming: 'قبل البداية ركز على التوقعات، المواجهة التكتيكية، حركة الاحتمالات، الهدف الأول، وتصويت الجمهور.'
    },
    phaseLabel: {
      finished: 'غرفة النتيجة',
      live: 'غرفة المباشر',
      upcoming: 'غرفة التوقعات'
    },
    chats: [
      ['JACO-1024', 'أي لقطة نعيدها أولاً؟'],
      ['مشجع الرياض', 'مواجهة الجهة اليسرى تبدو حاسمة الليلة.'],
      ['منصة البيانات', 'فارق الأهداف قد يصبح قصة المجموعة.'],
      ['نورة', 'اسأل الجمهور عن توقع النتيجة قبل البداية.']
    ],
    tickerLabels: {
      schedule: 'جدول اليوم',
      highlight: 'لقطة',
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
  美国: { en: 'USA', ar: 'أمريكا' },
  巴拉圭: { en: 'Paraguay', ar: 'باراغواي' },
  澳大利亚: { en: 'Australia', ar: 'أستراليا' },
  土耳其: { en: 'Türkiye', ar: 'تركيا' },
  卡塔尔: { en: 'Qatar', ar: 'قطر' },
  瑞士: { en: 'Switzerland', ar: 'سويسرا' },
  德国: { en: 'Germany', ar: 'ألمانيا' },
  日本: { en: 'Japan', ar: 'اليابان' },
  西班牙: { en: 'Spain', ar: 'إسبانيا' },
  佛得角: { en: 'Cape Verde', ar: 'الرأس الأخضر' },
  比利时: { en: 'Belgium', ar: 'بلجيكا' },
  埃及: { en: 'Egypt', ar: 'مصر' },
  沙特阿拉伯: { en: 'Saudi Arabia', ar: 'السعودية' },
  乌拉圭: { en: 'Uruguay', ar: 'أوروغواي' },
  伊朗: { en: 'Iran', ar: 'إيران' },
  法国: { en: 'France', ar: 'فرنسا' },
  塞内加尔: { en: 'Senegal', ar: 'السنغال' },
  伊拉克: { en: 'Iraq', ar: 'العراق' },
  挪威: { en: 'Norway', ar: 'النرويج' },
  阿根廷: { en: 'Argentina', ar: 'الأرجنتين' },
  阿尔及利亚: { en: 'Algeria', ar: 'الجزائر' },
  奥地利: { en: 'Austria', ar: 'النمسا' },
  约旦: { en: 'Jordan', ar: 'الأردن' },
  葡萄牙: { en: 'Portugal', ar: 'البرتغال' },
  刚果民主共和国: { en: 'DR Congo', ar: 'الكونغو الديمقراطية' },
  英格兰: { en: 'England', ar: 'إنجلترا' },
  克罗地亚: { en: 'Croatia', ar: 'كرواتيا' },
  加纳: { en: 'Ghana', ar: 'غانا' },
  巴拿马: { en: 'Panama', ar: 'بنما' },
  乌兹别克斯坦: { en: 'Uzbekistan', ar: 'أوزبكستان' },
  哥伦比亚: { en: 'Colombia', ar: 'كولومبيا' },
  捷克: { en: 'Czechia', ar: 'التشيك' },
  南非: { en: 'South Africa', ar: 'جنوب أفريقيا' },
  波黑: { en: 'Bosnia and Herzegovina', ar: 'البوسنة والهرسك' },
  加拿大: { en: 'Canada', ar: 'كندا' },
  墨西哥: { en: 'Mexico', ar: 'المكسيك' },
  韩国: { en: 'Korea Republic', ar: 'كوريا الجنوبية' },
  荷兰: { en: 'Netherlands', ar: 'هولندا' },
  科特迪瓦: { en: "Cote d'Ivoire", ar: 'كوت ديفوار' },
  厄瓜多尔: { en: 'Ecuador', ar: 'الإكوادور' },
  瑞典: { en: 'Sweden', ar: 'السويد' },
  突尼斯: { en: 'Tunisia', ar: 'تونس' },
  库拉索: { en: 'Curacao', ar: 'كوراساو' },
  新西兰: { en: 'New Zealand', ar: 'نيوزيلندا' }
};

const mockMatches = [
  { matchId: 'studio-live-brazil-morocco', date: '2026-06-14', time: '06:00', stage: 'C组第1轮', group: 'C', homeTeam: '巴西', awayTeam: '摩洛哥', scoreLine: '2-1', homeScore: 2, awayScore: 1, status: '进行中', statusId: '1', hot: 88 },
  { matchId: 'studio-next-haiti-scotland', date: '2026-06-14', time: '09:00', stage: 'C组第1轮', group: 'C', homeTeam: '海地', awayTeam: '苏格兰', scoreLine: '-', status: '未开赛', statusId: '0', hot: 29 },
  { matchId: 'studio-finished-usa-paraguay', date: '2026-06-13', time: '09:00', stage: 'D组第1轮', group: 'D', homeTeam: '美国', awayTeam: '巴拉圭', scoreLine: '4-1', status: '已结束', statusId: '2', hot: 51 },
  { matchId: 'studio-next-australia-turkey', date: '2026-06-14', time: '12:00', stage: 'D组第1轮', group: 'D', homeTeam: '澳大利亚', awayTeam: '土耳其', scoreLine: '-', status: '未开赛', statusId: '0', hot: 33 }
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

const phaseContent = {
  en: {
    finished: {
      label: 'Result discussion',
      cards: [
        ['Highlights', 'Goals, cards, saves, substitutions, and the one moment worth replaying first.'],
        ['Result debate', 'Was the score fair, or did one side leave too much on the field?'],
        ['Group impact', 'Who gained leverage, who is under pressure, and what fixture matters next?']
      ],
      prompts: ['Which moment decided the match?', 'Did the winner control the game or survive it?', 'What does this result change in the group?']
    },
    live: {
      label: 'Live result board',
      cards: [
        ['Current state', 'Score, clock, latest event, and the next five-minute question.'],
        ['Momentum', 'Pressure, counters, field tilt, and the player changing the match.'],
        ['Highlight watch', 'Goals, saves, VAR, cards, and set pieces that deserve instant replay.']
      ],
      prompts: ['Protect the result or keep attacking?', 'Where can the comeback come from?', 'Who is driving the match right now?']
    },
    upcoming: {
      label: 'Prediction studio',
      cards: [
        ['Win path', 'How each team can win: possession, transitions, set pieces, or late pressure.'],
        ['Odds reading', 'Use win/draw/lose and handicap movement as a discussion anchor, not betting advice.'],
        ['Audience vote', 'Ask for score predictions, first scorer, and upset probability.']
      ],
      prompts: ['What score do viewers predict?', 'Who scores first?', 'Favorite control game or upset window?']
    }
  },
  ar: {
    finished: {
      label: 'نقاش النتيجة',
      cards: [
        ['أبرز اللقطات', 'الأهداف والبطاقات والتصديات والتبديلات واللحظة التي تستحق الإعادة أولاً.'],
        ['جدل النتيجة', 'هل كانت النتيجة عادلة أم أن فريقاً أهدر الكثير؟'],
        ['أثر المجموعة', 'من حصل على أفضلية، ومن أصبح تحت الضغط، وما المباراة التالية الأهم؟']
      ],
      prompts: ['ما اللحظة التي حسمت المباراة؟', 'هل سيطر الفائز أم نجا من الضغط؟', 'ماذا تغير هذه النتيجة في المجموعة؟']
    },
    live: {
      label: 'لوحة المتابعة المباشرة',
      cards: [
        ['الحالة الآن', 'النتيجة والوقت وآخر حدث وسؤال الدقائق الخمس القادمة.'],
        ['الإيقاع', 'الضغط والمرتدات ومناطق السيطرة واللاعب الذي يغير المباراة.'],
        ['لقطات بارزة', 'أهداف وتصديات وVAR وبطاقات وكرات ثابتة تستحق الإعادة فوراً.']
      ],
      prompts: ['يحافظ على النتيجة أم يواصل الهجوم؟', 'من أين تأتي العودة؟', 'من يقود المباراة الآن؟']
    },
    upcoming: {
      label: 'استوديو التوقعات',
      cards: [
        ['طريق الفوز', 'كيف يفوز كل فريق: الاستحواذ، التحولات، الكرات الثابتة، أو ضغط النهاية.'],
        ['قراءة الاحتمالات', 'استخدم الفوز/التعادل/الخسارة وحركة الخط كمدخل للنقاش وليس كنصيحة مراهنة.'],
        ['تصويت الجمهور', 'اسأل عن النتيجة المتوقعة وصاحب الهدف الأول واحتمال المفاجأة.']
      ],
      prompts: ['ما توقع الجمهور للنتيجة؟', 'من يسجل أولاً؟', 'سيطرة المرشح أم فرصة مفاجأة؟']
    }
  }
};

function icon(name) {
  const common = 'width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"';
  const paths = {
    signal: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 20h.01"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 5h-5L8 10l4-3Z"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    chart: '<path d="M4 19V5"/><path d="M8 19v-7"/><path d="M12 19V9"/><path d="M16 19v-4"/><path d="M20 19V7"/>',
    chat: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
    spark: '<path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z"/>'
  };
  return `<svg ${common}>${paths[name] || paths.spark}</svg>`;
}

function t() {
  return i18n[state.lang];
}

function localTeam(name) {
  return teamNames[name]?.[state.lang] || name || '';
}

function matchPhase(match) {
  if (match.statusId === '1' || /进行中|直播|live/i.test(match.status || '')) return 'live';
  if (match.statusId === '0' || /未开赛|未开始|待定|pending|not started/i.test(match.status || '')) return 'upcoming';
  if (match.statusId === '2' || /已结束|完场|结束|full/i.test(match.status || '') || /\d+\s*-\s*\d+/.test(match.scoreLine || '')) return 'finished';
  return 'upcoming';
}

function statusLabel(match) {
  const phase = matchPhase(match);
  if (phase === 'live') return t().live;
  if (phase === 'finished') return t().finished;
  return t().pending;
}

function setFilter(filter) {
  state.filter = ['all', 'finished', 'live', 'upcoming'].includes(filter) ? filter : 'all';
  const url = new URL(location.href);
  url.searchParams.set('filter', state.filter);
  if (!filteredMatches().some((match) => match.matchId === state.selectedMatchId)) {
    state.selectedMatchId = defaultFocusMatch().matchId;
    url.searchParams.set('match', state.selectedMatchId);
  }
  state.cue = 0;
  history.replaceState(null, '', url);
  render();
}

function syncActiveMatchView() {
  const active = document.querySelector('.match-item.active');
  if (!active) return;
  active.scrollIntoView({ block: 'nearest' });
}

function groupLabel(match) {
  const group = match.group || 'C';
  return state.lang === 'ar' ? `المجموعة ${group}` : `Group ${group}`;
}

function stageLabel(match) {
  const round = String(match.stage || '').match(/第(\d)轮/)?.[1] || '1';
  return state.lang === 'ar' ? `${groupLabel(match)} · الجولة ${round}` : `${groupLabel(match)} · Round ${round}`;
}

function displayDateTime(match) {
  if (match.startTimeStamp) {
    const date = new Date((Number(match.startTimeStamp) + 3 * 60 * 60) * 1000);
    return {
      date: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`,
      time: `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
    };
  }
  const [hour = '00', minute = '00'] = String(match.time || '00:00').split(':');
  const utc3Hour = (Number(hour) + 19) % 24;
  return {
    date: match.date || '',
    time: `${String(utc3Hour).padStart(2, '0')}:${minute.padStart(2, '0')}`
  };
}

function score(match) {
  const found = String(match.scoreLine || '').match(/(\d+)\s*-\s*(\d+)/);
  if (found) return [found[1], found[2]];
  if (match.homeScore !== null && match.homeScore !== undefined) return [match.homeScore, match.awayScore ?? 0];
  return ['0', '0'];
}

function matchMinute(match) {
  const phase = matchPhase(match);
  if (phase === 'live') return "74'";
  if (phase === 'finished') return 'FT';
  return displayDateTime(match).time || '--:--';
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
      state.selectedMatchId ||= defaultFocusMatch().matchId;
      state.updatedAt = new Date();
      state.error = '';
      render();
      return;
    }

    const [schedule, odds, standings] = await Promise.allSettled([
      getJson('/api/run?tool=schedule&arg=all'),
      getJson('/api/odds?wc=1&pool=summary'),
      getJson('/api/run?tool=rankings&arg=standings')
    ]);

    const liveSchedule = schedule.value?.ok ? schedule.value.data : [];
    state.matches = (Array.isArray(liveSchedule) && liveSchedule.length ? liveSchedule : mockMatches)
      .slice()
      .sort((a, b) => Number(a.startTimeStamp || 0) - Number(b.startTimeStamp || 0));
    const oddsMatches = odds.value?.data?.matches || [];
    state.odds = oddsMatches.length ? oddsMatches : mockOdds;
    state.standings = standings.value?.ok ? standings.value.data : state.standings;
    if (!state.selectedMatchId || !state.matches.some((match) => match.matchId === state.selectedMatchId)) {
      state.selectedMatchId = defaultFocusMatch().matchId;
    }
    state.updatedAt = new Date();
    state.error = '';
  } catch (error) {
    state.error = error.message;
    state.matches = state.matches.length ? state.matches : mockMatches;
    state.odds = state.odds.length ? state.odds : mockOdds;
    state.selectedMatchId ||= defaultFocusMatch().matchId;
  }
  render();
}

function defaultFocusMatch() {
  const pool = filteredMatches();
  const source = pool.length ? pool : state.matches;
  return source.find((match) => matchPhase(match) === 'live') ||
    source.find((match) => matchPhase(match) === 'upcoming') ||
    source[0] ||
    mockMatches[0];
}

function focusMatch() {
  return filteredMatches().find((match) => match.matchId === state.selectedMatchId) ||
    state.matches.find((match) => match.matchId === state.selectedMatchId) ||
    defaultFocusMatch();
}

function nextMatches(focus) {
  return filteredMatches().filter((match) => match.matchId !== focus.matchId).slice(0, 4);
}

function filteredMatches() {
  if (state.filter === 'all') return state.matches;
  return state.matches.filter((match) => matchPhase(match) === state.filter);
}

function filterCounts() {
  return ['all', 'finished', 'live', 'upcoming'].reduce((counts, filter) => {
    counts[filter] = filter === 'all' ? state.matches.length : state.matches.filter((match) => matchPhase(match) === filter).length;
    return counts;
  }, {});
}

function eventText(match) {
  const phase = matchPhase(match);
  if (phase === 'live') return state.lang === 'ar' ? `هدف موريسيو 74'` : `GOAL Mauricio 74'`;
  if (phase === 'finished') return `${t().report} ${localTeam(match.homeTeam)} ${match.scoreLine} ${localTeam(match.awayTeam)}`;
  return `${t().preview} ${displayDateTime(match).time || '--:--'} ${localTeam(match.homeTeam)} vs ${localTeam(match.awayTeam)}`;
}

function oddsText(match) {
  const related = state.odds.find((item) =>
    [item.homeTeam, item.awayTeam].some((name) => name && (
      match.homeTeam.includes(name) ||
      match.awayTeam.includes(name) ||
      name.includes(match.homeTeam) ||
      name.includes(match.awayTeam)
    ))
  ) || state.odds[0] || mockOdds[0];
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

function qualificationText(match) {
  const lead = groupStanding(match)[0];
  if (!lead) return state.lang === 'ar' ? 'المجموعة مفتوحة' : 'Group remains open';
  return state.lang === 'ar'
    ? `${localTeam(lead.teamName)} في المقدمة بـ ${lead.points ?? 0} نقاط`
    : `${localTeam(lead.teamName)} leads on ${lead.points ?? 0} pts`;
}

function predictionText(match) {
  const home = localTeam(match.homeTeam);
  const away = localTeam(match.awayTeam);
  return state.lang === 'ar'
    ? `${home} يبدأ كمرشح، و${away} يبحث عن التحولات`
    : `${home} control the ball; ${away} hunt transitions`;
}

function phaseModel(match) {
  const phase = matchPhase(match);
  const content = phaseContent[state.lang][phase];
  const [homeScore, awayScore] = score(match);
  const scoreLine = phase === 'upcoming' ? `${displayDateTime(match).time || '--:--'}` : `${homeScore} - ${awayScore}`;
  const metrics = phase === 'finished'
    ? [
        [state.lang === 'ar' ? 'النتيجة' : 'Result', scoreLine],
        [state.lang === 'ar' ? 'اللقطة الحاسمة' : 'Decisive clip', eventText(match)],
        [state.lang === 'ar' ? 'أثر المجموعة' : 'Group impact', qualificationText(match)]
      ]
    : phase === 'live'
      ? [
          [state.lang === 'ar' ? 'النتيجة الآن' : 'Now', scoreLine],
          [state.lang === 'ar' ? 'آخر حدث' : 'Latest highlight', eventText(match)],
          [state.lang === 'ar' ? 'قراءة الاحتمالات' : 'Odds read', oddsText(match)]
        ]
      : [
          [state.lang === 'ar' ? 'موعد البداية' : 'Kickoff', `${displayDateTime(match).time || '--:--'} ${t().utc3}`],
          [state.lang === 'ar' ? 'التوقع الرئيسي' : 'Main prediction', predictionText(match)],
          [state.lang === 'ar' ? 'قراءة الاحتمالات' : 'Odds read', oddsText(match)]
        ];

  return {
    phase,
    content,
    headline: t().phases[phase],
    summary: t().phaseCopy[phase],
    metrics
  };
}

function tickerText(focus, next) {
  const schedule = [focus, ...next].slice(0, 5).map((match) => `${displayDateTime(match).time || matchMinute(match)} ${localTeam(match.homeTeam)} vs ${localTeam(match.awayTeam)}`).join('  ·  ');
  return [
    `${t().tickerLabels.schedule} ${schedule}`,
    `${t().tickerLabels.highlight} ${eventText(focus)}`,
    `${t().tickerLabels.odds} ${oddsText(focus)}`,
    `${t().tickerLabels.question} ${phaseModel(focus).content.prompts[state.cue % 3]}`
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
  const counts = filterCounts();
  const visibleMatches = filteredMatches();
  const focusTime = displayDateTime(focus);
  const [homeScore, awayScore] = score(focus);
  const standings = groupStanding(focus);
  const phase = phaseModel(focus);
  const isUpcoming = phase.phase === 'upcoming';
  const displayScore = isUpcoming ? 'VS' : `${homeScore} - ${awayScore}`;
  const activeCue = copy.cues[state.cue % copy.cues.length];
  const activePrompt = phase.content.prompts[state.cue % phase.content.prompts.length];

  root.innerHTML = `
    <section class="studio-scene">
      <header class="top-strip">
        <div class="brand">
          <span class="jaco-mark">J</span>
          <div>
            <h1>${copy.brand}</h1>
            <strong>${copy.subtitle}</strong>
            <p>${icon('signal')} ${copy.skill} · ${state.error ? copy.mock : copy.liveSync} · ${copy.refreshSync} · ${timeLabel(state.updatedAt)}</p>
          </div>
        </div>
        <div class="top-score">
          <b>${localTeam(focus.homeTeam)}</b>
          <strong class="${isUpcoming ? 'is-vs' : ''}">${displayScore}</strong>
          <b>${localTeam(focus.awayTeam)}</b>
          <span>${focusTime.date} ${matchMinute(focus)} ${copy.utc3} · ${phase.headline}</span>
        </div>
        <div class="next-mini">
          <span>${copy.controlHint}</span>
          <div class="language-switch" aria-label="Language switch">
            <button data-lang="en" class="${state.lang === 'en' ? 'active' : ''}">EN</button>
            <button data-lang="ar" class="${state.lang === 'ar' ? 'active' : ''}">العربية</button>
          </div>
        </div>
      </header>

      <aside class="match-rail">
        <header>
          <h2>${icon('calendar')} ${copy.allMatches}</h2>
          <span>${copy.scheduleMeta} · ${state.matches.length} · ${copy.utc3}</span>
          <div class="filter-tabs" aria-label="${copy.allMatches}">
            ${['all', 'finished', 'live', 'upcoming'].map((filter) => `
              <button data-filter="${filter}" class="${state.filter === filter ? 'active' : ''}">
                <span>${copy.filters[filter]}</span>
                <b>${counts[filter]}</b>
              </button>
            `).join('')}
          </div>
        </header>
        <div class="match-list" role="listbox" aria-label="${copy.allMatches}">
          ${visibleMatches.length ? visibleMatches.map((match) => {
            const [h, a] = score(match);
            const itemPhase = matchPhase(match);
            const itemTime = displayDateTime(match);
            return `
              <button class="match-item ${match.matchId === focus.matchId ? 'active' : ''} phase-${itemPhase}" data-match-id="${match.matchId}" role="option" aria-selected="${match.matchId === focus.matchId}">
                <span class="match-time">${itemTime.time || matchMinute(match)}</span>
                <strong>${localTeam(match.homeTeam)} <em>vs</em> ${localTeam(match.awayTeam)}</strong>
                <small>${itemTime.date} · ${stageLabel(match)}</small>
                <b class="match-status">${itemPhase === 'upcoming' ? statusLabel(match) : `${h}-${a}`}</b>
              </button>
            `;
          }).join('') : `<div class="empty-state">${copy.noMatches}</div>`}
        </div>
      </aside>

      <section class="analysis-board phase-${phase.phase}">
        <article class="hero-card">
          <div class="hero-meta">
            <span>${copy.selected}</span>
            <span>${stageLabel(focus)}</span>
            <span>${phase.content.label}</span>
          </div>
          <div class="scoreboard">
            <div class="team-card home"><small>${copy.home}</small><b>${localTeam(focus.homeTeam)}</b></div>
            <strong class="score ${isUpcoming ? 'is-vs' : ''}">${isUpcoming ? 'VS' : `${homeScore}<em>-</em>${awayScore}`}</strong>
            <div class="team-card away"><small>${copy.away}</small><b>${localTeam(focus.awayTeam)}</b></div>
          </div>
          <div class="goal-alert">${icon('ball')} <b>${eventText(focus)}</b><span>${oddsText(focus)}</span></div>
        </article>

        <article class="phase-panel">
          <div>
            <h2>${phase.headline}</h2>
            <p>${phase.summary}</p>
          </div>
          <div class="metric-strip">
            ${phase.metrics.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('')}
          </div>
        </article>

        <article class="talking-points">
          <h2>${copy.discussionFocus}</h2>
          <div class="point-grid">
            ${phase.content.cards.map(([label, text], index) => `
              <button data-cue="${index}" class="${index === state.cue % 3 ? 'active' : ''}">
                <span>${label}</span>
                <b>${text}</b>
              </button>
            `).join('')}
          </div>
        </article>

        <article class="standing-card compact">
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
        <section class="agenda-box">
          <h2>${copy.hostBoard}</h2>
          <div class="active-prompt">
            <span>${activeCue}</span>
            <strong>${activePrompt}</strong>
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
  requestAnimationFrame(syncActiveMatchView);
}

function bind() {
  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      setFilter(button.dataset.filter || 'all');
    });
  });
  document.querySelectorAll('[data-match-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedMatchId = button.dataset.matchId;
      state.cue = 0;
      const url = new URL(location.href);
      url.searchParams.set('match', state.selectedMatchId);
      history.replaceState(null, '', url);
      render();
    });
  });
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
  const utc3 = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return `${String(utc3.getUTCHours()).padStart(2, '0')}:${String(utc3.getUTCMinutes()).padStart(2, '0')} UTC+3`;
}

window.addEventListener('keydown', (event) => {
  if (['1', '2', '3'].includes(event.key)) {
    state.cue = Number(event.key) - 1;
    render();
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    const pool = filteredMatches();
    if (!pool.length) return;
    const current = pool.findIndex((match) => match.matchId === focusMatch().matchId);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (current + delta + pool.length) % pool.length;
    state.selectedMatchId = pool[nextIndex]?.matchId || state.selectedMatchId;
    state.cue = 0;
    const url = new URL(location.href);
    url.searchParams.set('match', state.selectedMatchId);
    history.replaceState(null, '', url);
    render();
  }
  if (event.key.toLowerCase() === 'l') setLanguage(state.lang === 'ar' ? 'en' : 'ar');
  const filterKeys = { a: 'all', f: 'finished', v: 'live', u: 'upcoming' };
  const filter = filterKeys[event.key.toLowerCase()];
  if (filter) setFilter(filter);
});

load();
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
