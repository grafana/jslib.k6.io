// src/capture.ts
async function captureScreenshot(page, options) {
  const { caption = "", fullPage = false, store } = options;
  const buffer = await page.screenshot({ fullPage });
  const uuid = crypto.randomUUID();
  await store.upload(buffer, uuid, caption);
}

// src/stores/loki.ts
import encoding from "k6/encoding";
import secrets from "k6/secrets";

// src/internal/push.ts
import http from "k6/http";
function nowNano() {
  return String(Date.now() * 1e6);
}
function buildLogLine(level, message, extra) {
  return JSON.stringify({
    level,
    message,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...extra
  });
}
function pushToLoki(streams, uuid, creds) {
  const host = creds.host.startsWith("http") ? creds.host : `https://${creds.host}`;
  const res = http.post(
    `${host}/loki/api/v1/push`,
    JSON.stringify({ streams }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${creds.auth}`
      }
    }
  );
  if (res.status !== 204) {
    throw new Error(`Loki push failed [${res.status}]: ${res.body}`);
  } else if (uuid) {
    console.log(`screenshot:${uuid}`);
  }
}

// src/internal/chunking.ts
var DEFAULT_CHUNK_SIZE = 200 * 1024;
function chunkBase64(base64, chunkSize = DEFAULT_CHUNK_SIZE) {
  if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
    throw new Error(`chunkSize must be a positive number, got ${chunkSize}`);
  }
  const chunks = [];
  for (let i = 0; i < base64.length; i += chunkSize) {
    chunks.push(base64.slice(i, i + chunkSize));
  }
  return chunks;
}

// src/stores/loki.ts
function loki(config = {}) {
  return {
    async upload(buffer, uuid, caption) {
      const lokiHost = await secrets.get("sm-screenshot-loki-host");
      const lokiAuth = await secrets.get("sm-screenshot-loki-auth");
      const creds = { host: lokiHost, auth: lokiAuth };
      const base64 = encoding.b64encode(buffer);
      const chunks = chunkBase64(base64, config.chunkSize);
      const screenshotSize = `${Math.ceil(base64.length * 0.75)} bytes`;
      const baseNano = BigInt(Date.now()) * 1000000n;
      for (let i = 0; i < chunks.length; i++) {
        const tsNano = String(baseNano + BigInt(i));
        pushToLoki(
          [
            {
              stream: {
                source: "synthetic-monitoring-agent-screenshot",
                level: "info"
              },
              values: [
                [
                  tsNano,
                  buildLogLine("info", "page screenshot", {
                    id: uuid,
                    screenshot_base64: chunks[i],
                    caption,
                    screenshot_size_bytes: screenshotSize,
                    chunk_index: i,
                    chunk_total: chunks.length
                  })
                ]
              ]
            }
          ],
          i === 0 ? uuid : null,
          creds
        );
      }
    }
  };
}

// src/stores/gcs.ts
import secrets2 from "k6/secrets";
import { AWSConfig, S3Client } from "https://jslib.k6.io/aws/0.14.0/s3.js";
function gcs(config = {}) {
  return {
    async upload(buffer, uuid, caption) {
      const filename = `${uuid}.png`;
      const gcsAccessKey = await secrets2.get("sm-screenshot-gcs-access-key");
      const gcsSecretKey = await secrets2.get("sm-screenshot-gcs-secret-key");
      const gcsBucket = config.bucket || await secrets2.get("sm-screenshot-gcs-bucket");
      const lokiHost = await secrets2.get("sm-screenshot-loki-host");
      const lokiAuth = await secrets2.get("sm-screenshot-loki-auth");
      const creds = { host: lokiHost, auth: lokiAuth };
      const s3 = new S3Client(
        new AWSConfig({
          region: "auto",
          accessKeyId: gcsAccessKey,
          secretAccessKey: gcsSecretKey,
          endpoint: "storage.googleapis.com"
        })
      );
      await s3.putObject(gcsBucket, filename, buffer, {
        contentType: "image/png"
      });
      const screenshotUrl = `https://storage.googleapis.com/${gcsBucket}/${filename}`;
      pushToLoki(
        [
          {
            stream: {
              source: "synthetic-monitoring-agent-screenshot",
              level: "info"
            },
            values: [
              [
                nowNano(),
                buildLogLine("info", "page screenshot", {
                  id: uuid,
                  screenshot_url: screenshotUrl,
                  caption
                })
              ]
            ]
          }
        ],
        uuid,
        creds
      );
    }
  };
}
export {
  captureScreenshot,
  gcs,
  loki
};
//# sourceMappingURL=index.js.map
