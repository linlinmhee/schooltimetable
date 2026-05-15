// Theme presets + subject categorization
const THEME_PRESETS = [
  {
    id: 'space',
    name: 'Space',
    emoji: '🚀',
    preview: ['🚀','🪐','⭐','👽','🌙','☄️'],
    palette: {
      bg: 'radial-gradient(ellipse at top left, #1a1a4e 0%, #0b0b2a 60%, #050516 100%)',
      paper: '#0f0f3a',
      ink: '#fff6e0',
      accent: '#ffd66b',
      headBg: '#ffd66b',
      headInk: '#0b0b2a',
      tone: 'dark'
    },
    decorations: ['🚀','⭐','🪐','🌙','☄️','👨‍🚀','🛸'],
    subjectEmojis: { default: '⭐', math: '🔭', science: '🛰️', music: '🎶', language: '📡', sport: '🚀', art: '🎨', coding: '👾' },
    pattern: 'stars'
  },
  {
    id: 'dinosaurs',
    name: 'Dinosaurs',
    emoji: '🦕',
    preview: ['🦕','🦖','🌿','🌋','🥚','🦴'],
    palette: {
      bg: 'linear-gradient(180deg, #d8e6c2 0%, #b9d49a 100%)',
      paper: '#fbf6e8',
      ink: '#2e3b1f',
      accent: '#e3823b',
      headBg: '#3b6b32',
      headInk: '#fbf6e8',
      tone: 'light'
    },
    decorations: ['🦕','🦖','🌿','🌋','🥚','🌴','🦴'],
    subjectEmojis: { default: '🌿', math: '🦖', science: '🥚', music: '🎶', language: '🦕', sport: '🦴', art: '🌋', coding: '🦴' },
    pattern: 'leaves'
  },
  {
    id: 'underwater',
    name: 'Underwater',
    emoji: '🐠',
    preview: ['🐠','🐙','🦈','🐚','🪸','🌊'],
    palette: {
      bg: 'linear-gradient(180deg, #5cc6ee 0%, #1d6fa3 100%)',
      paper: '#eaf8ff',
      ink: '#0d3a5a',
      accent: '#ff8aa3',
      headBg: '#0d3a5a',
      headInk: '#eaf8ff',
      tone: 'light'
    },
    decorations: ['🐠','🐙','🐡','🦈','🐚','🪸','🌊','🐳'],
    subjectEmojis: { default: '🐚', math: '🐙', science: '🐡', music: '🎶', language: '💬', sport: '🐬', art: '🪸', coding: '🦑' },
    pattern: 'bubbles'
  },
  {
    id: 'unicorns',
    name: 'Unicorns',
    emoji: '🦄',
    preview: ['🦄','🌈','✨','🌸','🍭','💖'],
    palette: {
      bg: 'linear-gradient(180deg, #ffe2f3 0%, #e0d4ff 100%)',
      paper: '#fffaff',
      ink: '#5b1f74',
      accent: '#ff7ec4',
      headBg: '#ff7ec4',
      headInk: '#fffaff',
      tone: 'light'
    },
    decorations: ['🦄','🌈','✨','🌸','💖','🍭','⭐'],
    subjectEmojis: { default: '✨', math: '🌈', science: '🧪', music: '🎶', language: '💌', sport: '🦄', art: '🎨', coding: '💜' },
    pattern: 'sparkles'
  },
  {
    id: 'jungle',
    name: 'Jungle',
    emoji: '🐯',
    preview: ['🐯','🌴','🐒','🦜','🌺','🍃'],
    palette: {
      bg: 'linear-gradient(180deg, #b9e0a0 0%, #4f8a3a 100%)',
      paper: '#fff8e0',
      ink: '#26401a',
      accent: '#e8a93a',
      headBg: '#26401a',
      headInk: '#fff8e0',
      tone: 'light'
    },
    decorations: ['🐯','🐒','🦜','🌴','🌺','🍃','🦓'],
    subjectEmojis: { default: '🍃', math: '🐒', science: '🦋', music: '🥁', language: '🦜', sport: '🐯', art: '🌺', coding: '🦓' },
    pattern: 'leaves'
  },
  {
    id: 'robots',
    name: 'Robots',
    emoji: '🤖',
    preview: ['🤖','⚙️','🔋','💻','🔧','📡'],
    palette: {
      bg: 'linear-gradient(180deg, #d9dde6 0%, #aab2c0 100%)',
      paper: '#f4f6fb',
      ink: '#1a2438',
      accent: '#ff5c4a',
      headBg: '#1a2438',
      headInk: '#f4f6fb',
      tone: 'light'
    },
    decorations: ['🤖','⚙️','🔋','💻','🔧','📡','🚦'],
    subjectEmojis: { default: '⚙️', math: '🧮', science: '🔬', music: '🎛️', language: '📡', sport: '🦾', art: '💡', coding: '💻' },
    pattern: 'circuits'
  },
  {
    id: 'candy',
    name: 'Candy',
    emoji: '🍭',
    preview: ['🍭','🍬','🧁','🍩','🍰','🍓'],
    palette: {
      bg: 'linear-gradient(180deg, #ffd9eb 0%, #ffeb99 100%)',
      paper: '#fffdf3',
      ink: '#6b1f43',
      accent: '#ff5c8a',
      headBg: '#ff5c8a',
      headInk: '#fffdf3',
      tone: 'light'
    },
    decorations: ['🍭','🍬','🧁','🍩','🍰','🍓','🍪'],
    subjectEmojis: { default: '🍬', math: '🧁', science: '🍓', music: '🎵', language: '🍪', sport: '🍭', art: '🍰', coding: '🍩' },
    pattern: 'dots'
  },
  {
    id: 'sports',
    name: 'Sports',
    emoji: '⚽',
    preview: ['⚽','🏀','🎾','🏈','🥇','🏆'],
    palette: {
      bg: 'linear-gradient(180deg, #ffe28a 0%, #ff8a5b 100%)',
      paper: '#fffaf0',
      ink: '#3a1f0a',
      accent: '#1f6fc4',
      headBg: '#1f6fc4',
      headInk: '#fffaf0',
      tone: 'light'
    },
    decorations: ['⚽','🏀','🎾','🏈','🥇','🏆','🏐'],
    subjectEmojis: { default: '🏅', math: '🎯', science: '🧪', music: '🎺', language: '📢', sport: '🏆', art: '🎨', coding: '🕹️' },
    pattern: 'stripes'
  }
];

