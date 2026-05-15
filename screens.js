// Screens: Upload, Theme, Result

const { useState, useEffect, useRef, useMemo } = React;

// ---------- shared decorative background ----------
function DecorPattern({ theme }) {
  if (!theme) return null;
  const items = theme.decorations || [];
  const positions = [
    { top: '6%', left: '4%', r: -12 },
    { top: '14%', right: '6%', r: 14 },
    { top: '38%', left: '2%', r: 8 },
    { top: '52%', right: '4%', r: -10 },
    { top: '72%', left: '6%', r: -6 },
    { top: '86%', right: '8%', r: 12 },
    { top: '22%', left: '50%', r: 18 },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {positions.map((p, i) => (
        <div key={i} className="floaty" style={{
          position: 'absolute',
          fontSize: 44,
          ...p,
          '--r': `${p.r}deg`,
          animationDelay: `${i * .35}s`,
          opacity: .55,
          filter: 'drop-shadow(2px 2px 0 rgba(0,0,0,.2))'
        }}>{items[i % items.length]}</div>
      ))}
    </div>
  );
}

// ---------- UPLOAD SCREEN ----------
function UploadScreen({ value, onChange, themePrompt, setThemePrompt, generating, onGenerate }) {
  const [tab, setTab] = useState('image');
  const [fileName, setFileName] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [readingImage, setReadingImage] = useState(false);
  const [aiImageUrl, setAiImageUrl] = useState(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileRef = useRef(null);
  const QUICK_THEMES = ['🚀 space', '🦕 dinosaurs', '🐠 underwater', '🦄 unicorns', '🐯 jungle', '🤖 robots', '🍭 candy', '⚽ sports'];

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setUploadedFile(file);
    setAiImageUrl(null);
    setAiError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setReadingImage(true);
    // Step 1: Vision call — extract timetable as markdown table
    try {
      const result = await window.azure.complete({
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: await fileToDataUrl(file),
                detail: 'high'
              }
            },
            { type: 'text', text: 'This is a school timetable image. Extract it as a Markdown table with columns: Time, Monday, Tuesday, Wednesday, Thursday, Friday. Only output the markdown table — no commentary, no fences.' }
          ]
        }]
      });
      if (result && result.includes('|')) {
        onChange(result.trim());
        setTab('paste');
      }
    } catch (e) {
      console.warn('Image extraction unavailable', e);
    } finally {
      setReadingImage(false);
    }
  };

  // Step 2 (triggered separately): Generate AI-themed timetable image
  const handleGenerateAiImage = async () => {
    if (!uploadedFile || !themePrompt.trim()) return;
    setAiGenerating(true);
    setAiError(null);
    setAiImageUrl(null);
    try {
      const { textResult, imageUrl: genUrl } = await window.azure.generateTimetableImage(uploadedFile, themePrompt);
      if (genUrl) {
        setAiImageUrl(genUrl);
      } else {
        setAiError('No image returned from Azure — check your deployment name and quota.');
      }
    } catch (e) {
      console.error('AI image generation failed', e);
      setAiError(`Generation failed: ${e.message}`);
    } finally {
      setAiGenerating(false);
    }
  };

  function fileToDataUrl(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  return (
    <div className="page" style={{ position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 36, alignItems: 'start' }}>
        <div>
          <div style={{ marginBottom: 10 }}>
            <span className="pill" style={{ background: 'var(--sun)' }}>STEP 1 / 3</span>
          </div>
          <h1 className="h-display" style={{ fontSize: 56, lineHeight: 1, margin: '4px 0 8px', fontWeight: 800 }}>
            Got a boring <span style={{ textDecoration: 'line-through', textDecorationColor: 'var(--tomato)', textDecorationThickness: 5 }}>schedule</span>?
            <br/>
            Let&apos;s <span style={{ color: 'var(--tomato)' }}>decorate</span> it.
          </h1>
          <p style={{ fontSize: 18, color: 'var(--ink-soft)', maxWidth: 520, margin: '14px 0 28px' }}>
            Paste your weekly timetable below or drop a photo. We&apos;ll turn it into the funnest schedule on your fridge.
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <button className={`btn btn-sm ${tab === 'image' ? 'btn-primary' : ''}`} onClick={() => setTab('image')}>📷 Upload photo</button>
            <button className={`btn btn-sm ${tab === 'paste' ? 'btn-primary' : ''}`} onClick={() => setTab('paste')}>📝 Paste text</button>
            <button className="btn btn-sm" onClick={() => { onChange(window.SAMPLE_TIMETABLE); setTab('paste'); }}>✨ Try a sample</button>
          </div>

          {tab === 'paste' && (
            <div>
              <textarea
                className="textarea chunky"
                style={{ minHeight: 320, boxShadow: '5px 5px 0 var(--ink)' }}
                placeholder={"| Time        | Monday        | Tuesday       | ...\n| ----------- | ------------- | ------------- |\n| 09:00–09:40 | Math          | Science       | ...\n\nWorks with markdown tables, CSV, tabs, or just lines of text."}
                value={value}
                onChange={e => onChange(e.target.value)}
              />
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-soft)' }}>
                Tip: any weekly grid with a Time column works.
              </div>
            </div>
          )}

          {tab === 'image' && (
            <div>
              <div
                className="chunky"
                style={{
                  minHeight: 280, padding: 24, display: 'grid', placeItems: 'center',
                  background: imagePreview ? 'white' : 'var(--cream-2)',
                  borderStyle: imagePreview ? 'solid' : 'dashed', borderWidth: 3,
                  cursor: 'pointer', textAlign: 'center'
                }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); }}
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
              >
                {readingImage ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="spinner" />
                    <div className="h-display" style={{ fontSize: 20 }}>Reading your timetable…</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Squinting at the rows ✨</div>
                  </div>
                ) : imagePreview ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <img src={imagePreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 10, border: '2px solid var(--ink)' }} />
                    <div className="h-display">{fileName}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                      {value ? '✅ Extracted! Switch to “Paste text” to fine-tune.' : 'Couldn’t read it automatically — try pasting the text instead.'}
                    </div>
                  </div>
                ) : (
                  <div className="h-display" style={{ fontSize: 22 }}>
                    📥 Drop a photo here<br />
                    <span style={{ fontSize: 14, fontFamily: 'Nunito', fontWeight: 600, color: 'var(--ink-soft)' }}>or click to choose a file</span>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
              </div>

              {/* ── AI Image Generation Panel ───────────────────── */}
              {uploadedFile && (
                <div className="chunky" style={{
                  marginTop: 16, padding: 20,
                  background: 'linear-gradient(135deg, #fff9ee 0%, #fff0fa 100%)'
                }}>
                  <div className="h-display" style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
                    🎨 Generate AI-Themed Image
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>
                    Pick a theme below and we'll call Azure gpt-image-2 to create a custom timetable image for you!
                  </div>

                  {/* Quick theme pills for image gen */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {QUICK_THEMES.map(q => (
                      <button
                        key={q}
                        className="btn btn-sm"
                        style={{ background: themePrompt.toLowerCase().includes(q.split(' ')[1]) ? 'var(--sun)' : 'white' }}
                        onClick={() => setThemePrompt(q.split(' ').slice(1).join(' '))}
                        disabled={aiGenerating}
                      >{q}</button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    <input
                      id="ai-theme-input"
                      className="input"
                      style={{ flex: '1 1 200px' }}
                      placeholder="e.g. dinosaurs, space, cats…"
                      value={themePrompt}
                      onChange={e => setThemePrompt(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !aiGenerating) handleGenerateAiImage(); }}
                      disabled={aiGenerating}
                    />
                    <button
                      id="btn-generate-ai-image"
                      className="btn btn-go"
                      disabled={!themePrompt.trim() || aiGenerating}
                      onClick={handleGenerateAiImage}
                    >
                      {aiGenerating ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'white', borderTopColor: 'transparent' }} />
                          Generating…
                        </span>
                      ) : '✨ Generate AI Image'}
                    </button>
                  </div>

                  {aiError && (
                    <div style={{ fontSize: 13, color: 'var(--tomato)', marginBottom: 8, padding: '8px 12px', background: '#fff0ef', borderRadius: 10, border: '1.5px solid var(--tomato)' }}>
                      ⚠️ {aiError}
                    </div>
                  )}

                  {aiImageUrl && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div className="pill" style={{ background: 'var(--leaf)', color: 'white' }}>✅ AI Image Ready!</div>
                        <a
                          href={aiImageUrl}
                          download={`timetable-${themePrompt.replace(/\s+/g,'-')}.png`}
                          className="btn btn-primary btn-sm"
                          style={{ textDecoration: 'none' }}
                        >⬇️ Download</a>
                      </div>
                      <img
                        id="ai-generated-image"
                        src={aiImageUrl}
                        alt="AI generated timetable"
                        style={{
                          width: '100%', borderRadius: 14,
                          border: '2.5px solid var(--ink)',
                          boxShadow: '5px 5px 0 var(--ink)'
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 28 }}>
            <div className="h-display" style={{ fontSize: 22, marginBottom: 6, fontWeight: 800 }}>
              Pick your <span style={{ color: 'var(--grape)' }}>theme</span> ✨
            </div>
            <div style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 10 }}>
              Type anything — we&apos;ll build a matching look. Try a quick pick:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {QUICK_THEMES.map(q => (
                <button
                  key={q}
                  className="btn btn-sm"
                  style={{ background: themePrompt.toLowerCase().includes(q.split(' ')[1]) ? 'var(--sun)' : 'white' }}
                  onClick={() => setThemePrompt(q.split(' ').slice(1).join(' '))}
                  disabled={generating}
                >{q}</button>
              ))}
            </div>
            <input
              className="input chunky"
              style={{ boxShadow: '5px 5px 0 var(--ink)', fontSize: 17, fontFamily: 'Baloo 2', fontWeight: 600 }}
              placeholder="e.g. dinosaurs, space, mushrooms, cats in pajamas…"
              value={themePrompt}
              onChange={e => setThemePrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && value.trim() && themePrompt.trim() && !generating) onGenerate();
              }}
              disabled={generating}
            />
          </div>

          <div style={{ marginTop: 22, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              className="btn btn-go"
              disabled={!value || !value.trim() || !themePrompt.trim() || generating}
              onClick={onGenerate}
              style={{ fontSize: 19, padding: '14px 26px' }}
            >
              {generating ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'white', borderTopColor: 'transparent' }} />
                  Decorating…
                </span>
              ) : '🎨 Decorate it!'}
            </button>
            <button className="btn btn-ghost" onClick={() => onChange('')} disabled={generating}>Clear</button>
          </div>
        </div>

        <UploadAside value={value} />
      </div>
    </div>
  );
}

