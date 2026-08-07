/**
 * `credda listen` — a local webhook receiver for development.
 *
 * Accepts POSTs on a local port, verifies each delivery's HMAC signature with
 * the webhook's signing secret (when provided), and pretty-prints the payload.
 * Responds 200 so a tunneled Credda delivery counts as delivered.
 *
 * Honest scope: Credda only delivers to public HTTPS endpoints, so this does
 * NOT tunnel by itself — put your own tunnel in front (cloudflared, ngrok, …)
 * and register the tunnel URL as the webhook. What this gives you is the
 * Stripe-CLI-style local loop: see every delivery, verify its signature the
 * same way your production handler must, and iterate without redeploying.
 */

import { createServer } from 'node:http';
import { verifyWebhookSignature } from '@credda/js/headless';

export function startListener(opts: { port: number; secret?: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        void (async () => {
          const rawBody = Buffer.concat(chunks).toString('utf8');
          const time = new Date().toISOString();

          let verdict = 'unverified (set CREDDA_WEBHOOK_SECRET to verify signatures)';
          if (opts.secret) {
            try {
              const result = await verifyWebhookSignature({
                secret: opts.secret,
                rawBody,
                signatureHeader: req.headers['x-credda-signature'] as string | undefined,
                timestampHeader: req.headers['x-credda-timestamp'] as string | undefined,
              });
              verdict = result.valid ? 'signature VERIFIED' : `signature INVALID: ${result.reason}`;
            } catch (e) {
              verdict = `signature check errored: ${e instanceof Error ? e.message : String(e)}`;
            }
          }

          let pretty = rawBody;
          let eventType = req.headers['x-credda-event'] ?? '?';
          try {
            const parsed = JSON.parse(rawBody) as { type?: string };
            if (parsed.type) eventType = parsed.type;
            pretty = JSON.stringify(parsed, null, 2);
          } catch {
            // non-JSON body — print raw
          }

          console.log(`\n── ${time} · ${req.method} ${req.url} · ${String(eventType)} · ${verdict}`);
          console.log(pretty);

          res.writeHead(200, { 'content-type': 'application/json' });
          res.end('{"received":true}');
        })();
      });
    });

    server.on('error', reject);
    server.listen(opts.port, () => {
      console.error(`credda listen: receiving webhook deliveries on http://localhost:${opts.port}`);
      console.error(
        opts.secret
          ? 'Signatures will be verified with CREDDA_WEBHOOK_SECRET.'
          : 'No CREDDA_WEBHOOK_SECRET set; payloads will print unverified.',
      );
      console.error('Expose this port with your own tunnel and register the HTTPS URL as your webhook. Ctrl+C to stop.');
    });

    // Runs until the process is interrupted.
    process.on('SIGINT', () => {
      server.close(() => resolve());
      // Give close a moment, then let the default handler end the process.
      setTimeout(() => resolve(), 200);
    });
  });
}
