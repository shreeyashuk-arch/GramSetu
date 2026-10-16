// In-memory Server-Sent Events (SSE) manager
type Listener = (data: { event: string; payload: any }) => void;

class SSEManager {
  private listeners: Set<Listener> = new Set();

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public broadcast(event: string, payload: any) {
    this.listeners.forEach((listener) => {
      try {
        listener({ event, payload });
      } catch (err) {
        console.error('SSE listener error:', err);
      }
    });
  }
}

// Global singleton to persist across Next.js dev reloads
const globalForSSE = globalThis as unknown as {
  sseManager: SSEManager | undefined;
};

export const sseManager = globalForSSE.sseManager ?? new SSEManager();
if (process.env.NODE_ENV !== 'production') globalForSSE.sseManager = sseManager;
