// Netlify serverless proxy for Azure OpenAI.
// The browser calls /.netlify/functions/azure with an { action, payload } body;
// this function reads the API key from Netlify environment variables
// (NEVER exposed to the browser) and forwards the request to Azure.
//
// Required env vars in Netlify (Site settings → Environment variables):
//   AZURE_OPENAI_API_KEY
//   AZURE_OPENAI_ENDPOINT
//   AZURE_OPENAI_API_VERSION
//   AZURE_OPENAI_CHAT_DEPLOYMENT
//   AZURE_OPENAI_IMAGE_DEPLOYMENT
// All are required (no defaults baked in) so that committed code contains
// nothing matching env var values — keeps Netlify's secret scanner happy.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const {
    AZURE_OPENAI_API_KEY: apiKey,
    AZURE_OPENAI_ENDPOINT: rawEndpoint,
    AZURE_OPENAI_API_VERSION: apiVersion,
    AZURE_OPENAI_CHAT_DEPLOYMENT: chatDeployment,
    AZURE_OPENAI_IMAGE_DEPLOYMENT: imageDeployment,
  } = process.env;

  const missing = [
    !apiKey          && "AZURE_OPENAI_API_KEY",
    !rawEndpoint     && "AZURE_OPENAI_ENDPOINT",
    !apiVersion      && "AZURE_OPENAI_API_VERSION",
    !chatDeployment  && "AZURE_OPENAI_CHAT_DEPLOYMENT",
    !imageDeployment && "AZURE_OPENAI_IMAGE_DEPLOYMENT",
  ].filter(Boolean);
  if (missing.length) {
    return jsonResponse(500, {
      error: `Server is missing required env vars: ${missing.join(", ")}`,
    });
  }
  const endpoint = rawEndpoint.replace(/\/+$/, "");

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON in request body" });
  }
  const { action, payload = {} } = body;

  let url;
  if (action === "chat") {
    url = `${endpoint}/openai/deployments/${chatDeployment}/chat/completions?api-version=${apiVersion}`;
  } else if (action === "image") {
    url = `${endpoint}/openai/deployments/${imageDeployment}/images/generations?api-version=${apiVersion}`;
  } else {
    return jsonResponse(400, { error: `Unknown action: ${action}. Expected 'chat' or 'image'.` });
  }

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