// Subject auto-categorize based on keywords
function categorizeSubject(name) {
  const n = (name || '').toLowerCase();
  if (/math|number/i.test(n)) return { cat: 'math', baseHue: 28 };
  if (/sci|junior scient|biolog|chem|phys/i.test(n)) return { cat: 'science', baseHue: 140 };
  if (/music|rhythm|sing|band/i.test(n)) return { cat: 'music', baseHue: 285 };
  if (/swim|sport|pe|taekwond|judo|gym|yoga|dance/i.test(n)) return { cat: 'sport', baseHue: 5 };
  if (/cod|comput|program|ai|robot/i.test(n)) return { cat: 'coding', baseHue: 200 };
  if (/art|craft|creat|draw|paint/i.test(n)) return { cat: 'art', baseHue: 330 };
  if (/english|french|german|spanish/i.test(n)) return { cat: 'language', baseHue: 220 };
  if (/thai|chinese|japanese|korean|hindi|arabic/i.test(n)) return { cat: 'language', baseHue: 0 };
  if (/language|story|conver|read|writ|literat/i.test(n)) return { cat: 'language', baseHue: 260 };
  if (/free/i.test(n)) return { cat: 'free', baseHue: 60 };
  if (/extra|tutor|club/i.test(n)) return { cat: 'extra', baseHue: 180 };
  return { cat: 'default', baseHue: 50 };
}

// Assign colors per unique subject name
function buildSubjectMap(rows, themeAccent) {
  const map = new Map();
  let idx = 0;
  const hueOffsets = [0, 45, 90, 140, 180, 220, 270, 310, 20, 60, 110, 160];
  rows.forEach(row => {
    row.cells.forEach(c => {
      if (!c.subject) return;
      const key = c.subject.trim();
      if (map.has(key)) return;
      const { cat, baseHue } = categorizeSubject(key);
      const hue = (baseHue + (idx % 3) * 10) % 360;
      map.set(key, {
        cat,
        hue,
        bg: `oklch(0.88 0.12 ${hue})`,
        bgSoft: `oklch(0.94 0.07 ${hue})`,
        dot: `oklch(0.65 0.18 ${hue})`,
      });
      idx++;
    });
  });
  return map;
}

// Dress code per day, based on activities that day
function dressCodeForDay(day, cells) {
  const activities = cells.map(c => (c.subject || '').toLowerCase()).join(' ');
  if (/swim/.test(activities)) {
    return {
      label: 'Swim Day Kit',
      items: ['🩱 Swimsuit', '🩴 Flip-flops', '🛁 Towel + cap', '🎒 Regular uniform underneath'],
      vibe: 'Pack your swim bag the night before!'
    };
  }
  if (/taekwond|karate|judo/.test(activities)) {
    return {
      label: 'Martial Arts Uniform',
      items: ['🥋 Dobok (uniform)', '👟 Trainers', '🟦 Belt', '💧 Big water bottle'],
      vibe: 'Bow before class — and bring your focus!'
    };
  }
  if (/rhythm|dance|creative activ|music activ/.test(activities)) {
    return {
      label: 'Move-Day Outfit',
      items: ['👕 Comfy t-shirt', '🩳 Soft shorts or leggings', '👟 Sneakers', '🧦 Grippy socks'],
      vibe: 'Wear stuff you can twirl in.'
    };
  }
  if (day.toLowerCase() === 'friday') {
    return {
      label: 'Free Dress Friday',
      items: ['😎 Your favorite outfit', '🧢 Hat allowed!', '👟 Comfy shoes', '🎨 Bring your style'],
      vibe: 'Show some personality today.'
    };
  }
  return {
    label: 'School Uniform',
    items: ['👕 White shirt', '🩳 Navy shorts/skirt', '🧦 White socks', '👞 Black shoes'],
    vibe: 'Tidy and ready to learn.'
  };
}

window.THEME_PRESETS = THEME_PRESETS;
window.categorizeSubject = categorizeSubject;
window.buildSubjectMap = buildSubjectMap;
window.dressCodeForDay = dressCodeForDay;
