// ─── Azure OpenAI Client (browser side) ──────────────────────────────────
// Public API on `window.azure`:
//   complete({ messages, temperature?, max_completion_tokens? })  → string
//   extractTimetableFromImage(file)                               → string
//   generateImageFromText(timetableText, themeText)               → image URL / data URL
//   generateTimetableImage(file, themeText)                       → { textResult, imageUrl }
//
// Architecture (so the Azure API key never reaches the browser):
//   - chat / vision  → POST /.netlify/functions/azure              (sync, fast)
//   - image gen      → POST /.netlify/functions/azure-image-background (returns 202)
//                      then GET /.netlify/functions/azure-image-status?jobId=...
//                      until the job resolves. Required because gpt-image-2
//                      can exceed Netlify's 26s sync ceiling.
//
// Local development: run `netlify dev` (npm i -g netlify-cli). A plain
// static server (npx serve) won't have the functions.

(function () {
  const CHAT_URL          = "/.netlify/functions/azure";
  const IMAGE_BG_URL      = "/.netlify/functions/azure-image-background";
  const IMAGE_STATUS_URL  = "/.netlify/functions/azure-image-status";

  async function callProxy(action, payload) {
    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { rawText: text }; }
    if (!res.ok) {
      const msg = data?.error?.message || data?.error || data?.rawText || res.statusText;
      throw new Error(`Proxy ${res.status}: ${msg}`);
    }
    return data;
  }

  async function runImageJob(payload) {
    const jobId = (crypto.randomUUID && crypto.randomUUID()) ||
                  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const startRes = await fetch(IMAGE_BG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, payload }),
    });
    if (startRes.status !== 202) {
      const t = await startRes.text().catch(() => "");
      throw new Error(`Failed to start image job (${startRes.status}): ${t || startRes.statusText}`);
    }

    const POLL_MS  = 3000;
    const MAX_WAIT = 10 * 60 * 1000; // 10 min hard ceiling
    const started  = Date.now();

    while (Date.now() - started < MAX_WAIT) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      try {
        const sRes = await fetch(`${IMAGE_STATUS_URL}?jobId=${encodeURIComponent(jobId)}`);
        if (!sRes.ok) continue; // transient — keep polling
        const job = await sRes.json();
        if (job.status === "done")  return job.imageUrl || "";
        if (job.status === "error") throw new Error(job.error || "Image generation failed");
        // status === "pending" → keep polling
      } catch (e) {
        // Network blips during polling shouldn't kill the whole job — only
        // re-throw if the server explicitly reported an error.
        if (e.message?.startsWith("Image") || e.message?.startsWith("Azure")) throw e;
      }
    }
    throw new Error("Image generation timed out after 10 minutes");
  }

  // ── Chat / vision completions ─────────────────────────────────────────────
  // max_completion_tokens is OPTIONAL — omit to let the model use its full budget.
  async function complete({ messages, temperature = 0.7, max_completion_tokens }) {
    const body = { messages, temperature };
    if (max_completion_tokens != null) body.max_completion_tokens = max_completion_tokens;
    const data = await callProxy("chat", body);
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

    return runImageJob({
      prompt,
      n: 1,
      size: "1536x1024",
      quality: "high",
      output_format: "png",
    });
  }

  // ── Convenience: image file → extracted text → generated image ────────────
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

  window.azure = {
    complete,
    extractTimetableFromImage,
    generateImageFromText,
    generateTimetableImage,
  };

  // Back-compat alias for existing window.claude.complete() callers
  window.claude = { complete };
})();
