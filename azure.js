// ─── Azure OpenAI Client ───────────────────────────────────────────────────
// Provides:
//   window.azure.complete({ messages })            → string (chat)
//   window.azure.generateTimetableImage(imageFile, themeText) → { textResult, imageUrl }

(function () {
  // ── Credentials (no build step — plain HTML app) ──────────────────────────
  const AZURE_ENDPOINT   = "https://foundry-songkran26-prj2-resource.services.ai.azure.com/api/projects/foundry-songkran26-prj2";
  const AZURE_API_KEY    = "REDACTED-ROTATE-IN-AZURE";
  const API_VERSION      = "2025-01-01-preview";

  // Deployment names
  const CHAT_DEPLOYMENT  = "gpt-4.1-nano";   // used for vision + theme JSON
  const IMAGE_DEPLOYMENT = "gpt-image-2";    // used for image generation

  // ── Helpers ────────────────────────────────────────────────────────────────

  function chatUrl() {
    return `${AZURE_ENDPOINT}/openai/deployments/${CHAT_DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;
  }

  function imageUrl() {
    return `${AZURE_ENDPOINT}/openai/deployments/${IMAGE_DEPLOYMENT}/images/generations?api-version=${API_VERSION}`;
  }

  async function post(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": AZURE_API_KEY,
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
  // Drop-in replacement for window.claude.complete({ messages })
  async function complete({ messages }) {
    const data = await post(chatUrl(), {
      model: CHAT_DEPLOYMENT,
      messages,
      max_tokens: 4096,
      temperature: 0.7,
    });
    return data.choices?.[0]?.message?.content ?? "";
  }

  // ── 2) Two-step: image → text → generated image ────────────────────────────
  /**
   * @param {File}   imageFile   The uploaded timetable photo
   * @param {string} themeText   The theme chosen by the user (e.g. "dinosaurs")
   * @returns {{ textResult: string, imageUrl: string }}
   */
  async function generateTimetableImage(imageFile, themeText) {
    // ── Step 1: Vision call — extract timetable text from image ──────────────
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

    const visionData = await post(chatUrl(), {
      model: CHAT_DEPLOYMENT,
      messages: visionMessages,
      max_tokens: 2048,
      temperature: 0.3,
    });
    const textResult = visionData.choices?.[0]?.message?.content ?? "";

    // ── Step 2: Image generation call ─────────────────────────────────────────
    const systemPrompt = `create a timetable in theme of ${themeText} make it easy to read and friendly for kids`;
    const imagePrompt  = `${systemPrompt}\n\nTimetable content:\n${textResult}`;

    const imgData = await post(imageUrl(), {
      model: IMAGE_DEPLOYMENT,
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      output_format: "png",
    });

    // Azure returns either a URL or base64 depending on response_format
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
