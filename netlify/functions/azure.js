// Netlify serverless proxy for the Azure CHAT/VISION endpoint only.
// Image generation lives in `azure-image-background.js` because it can
// exceed the 26-second sync function ceiling on Netlify.
//
// Required env vars (set in Netlify dashboard, no defaults in code):
//   AZURE_OPENAI_API_KEY
//   AZURE_OPENAI_ENDPOINT
//   AZURE_OPENAI_API_VERSION
//   AZURE_OPENAI_CHAT_DEPLOYMENT

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const {
    AZURE_OPENAI_API_KEY: apiKey,
    AZURE_OPENAI_ENDPOINT: rawEndpoint,
    AZURE_OPENAI_API_VERSION: apiVersion,
    AZURE_OPENAI_CHAT_DEPLOYMENT: chatDeployment,
  } = process.env;

  const missing = [
    !apiKey         && "AZURE_OPENAI_API_KEY",
    !rawEndpoint    && "AZURE_OPENAI_ENDPOINT",
    !apiVersion     && "AZURE_OPENAI_API_VERSION",
    !chatDeployment && "AZURE_OPENAI_CHAT_DEPLOYMENT",
  ].filter(Boolean);
  if (missing.length) {
    return jsonResponse(500, {
      error: `Server is missing required env vars: ${missing.join(", ")}`,
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON in request body" });
  }
  const { action, payload = {} } = body;

  if (action !== "chat") {
    return jsonResponse(400, {
      error: `Unsupported action: ${action}. Use POST /.netlify/functions/azure-image-background for image generation.`,
    });
  }

  const endpoint = rawEndpoint.replace(/\/+$/, "");
  const url = `${endpoint}/openai/deployments/${chatDeployment}/chat/completions?api-version=${apiVersion}`;

  try {
    const azureRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify(payload),
    });
    const text = await azureRes.text();
    return {
      statusCode: azureRes.status,
      headers: { "Content-Type": azureRes.headers.get("content-type") || "application/json" },
      body: text,
    };
  } catch (e) {
    return jsonResponse(502, { error: `Upstream call to Azure failed: ${e.message}` });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
