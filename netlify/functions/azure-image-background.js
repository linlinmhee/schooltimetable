// Netlify BACKGROUND function: runs the slow gpt-image-2 call asynchronously.
//
// Netlify treats any function file with the `-background` suffix as a
// background function: the HTTP request returns 202 IMMEDIATELY while the
// function keeps running (up to 15 minutes) in the background. The client
// can't read the result from this response directly — it polls
// `azure-image-status.js` for the same jobId until the result lands in
// Netlify Blobs.
//
// NOTE: Background Functions require the Netlify Pro plan.
//
// Required env vars (same as the chat proxy):
//   AZURE_OPENAI_API_KEY
//   AZURE_OPENAI_ENDPOINT
//   AZURE_OPENAI_API_VERSION
//   AZURE_OPENAI_IMAGE_DEPLOYMENT

import { getStore } from "@netlify/blobs";

const STORE_NAME = "image-jobs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { jobId, payload } = body;
  if (!jobId || !payload) {
    return { statusCode: 400, body: "jobId and payload are required" };
  }

  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  await store.setJSON(`job:${jobId}`, { status: "pending", startedAt: Date.now() });

  const {
    AZURE_OPENAI_API_KEY: apiKey,
    AZURE_OPENAI_ENDPOINT: rawEndpoint,
    AZURE_OPENAI_API_VERSION: apiVersion,
    AZURE_OPENAI_IMAGE_DEPLOYMENT: imageDeployment,
  } = process.env;

  const missing = [
    !apiKey          && "AZURE_OPENAI_API_KEY",
    !rawEndpoint     && "AZURE_OPENAI_ENDPOINT",
    !apiVersion      && "AZURE_OPENAI_API_VERSION",
    !imageDeployment && "AZURE_OPENAI_IMAGE_DEPLOYMENT",
  ].filter(Boolean);
  if (missing.length) {
    await store.setJSON(`job:${jobId}`, {
      status: "error",
      error: `Server is missing required env vars: ${missing.join(", ")}`,
    });
    return { statusCode: 202, body: "" };
  }

  // Kick off the actual Azure call. We do NOT await this before returning
  // 202; the function host keeps the process alive until the promise
  // resolves (or hits the 15-min ceiling).
  runJob({ jobId, payload, apiKey, rawEndpoint, apiVersion, imageDeployment, store })
    .catch(async (e) => {
      try {
        await store.setJSON(`job:${jobId}`, { status: "error", error: e.message });
      } catch { /* swallow */ }
    });

  return { statusCode: 202, body: "" };
};

async function runJob({ jobId, payload, apiKey, rawEndpoint, apiVersion, imageDeployment, store }) {
  const endpoint = rawEndpoint.replace(/\/+$/, "");
  const url = `${endpoint}/openai/deployments/${imageDeployment}/images/generations?api-version=${apiVersion}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify(payload),
  });
  const text = await res.text();

  if (!res.ok) {
    await store.setJSON(`job:${jobId}`, {
      status: "error",
      error: `Azure ${res.status}: ${text}`,
    });
    return;
  }

  let data;
  try { data = JSON.parse(text); }
  catch {
    await store.setJSON(`job:${jobId}`, {
      status: "error",
      error: "Azure returned non-JSON response",
    });
    return;
  }

  const img = data?.data?.[0];
  let imageUrl = "";
  if (img?.url)      imageUrl = img.url;
  else if (img?.b64_json) imageUrl = `data:image/png;base64,${img.b64_json}`;

  if (!imageUrl) {
    await store.setJSON(`job:${jobId}`, {
      status: "error",
      error: "Azure returned no image data",
    });
    return;
  }

  await store.setJSON(`job:${jobId}`, {
    status: "done",
    imageUrl,
    finishedAt: Date.now(),
  });
}
