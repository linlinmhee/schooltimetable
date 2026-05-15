// Main app + Result panel (single page)
// The final timetable is generated as an A4-portrait image by Azure gpt-image-2,
// using the pasted / sampled / extracted text as the source of truth.

const { useState: useStateApp, useMemo: useMemoApp, useRef: useRefApp, useEffect: useEffectApp } = React;

// ---------- FUN WAITING SCREEN ----------
const STAGE_INFO = {
  reading: {
    label: 'Step 1 of 2 · Reading your photo',
    sub:   'gpt-4.1-nano is squinting at every cell',
    emojis: ['🔍','📖','🧐','👀','📝','🔎','📋','✏️'],
    messages: [
      'Squinting at the rows…',
      'Spotting Monday across the top…',
      'Reading every cell carefully…',
      'Sounding out subject names…',
      'Counting time slots…',
      'Decoding fancy handwriting…',
    ],
  },
  painting: {
    label: 'Step 2 of 2 · Painting the poster',
    sub:   'gpt-image-2 is making it look amazing',
    emojis: ['🎨','✏️','🖌️','🖍️','🌈','✨','🪄','🦄','📐','🧚','🪅','🍭'],
    messages: [
      'Sharpening crayons…',
      'Mixing the paints…',
      'Asking the muses for tips…',
      'Drawing tiny stars in the margins…',
      'Sprinkling some glitter…',
      'Picking just the right fonts…',
      'Convincing the pixels to behave…',
      'Doodling cute borders…',
      'Aligning Monday-through-Friday just so…',
      'Painting Friday-afternoon vibes…',
      'Adding one more sticker…',
      'Polishing the title…',
    ],
  },
};

function FunCountdown({ totalSeconds = 300, inkColor, stage = 'painting' }) {
  const [secs, setSecs] = useStateApp(totalSeconds);
  const [tick, setTick] = useStateApp(0);
  const info = STAGE_INFO[stage] || STAGE_INFO.painting;

  useEffectApp(() => {
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffectApp(() => {
    const id = setInterval(() => setTick(t => t + 1), 2400);
    return () => clearInterval(id);
  }, []);

  const pct = ((totalSeconds - secs) / totalSeconds) * 100;
  const message = info.messages[tick % info.messages.length];
  const emoji   = info.emojis[tick % info.emojis.length];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      padding: '48px 32px', textAlign: 'center', color: inkColor
    }}>
      <div className="pill" style={{ background: 'var(--sun)', color: 'var(--ink)' }}>
        {info.label}
      </div>
      <div className="floaty" style={{ fontSize: 80, lineHeight: 1, '--r': '-4deg' }}>
        {emoji}
      </div>
      <div className="h-display" style={{ fontSize: 22, opacity: .9, minHeight: 28 }}>
        {message}
      </div>
      <div style={{
        width: '85%', maxWidth: 420, height: 16,
        border: '2px solid var(--ink)', borderRadius: 999,
        background: 'white', overflow: 'hidden',
        boxShadow: '3px 3px 0 var(--ink)'
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: 'linear-gradient(90deg, var(--sun), var(--tomato))',
          transition: 'width .8s linear'
        }} />
      </div>
      <div style={{ fontSize: 12, opacity: .65, fontFamily: 'Baloo 2', fontWeight: 600 }}>
        {info.sub}
      </div>
    </div>
  );
}

