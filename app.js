// Main app + Result panel (single page)

const { useState: useStateApp, useMemo: useMemoApp, useRef: useRefApp, useEffect: useEffectApp } = React;

function ResultPanel({ data, theme, onRestart, resultRef }) {
  const subjectMap = useMemoApp(() => window.buildSubjectMap(data.rows, theme.palette.accent), [data, theme]);
  const [downloading, setDownloading] = useStateApp(false);
  const captureRef = useRefApp(null);

  const emojiForSubject = (subject) => {
    const { cat } = window.categorizeSubject(subject);
    return theme.subjectEmojis[cat] || theme.subjectEmojis.default || theme.emoji;
  };

  const dressCodes = useMemoApp(() => {
    return data.days.map((day, di) => {
      const cells = data.rows.map(r => r.cells[di]);
      return { day, ...window.dressCodeForDay(day, cells) };
    });
  }, [data]);

  const isDark = theme.palette.tone === 'dark';
  const cardShadow = isDark ? '6px 6px 0 rgba(0,0,0,.55)' : '6px 6px 0 var(--ink)';

  const downloadPng = async () => {
    if (!captureRef.current || !window.htmlToImage) return;
    setDownloading(true);
    try {
      const dataUrl = await window.htmlToImage.toPng(captureRef.current, {
        pixelRatio: 2,
        backgroundColor: undefined,
        cacheBust: true
      });
      const link = document.createElement('a');
      link.download = `timetable-${theme.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('PNG export failed', e);
      alert('Couldn\'t save the image. Try printing to PDF instead.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div ref={resultRef} style={{
      background: theme.palette.bg,
      position: 'relative',
      padding: '36px 28px 80px',
      borderTop: '3px solid var(--ink)'
    }}>
      {window.DecorPattern ? <window.DecorPattern theme={theme} /> : null}

      <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto' }}>
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
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={downloadPng} disabled={downloading}>
              {downloading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…
                </span>
              ) : '⬇️ Download PNG'}
            </button>
            <button className="btn" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn btn-go" onClick={onRestart}>↻ Start over</button>
          </div>
        </div>

        {/* The captured area (timetable + sidebar) */}
        <div ref={captureRef} style={{
          padding: 24,
          background: 'transparent',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 22,
          alignItems: 'start'
        }} className="capture-area">
          {/* The timetable */}
          <div className="tt-wrap" style={{ background: theme.palette.paper, boxShadow: cardShadow }}>
            <div className="tt-grid">
              <div className="tt-cell is-head" style={{ background: theme.palette.headBg, color: theme.palette.headInk, borderColor: 'var(--ink)' }}>
                <div style={{ fontSize: 22 }}>⏰</div>
                <div style={{ fontSize: 12, opacity: .8 }}>TIME</div>
              </div>
              {data.days.map((d, i) => (
                <div key={i} className="tt-cell is-head" style={{ background: theme.palette.headBg, color: theme.palette.headInk, borderColor: 'var(--ink)' }}>
                  {d}
                </div>
              ))}

              {data.rows.map((row, ri) => (
                <React.Fragment key={ri}>
                  <div className="tt-cell is-time" style={{ color: theme.palette.ink, background: isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)', borderColor: 'var(--ink)' }}>
                    {row.time}
                  </div>
                  {row.cells.map((cell, ci) => {
                    const subj = cell.subject;
                    const meta = subj ? subjectMap.get(subj.trim()) : null;
                    return (
                      <div key={ci} className="tt-cell" style={{
                        background: meta ? meta.bg : 'transparent',
                        borderColor: 'var(--ink)'
                      }}>
                        {subj ? (
                          <div className="subj-tag">
                            <div className="subj-emoji">{emojiForSubject(subj)}</div>
                            <div className="subj-name">{subj}</div>
                          </div>
                        ) : <div style={{ opacity: .3, fontSize: 12 }}>—</div>}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Sidebar: legend + dress codes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="chunky" style={{ padding: 16, background: theme.palette.paper, color: theme.palette.ink, boxShadow: cardShadow, transform: 'rotate(.5deg)' }}>
              <div className="h-hand" style={{ fontSize: 24, color: theme.palette.accent, marginBottom: 6, textShadow: isDark ? '1px 1px 0 rgba(0,0,0,.6)' : 'none' }}>color key</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...subjectMap.entries()].map(([name, meta]) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: 6,
                      background: meta.bg, border: '1.5px solid var(--ink)', flex: '0 0 auto'
                    }} />
                    <span style={{ fontFamily: 'Baloo 2', fontWeight: 600 }}>{emojiForSubject(name)} {name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="chunky" style={{ padding: 16, background: theme.palette.paper, color: theme.palette.ink, boxShadow: cardShadow, transform: 'rotate(-.7deg)' }}>
              <div className="h-hand" style={{ fontSize: 28, color: theme.palette.accent, marginBottom: 2, textShadow: isDark ? '1px 1px 0 rgba(0,0,0,.6)' : 'none' }}>dress code</div>
              <div style={{ fontSize: 12, opacity: .75, marginBottom: 10 }}>what to wear each day</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dressCodes.map((dc, i) => (
                  <div key={i} style={{
                    borderTop: '1.5px dashed currentColor', paddingTop: 8, opacity: .95
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                      <div className="h-display" style={{ fontWeight: 800, fontSize: 16 }}>{dc.day}</div>
                      <div style={{ fontSize: 11, fontFamily: 'Baloo 2', fontWeight: 700, padding: '2px 8px', background: theme.palette.accent, color: isDark ? '#0b0b2a' : 'var(--ink)', borderRadius: 999, border: '1.5px solid var(--ink)' }}>{dc.label}</div>
                    </div>
                    <div style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.5 }}>
                      {dc.items.join(' · ')}
                    </div>
                    <div className="h-hand" style={{ fontSize: 16, marginTop: 2, opacity: .8 }}>{dc.vibe}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: isDark ? '#fff6e0' : 'var(--ink)', opacity: .75, textAlign: 'center', marginTop: 16 }}>
          made with 💛 by your timetable decorator
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .topbar, .btn, button { display: none !important; }
          .tt-wrap { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

// ---------- MAIN APP ----------
function App() {
  const [rawText, setRawText] = useStateApp('');
  const [themePrompt, setThemePrompt] = useStateApp('');
  const [activeTheme, setActiveTheme] = useStateApp(null);
  const [generating, setGenerating] = useStateApp(false);
  const resultRef = useRefApp(null);

  const parsed = useMemoApp(() => {
    try { return window.parseTimetable(rawText); } catch { return null; }
  }, [rawText]);

  // Scroll to result whenever a new theme is set
  useEffectApp(() => {
    if (activeTheme && resultRef.current) {
      // small delay so DOM is ready
      setTimeout(() => {
        const top = resultRef.current.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top, behavior: 'smooth' });
      }, 80);
    }
  }, [activeTheme]);

  const generateTheme = async () => {
    if (!themePrompt.trim() || !parsed) return;
    setGenerating(true);
    const promptLower = themePrompt.toLowerCase();
    const presetMatch = window.THEME_PRESETS.find(p =>
      promptLower.includes(p.id) || promptLower.includes(p.name.toLowerCase())
    );
    if (presetMatch) {
      setActiveTheme(presetMatch);
      setGenerating(false);
      return;
    }
    try {
      const result = await window.claude.complete({
        messages: [{
          role: 'user',
          content: `Design a kid-friendly timetable theme inspired by: "${themePrompt}".
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
      setActiveTheme({
        id: 'custom',
        name: t.name || themePrompt,
        emoji: t.emoji || '✨',
        preview: (t.decorations || ['✨']).slice(0, 6),
        palette: { tone: 'light', ...(t.palette || {}) },
        decorations: t.decorations || ['✨','⭐','💫','🌟','✨','🌈'],
        subjectEmojis: t.subjectEmojis || { default: '✨' },
        pattern: 'dots',
        prompt: themePrompt
      });
    } catch (e) {
      console.warn(e);
      setActiveTheme(window.THEME_PRESETS[0]);
    } finally {
      setGenerating(false);
    }
  };

  const restart = () => {
    setActiveTheme(null);
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
          paste → theme → download
        </div>
      </div>

      <window.UploadScreen
        value={rawText}
        onChange={setRawText}
        themePrompt={themePrompt}
        setThemePrompt={setThemePrompt}
        generating={generating}
        onGenerate={generateTheme}
        hasResult={!!activeTheme}
      />

      {parsed && activeTheme && (
        <ResultPanel
          data={parsed}
          theme={activeTheme}
          onRestart={restart}
          resultRef={resultRef}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
