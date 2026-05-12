import type { NextRequest } from "next/server";
import { getSnapshot, subscribe, forceRefresh, type ConditionsSnapshot } from "@/lib/weatherCache";

// SSE must run on the Node.js runtime (not Edge) and never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

const formatEvent = (event: string, data: unknown): Uint8Array =>
  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // ?refresh=1 forces a bypass of the cache freshness window. The browser
  // hits this when the user pulls-to-refresh / hard-reloads.
  const forced = url.searchParams.get("refresh") === "1";

  // For one-shot JSON polling fallback (no SSE), allow ?stream=0.
  const stream = url.searchParams.get("stream") !== "0";

  const initial: ConditionsSnapshot = forced
    ? await forceRefresh()
    : await getSnapshot();

  if (!stream) {
    return Response.json(initial, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try { controller.enqueue(chunk); }
        catch { /* controller already closed by abort */ }
      };

      // Push the initial snapshot immediately so the client can reconcile
      // with what the server already rendered.
      safeEnqueue(formatEvent("snapshot", initial));

      const unsubscribe = subscribe((snap) => {
        safeEnqueue(formatEvent("snapshot", snap));
      });

      // Keepalive every 25s. Some proxies (Cloudflare/Fly edge) drop idle
      // event-stream connections after ~30–60s.
      const keepalive = setInterval(() => {
        safeEnqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
      }, 25_000);
      if (typeof keepalive === "object" && "unref" in keepalive) {
        (keepalive as NodeJS.Timeout).unref();
      }

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(keepalive);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      // Disable buffering on proxies like nginx that respect this header.
      "X-Accel-Buffering": "no",
    },
  });
}
