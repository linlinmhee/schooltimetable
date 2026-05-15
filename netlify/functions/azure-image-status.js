// Status / result endpoint for the background image job.
// Client calls GET /.netlify/functions/azure-image-status?jobId=<id>
// repeatedly until it sees status === 'done' or 'error'.

import { getStore } from "@netlify/blobs";

const STORE_NAME = "image-jobs";

export const handler = async (event) => {
  const jobId = event.queryStringParameters?.jobId;
  if (!jobId) {
    return jsonResponse(400, { error: "jobId query param required" });
  }

  try {
    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    const job = await store.get(`job:${jobId}`, { type: "json" });
    if (!job) {
      // Job hasn't been registered yet (race with background start) — treat
      // as pending so the client keeps polling.
      return jsonResponse(200, { status: "pending" });
    }
    return jsonResponse(200, job);
  } catch (e) {
    return jsonResponse(500, { error: `Status lookup failed: ${e.message}` });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}
