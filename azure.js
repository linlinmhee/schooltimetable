// ─── Azure OpenAI Client ───────────────────────────────────────────────────
// Provides:
//   window.azure.complete({ messages })            → string (chat)
//   window.azure.generateTimetableImage(imageFile, themeText) → { textResult, imageUrl }
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
          apiKey:           env.AZURE_OPENAI_API_KEY,
          endpoint:         (env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, ""),
          apiVersion:       env.AZURE_OPENAI_API_VERSION  || "2025-01-01-preview",
          chatDeployment:   env.AZURE_OPENAI_CHAT_DEPLOYMENT  || "gpt-4.1-nano",
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
      // strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
    return out;
  }

  // ── URL builders ──────────────────────────────────────────────────────────
  function chatUrl(cfg) {
    return `${cfg.endpoint}/openai/deployments/${cfg.chatDeployment}/chat/completions?api-version=${cfg.apiVersion}`;
  }

  function imageGenUrl(cfg) {
    return `${cfg.endpoint}/openai/deployments/${cfg.imageDeployment}/images/generations?api-version=${cfg.apiVersion}`;
  }

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

  // ── 1) Chat / vision completions ───────────────────────────────────────────
  async function complete({ messages }) {
    const cfg = await loadConfig();
    const data = await post(cfg, chatUrl(cfg), {
      model: cfg.chatDeployment,
      messages,
      max_tokens: 4096,
      temperature: 0.7,
    });
    return data.choices?.[0]?.message?.content ?? "";
  }

  // ── 2) Two-step: image → text → generated image ────────────────────────────
  async function generateTimetableImage(imageFile, themeText) {
    const cfg = await loadConfig();

    // Step 1: Vision — extract timetable text from image
    const base64 = await fileToBase64(imageFile);
    const visionMessages = [
      {
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
            text: "This is a school timetable image. Extract all content: subjects, time slots, and day columns. Describe the full timetable structure clearly so it can be recreated as a designed image.",
          },
        ],
      },
    ];

    const visionData = await post(cfg, chatUrl(cfg), {
      model: cfg.chatDeployment,
      messages: visionMessages,
      max_tokens: 2048,
      temperature: 0.3,
    });
    const textResult = visionData.choices?.[0]?.message?.content ?? "";

    // Step 2: Image generation
    const systemPrompt = `create a timetable in theme of ${themeText} make it easy to read and friendly for kids`;
    const imagePrompt  = `${systemPrompt}\n\nTimetable content:\n${textResult}`;

    const imgData = await post(cfg, imageGenUrl(cfg), {
      model: cfg.imageDeployment,
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      output_format: "png",
    });

    const img = imgData.data?.[0];
    let generatedImageUrl = "";
    if (img?.url) {
      generatedImageUrl = img.url;
    } else if (img?.b64_json) {
      generatedImageUrl = `data:image/png;base64,${img.b64_json}`;
    }

    return { textResult, imageUrl: generatedImageUrl };
  }

  // ── Utility ────────────────────────────────────────────────────────────────
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = (e) => resolve(e.target.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Expose globally ────────────────────────────────────────────────────────
  window.azure = { complete, generateTimetableImage };

  // Alias so existing window.claude.complete() calls keep working
  window.claude = { complete };
})();