function UploadAside({ value }) {
  const parsed = useMemo(() => {
    try { return window.parseTimetable(value); } catch { return null; }
  }, [value]);

  return (
    <div style={{ position: 'sticky', top: 110 }}>
      <div className="chunky" style={{ padding: 22, transform: 'rotate(1.5deg)', background: 'var(--cream-2)' }}>
        <div className="h-hand" style={{ fontSize: 26, color: 'var(--tomato)', marginBottom: 6 }}>preview!</div>
        {parsed && parsed.rows.length ? (
          <div style={{ fontSize: 13 }}>
            <div style={{ marginBottom: 8 }}>
              <span className="pill">{parsed.rows.length} time slots</span>{' '}
              <span className="pill" style={{ background: 'var(--sun)' }}>{parsed.days.length} days</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Nunito' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontSize: 11, padding: '4px 6px', background: 'var(--ink)', color: 'white', borderRadius: '6px 0 0 6px' }}>Time</th>
                  {parsed.days.map((d, i) => (
                    <th key={i} style={{ textAlign: 'left', fontSize: 11, padding: '4px 6px', background: 'var(--ink)', color: 'white' }}>{d.slice(0,3)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px dashed rgba(0,0,0,.2)' }}>
                    <td style={{ padding: '6px 4px', fontFamily: 'Baloo 2', fontWeight: 700, fontSize: 11 }}>{r.time}</td>
                    {r.cells.map((c, j) => (
                      <td key={j} style={{ padding: '6px 4px', fontSize: 11 }}>{(c.subject || '—').slice(0, 16)}{c.subject && c.subject.length > 16 ? '…' : ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.rows.length > 5 && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>…and {parsed.rows.length - 5} more rows</div>}
          </div>
        ) : (
          <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            Looks like nothing here yet. Paste a timetable and you&apos;ll see a sneaky preview ✨
          </div>
        )}
      </div>

      <div style={{ marginTop: 22, padding: 20, transform: 'rotate(-1deg)' }} className="chunky">
        <div className="h-hand" style={{ fontSize: 24, color: 'var(--grape)', marginBottom: 6 }}>what you&apos;ll get</div>
        <ul style={{ paddingLeft: 18, margin: 0, lineHeight: 1.7, fontSize: 14 }}>
          <li>🎨 A themed timetable with colorful subjects</li>
          <li>👕 Daily dress code suggestions</li>
          <li>🖨️ Big enough to stick on your fridge</li>
        </ul>
      </div>
    </div>
  );
}

// ---------- THEME PICKER SCREEN ----------
function ThemeScreen({ themeChoice, setThemeChoice, customTheme, setCustomTheme, onBack, onNext }) {
  const presets = window.THEME_PRESETS;
  const [generating, setGenerating] = useState(false);
  const [generatedHint, setGeneratedHint] = useState(null);
  const [prompt, setPrompt] = useState(customTheme?.prompt || '');

  const generateFromPrompt = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGeneratedHint(null);
    try {
      const result = await window.claude.complete({
        messages: [{
          role: 'user',
          content: `Design a kid-friendly timetable theme inspired by: "${prompt}".
Return ONLY a JSON object with this shape (no commentary, no fences):
{
  "name": "Theme Name",
  "emoji": "single emoji",
  "decorations": ["6 emoji that fit the theme"],
  "subjectEmojis": {"default":"emoji","math":"emoji","science":"emoji","music":"emoji","language":"emoji","sport":"emoji","art":"emoji","coding":"emoji"},
  "palette": {
    "bg":"a CSS gradient or color",
    "paper":"#hex (bright, light, readable)",
    "ink":"#hex (dark, high contrast on paper)",
    "accent":"#hex (saturated pop color)",
    "headBg":"#hex",
    "headInk":"#hex (contrast on headBg)"
  }
}`
        }]
      });
      const match = result.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON');
      const parsed = JSON.parse(match[0]);
      const theme = {
        id: 'custom',
        name: parsed.name || prompt,
        emoji: parsed.emoji || '✨',
        preview: parsed.decorations?.slice(0, 6) || ['✨'],
        palette: { tone: 'light', ...parsed.palette },
        decorations: parsed.decorations || ['✨'],
        subjectEmojis: parsed.subjectEmojis || { default: '✨' },
        pattern: 'dots',
        prompt
      };
      setCustomTheme(theme);
      setThemeChoice('custom');
      setGeneratedHint('Theme ready — scroll down to see the preview!');
    } catch (e) {
      console.warn(e);
      setGeneratedHint('Couldn’t cook that one up — try a different word or pick a preset.');
    } finally {
      setGenerating(false);
    }
  };

  const active = themeChoice === 'custom' ? customTheme : presets.find(p => p.id === themeChoice);

  return (
    <div className="page" style={{ position: 'relative' }}>
      <div style={{ marginBottom: 10 }}>
        <span className="pill" style={{ background: 'var(--sun)' }}>STEP 2 / 3</span>
      </div>
      <h1 className="h-display" style={{ fontSize: 48, margin: '4px 0 18px', fontWeight: 800 }}>
        Pick your <span style={{ color: 'var(--grape)' }}>vibe</span> ✦
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        {presets.map(t => (
          <button
            key={t.id}
            onClick={() => setThemeChoice(t.id)}
            className="chunky"
            style={{
              cursor: 'pointer', padding: 14, textAlign: 'left',
              background: themeChoice === t.id ? t.palette.headBg : 'white',
              color: themeChoice === t.id ? t.palette.headInk : 'var(--ink)',
              transform: themeChoice === t.id ? 'translate(-2px, -2px)' : 'none',
              boxShadow: themeChoice === t.id ? '7px 7px 0 var(--ink)' : '5px 5px 0 var(--ink)',
              transition: 'transform .1s, box-shadow .1s'
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 6 }}>{t.emoji}</div>
            <div className="h-display" style={{ fontSize: 20, fontWeight: 800 }}>{t.name}</div>
            <div style={{ fontSize: 16, marginTop: 4, letterSpacing: 2 }}>
              {t.preview.slice(0, 6).join(' ')}
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 36 }}>
        <div className="h-display" style={{ fontSize: 24, marginBottom: 8 }}>Or — make your own ✏️</div>
        <div style={{ color: 'var(--ink-soft)', marginBottom: 12 }}>
          Type a theme and we&apos;ll cook one up. Try <em>sushi</em>, <em>volcano</em>, <em>cats in space</em>…
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ flex: '1 1 320px', maxWidth: 520 }}
            placeholder="e.g. dragons, soccer, mushrooms…"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generateFromPrompt()}
          />
          <button className="btn btn-primary" disabled={generating || !prompt.trim()} onClick={generateFromPrompt}>
            {generating ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Cooking…</span> : '🪄 Generate'}
          </button>
        </div>
        {generatedHint && <div style={{ marginTop: 10, fontSize: 14, color: 'var(--ink-soft)' }}>{generatedHint}</div>}

        {customTheme && (
          <button
            onClick={() => setThemeChoice('custom')}
            className="chunky"
            style={{
              marginTop: 16, padding: 14, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 14,
              maxWidth: 520,
              background: themeChoice === 'custom' ? customTheme.palette.headBg : 'white',
              color: themeChoice === 'custom' ? customTheme.palette.headInk : 'var(--ink)',
            }}
          >
            <div style={{ fontSize: 40 }}>{customTheme.emoji}</div>
            <div>
              <div className="h-display" style={{ fontSize: 20 }}>{customTheme.name}</div>
              <div style={{ fontSize: 14 }}>{customTheme.preview.slice(0, 6).join(' ')}</div>
              <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>from “{customTheme.prompt}”</div>
            </div>
          </button>
        )}
      </div>

      <div style={{ marginTop: 36, display: 'flex', gap: 12 }}>
        <button className="btn" onClick={onBack}>← Back</button>
        <button className="btn btn-go" disabled={!active} onClick={onNext}>
          Decorate it! ✨
        </button>
      </div>
    </div>
  );
}

window.UploadScreen = UploadScreen;
window.ThemeScreen = ThemeScreen;
window.DecorPattern = DecorPattern;
