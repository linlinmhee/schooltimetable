// ─── Azure OpenAI Client ───────────────────────────────────────────────────
// Public API on `window.azure`:
//   complete({ messages, temperature?, max_tokens? })       → string (chat / vision)
//   extractTimetableFromImage(file)                         → string (markdown-ish table)
//   generateImageFromText(timetableText, themeText)         → string (image URL or data URL)
//   generateTimetableImage(file, themeText)                 → { textResult, imageUrl }
//
// Credentials are read from a sibling `.env` file at runtime via fetch().
// The page MUST be served by a local web server — opening index.html
// directly via file:// will block the fetch.

(function () {
  // ── Lazy .env loader ──────────────────────────────────────────────────────
  let configPromise = null;

  function loadConfig() {
    if (configPromise) return configPromise;
    configPromise = fetch(".env", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(parseEnv)
      .then((env) => {
        const cfg = {
          apiKey:          env.AZURE_OPENAI_API_KEY,
          endpoint:        (env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, ""),
          apiVersion:      env.AZURE_OPENAI_API_VERSION  || "2025-01-01-preview",
          chatDeployment:  env.AZURE_OPENAI_CHAT_DEPLOYMENT  || "gpt-4.1-nano",
          imageDeployment: env.AZURE_OPENAI_IMAGE_DEPLOYMENT || "gpt-image-2",
        };
        if (!cfg.apiKey || !cfg.endpoint) {
          throw new Error("Missing AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT in .env");
        }
        return cfg;
      })
      .catch((err) => {
        configPromise = null; // allow retry
        throw new Error(
          `Could not load .env (${err.message}). ` +
          `Make sure the app is served via a local web server, not opened as file://.`
        );
      });
    return configPromise;
  }

  function parseEnv(text) {
    const out = {};
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
    return out;
  }

  // ── URL builders ──────────────────────────────────────────────────────────
  const chatUrl     = (cfg) => `${cfg.endpoint}/openai/deployments/${cfg.chatDeployment}/chat/completions?api-version=${cfg.apiVersion}`;
  const imageGenUrl = (cfg) => `${cfg.endpoint}/openai/deployments/${cfg.imageDeployment}/images/generations?api-version=${cfg.apiVersion}`;

  async function post(cfg, url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": cfg.apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Azure API error ${res.status}: ${errText}`);
    }
    return res.json();
  }

  // ── Chat / vision completions ─────────────────────────────────────────────
  // max_completion_tokens is OPTIONAL — omit to let the model use its full budget.
  async function complete({ messages, temperature = 0.7, max_completion_tokens }) {
    const cfg = await loadConfig();
    const body = {
      model: cfg.chatDeployment,
      messages,
      temperature,
    };
    if (max_completion_tokens != null) body.max_completion_tokens = max_completion_tokens;
    const data = await post(cfg, chatUrl(cfg), body);
    return data.choices?.[0]?.message?.content ?? "";
  }

  // ── Vision: extract timetable from an uploaded image ──────────────────────
  async function extractTimetableFromImage(imageFile) {
    const base64 = await fileToBase64(imageFile);
    return complete({
      temperature: 0.3,
      messages: [{
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${imageFile.type || "image/png"};base64,${base64}`,
              detail: "high",
            },
          },
          {
            type: "text",
            text:
              "This is a school timetable image. Extract every cell as a Markdown table with " +
              "columns: Time, Monday, Tuesday, Wednesday, Thursday, Friday. " +
              "Output ONLY the markdown table — no commentary, no fences.",
          },
        ],
      }],
    });
  }

  // ── Image generation from timetable text + theme ──────────────────────────
  async function generateImageFromText(timetableText, themeText) {
    const cfg = await loadConfig();

    const prompt =
      `Design a colorful, kid-friendly school timetable POSTER in the theme of "${themeText}". ` +
      `IMPORTANT format: A4 LANDSCAPE orientation — wider than tall, like a placemat or whiteboard. ` +
      `Layout: a clear weekly grid with days of the week as columns across the top ` +
      `(Monday, Tuesday, Wednesday, Thursday, Friday) and time slots as rows down the left. ` +
      `Each cell must clearly label its subject in legible text. ` +
      `Decorate around (and lightly between) the grid with cute themed illustrations that match "${themeText}", ` +
      `but keep the grid itself readable and uncluttered. Hand-drawn poster vibe, chunky outlines, ` +
      `friendly rounded fonts, warm cream or themed background.\n\n` +
      `DAY COLUMN COLORS (use these exact colors for each day's header AND the column tint behind its cells): ` +
      `Monday = YELLOW, Tuesday = PINK, Wednesday = GREEN, Thursday = ORANGE, Friday = BLUE. ` +
      `Keep subject text dark and readable on top of the tint.\n\n` +
      `LANGUAGE: preserve the EXACT original language and spelling of the timetable content below. ` +
      `Do NOT translate subject names, day names, or any text — render them verbatim as written.\n\n` +
      `Use exactly this timetable content:\n` +
      `${timetableText}`;

    const imgData = await post(cfg, imageGenUrl(cfg), {
      model: cfg.imageDeployment,
      prompt,
      n: 1,
      size: "1536x1024",
      quality: "high",
      output_format: "png",
    });

    const img = imgData.data?.[0];
    if (img?.url)      return img.url;
    if (img?.b64_json) return `data:image/png;base64,${img.b64_json}`;
    return "";
  }

  // ── Convenience: image file → extracted text → generated image ───────────
  async function generateTimetableImage(imageFile, themeText) {
    const textResult = await extractTimetableFromImage(imageFile);
    const imageUrl   = await generateImageFromText(textResult, themeText);
    return { textResult, imageUrl };
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = (e) => resolve(e.target.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Expose globally ───────────────────────────────────────────────────────
  window.azure = {
    complete,
    extractTimetableFromImage,
    generateImageFromText,
    generateTimetableImage,
  };

  // Back-compat alias for existing window.claude.complete() callers
  window.claude = { complete };
})();