// ---------- RESULT PANEL ----------
function ResultPanel({ theme, aiImageUrl, aiError, generating, stage, onRegenerate, onRestart, resultRef }) {
  const isDark = theme.palette.tone === 'dark';
  const cardShadow = isDark ? '6px 6px 0 rgba(0,0,0,.55)' : '6px 6px 0 var(--ink)';
  const downloadName = `timetable-${theme.name.toLowerCase().replace(/\s+/g, '-')}.png`;

  return (
    <div ref={resultRef} style={{
      background: theme.palette.bg,
      position: 'relative',
      padding: '36px 28px 80px',
      borderTop: '3px solid var(--ink)'
    }}>
      {window.DecorPattern ? <window.DecorPattern theme={theme} /> : null}

      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="pill" style={{ background: theme.palette.accent, color: isDark ? '#0b0b2a' : 'var(--ink)', borderColor: 'var(--ink)' }}>
              {theme.emoji} {theme.name.toUpperCase()} EDITION
            </div>
            <h1 className="h-display" style={{
              fontSize: 48, lineHeight: 1, margin: '10px 0 0',
              color: isDark ? '#fff6e0' : 'var(--ink)',
              textShadow: isDark ? '3px 3px 0 rgba(0,0,0,.4)' : 'none',
              fontWeight: 800
            }}>
              Here&apos;s your timetable!
            </h1>
            <div style={{
              fontSize: 13, marginTop: 6,
              color: isDark ? '#fff6e0' : 'var(--ink-soft)',
              opacity: .85, fontFamily: 'Baloo 2', fontWeight: 600
            }}>
              freshly painted by Azure gpt-image-2 · A4 landscape ✨
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {aiImageUrl && (
              <a className="btn btn-primary" href={aiImageUrl} download={downloadName} style={{ textDecoration: 'none' }}>
                ⬇️ Download PNG
              </a>
            )}
            <button className="btn" onClick={onRegenerate} disabled={generating}>
              {generating ? '…' : '🔄 Regenerate'}
            </button>
            <button className="btn btn-go" onClick={onRestart}>↻ Start over</button>
          </div>
        </div>

        {/* A4-landscape frame for the AI-generated image */}
        <div className="tt-wrap" style={{
          background: theme.palette.paper,
          boxShadow: cardShadow,
          padding: 16,
          display: 'grid',
          placeItems: 'center',
          // A4 landscape is 1.414:1 — frame ratio matches even while loading
          aspectRatio: '1.414 / 1',
          width: '100%',
          maxWidth: 1040,
          margin: '0 auto'
        }}>
          {generating ? (
            <FunCountdown
              key={stage}
              totalSeconds={300}
              inkColor={theme.palette.ink}
              stage={stage}
            />
          ) : aiError ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              padding: 32, textAlign: 'center', maxWidth: 520, color: theme.palette.ink
            }}>
              <div style={{ fontSize: 48 }}>😵‍💫</div>
              <div className="h-display" style={{ fontSize: 20 }}>
                Image generation failed
              </div>
              <div style={{ fontSize: 13, opacity: .8, lineHeight: 1.5 }}>
                {aiError}
              </div>
              <button className="btn btn-primary" onClick={onRegenerate}>🔁 Try again</button>
            </div>
          ) : aiImageUrl ? (
            <img
              id="ai-generated-image"
              src={aiImageUrl}
              alt="AI generated timetable"
              style={{
                width: '100%', height: '100%', display: 'block',
                objectFit: 'contain',
                borderRadius: 10,
                border: '2.5px solid var(--ink)'
              }}
            />
          ) : (
            <div style={{ padding: 40, color: theme.palette.ink, opacity: .6 }}>
              No image yet.
            </div>
          )}
        </div>

        <div style={{
          fontSize: 12,
          color: isDark ? '#fff6e0' : 'var(--ink)',
          opacity: .75, textAlign: 'center', marginTop: 16
        }}>
          made with 💛 by your timetable decorator
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .topbar, .btn, button, a.btn { display: none !important; }
          .tt-wrap { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

// ---------- MAIN APP ----------
function App() {
  const [rawText, setRawText] = useStateApp('');
  const [uploadedFile, setUploadedFile] = useStateApp(null);
  const [themePrompt, setThemePrompt] = useStateApp('');
  const [activeTheme, setActiveTheme] = useStateApp(null);
  const [generating, setGenerating] = useStateApp(false);
  const [stage, setStage] = useStateApp('painting'); // 'reading' | 'painting'
  const [aiImageUrl, setAiImageUrl] = useStateApp(null);
  const [aiError, setAiError] = useStateApp(null);
  const resultRef = useRefApp(null);

  useEffectApp(() => {
    if (activeTheme && resultRef.current) {
      setTimeout(() => {
        const top = resultRef.current.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top, behavior: 'smooth' });
      }, 80);
    }
  }, [activeTheme]);

  // Resolve a theme (preset match or chat-generated palette) for page chrome.
  async function resolveTheme(prompt) {
    const lower = prompt.toLowerCase();
    const presetMatch = window.THEME_PRESETS.find(p =>
      lower.includes(p.id) || lower.includes(p.name.toLowerCase())
    );
    if (presetMatch) return presetMatch;

    try {
      const result = await window.claude.complete({
        messages: [{
          role: 'user',
          content: `Design a kid-friendly timetable theme inspired by: "${prompt}".
Return ONLY a JSON object (no fences, no commentary):
{
  "name": "Short Theme Name",
  "emoji": "single emoji that represents this theme",
  "decorations": ["6","emoji","that","fit","this","theme"],
  "subjectEmojis": {"default":"emoji","math":"emoji","science":"emoji","music":"emoji","language":"emoji","sport":"emoji","art":"emoji","coding":"emoji"},
  "palette": {
    "bg": "a CSS gradient or color that fits the vibe",
    "paper": "#hex (bright readable surface for the timetable)",
    "ink": "#hex (dark, high contrast on paper)",
    "accent": "#hex (saturated pop)",
    "headBg": "#hex",
    "headInk": "#hex (high contrast on headBg)",
    "tone": "light or dark"
  }
}`
        }]
      });
      const match = result.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('no json');
      const t = JSON.parse(match[0]);
      return {
        id: 'custom',
        name: t.name || prompt,
        emoji: t.emoji || '✨',
        preview: (t.decorations || ['✨']).slice(0, 6),
        palette: { tone: 'light', ...(t.palette || {}) },
        decorations: t.decorations || ['✨','⭐','💫','🌟','✨','🌈'],
        subjectEmojis: t.subjectEmojis || { default: '✨' },
        pattern: 'dots',
        prompt
      };
    } catch (e) {
      console.warn('theme generation fell back to preset', e);
      return window.THEME_PRESETS[0];
    }
  }

  const decorate = async () => {
    if (!themePrompt.trim() || (!rawText.trim() && !uploadedFile)) return;

    // Show the result panel + progress bar IMMEDIATELY, before any API call.
    setGenerating(true);
    setAiError(null);
    setAiImageUrl(null);
    setStage(!rawText.trim() && uploadedFile ? 'reading' : 'painting');
    if (!activeTheme) setActiveTheme(window.THEME_PRESETS[0]); // placeholder chrome

    try {
      // Theme palette can resolve concurrently with the vision call.
      const themePromise = resolveTheme(themePrompt);

      // ── Call 1: gpt-4.1-nano vision (only if user uploaded an image) ──
      let text = rawText;
      if (!text.trim() && uploadedFile) {
        text = await window.azure.extractTimetableFromImage(uploadedFile);
        if (text) setRawText(text.trim());
      }

      const theme = await themePromise;
      setActiveTheme(theme);

      // ── Call 2: gpt-image-2 generates the themed timetable poster ──
      setStage('painting');
      const url = await window.azure.generateImageFromText(text, themePrompt);
      if (!url) throw new Error('Azure returned no image — check your image deployment name and quota.');
      setAiImageUrl(url);
    } catch (e) {
      console.error('decorate failed', e);
      setAiError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const regenerate = async () => {
    if (!themePrompt.trim() || !rawText.trim()) return;
    setGenerating(true);
    setStage('painting');
    setAiError(null);
    setAiImageUrl(null);
    try {
      const url = await window.azure.generateImageFromText(rawText, themePrompt);
      if (!url) throw new Error('Azure returned no image — check your image deployment name and quota.');
      setAiImageUrl(url);
    } catch (e) {
      console.error('regenerate failed', e);
      setAiError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const restart = () => {
    setActiveTheme(null);
    setAiImageUrl(null);
    setAiError(null);
    setUploadedFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark wiggle">📅</div>
          <div>Timetable Decorator</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontFamily: 'Baloo 2', fontWeight: 600 }}>
          paste → theme → AI image
        </div>
      </div>

      <window.UploadScreen
        value={rawText}
        onChange={setRawText}
        uploadedFile={uploadedFile}
        setUploadedFile={setUploadedFile}
        themePrompt={themePrompt}
        setThemePrompt={setThemePrompt}
        generating={generating}
        onGenerate={decorate}
        hasResult={!!activeTheme}
      />

      {activeTheme && (
        <ResultPanel
          theme={activeTheme}
          aiImageUrl={aiImageUrl}
          aiError={aiError}
          generating={generating}
          stage={stage}
          onRegenerate={regenerate}
          onRestart={restart}
          resultRef={resultRef}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
