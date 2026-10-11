/**
 * A reliable, ordered message channel to one other browser in a room (D16). The application provides it (WebRTC
 * through PeerJS, or a same-browser channel for tests); the engine only sends and receives through it. Messages are
 * structured-cloneable values; `ArrayBuffer`s pass as binary.
 */
export interface PeerLink {
  send(message: unknown): void;
  onMessage(listener: (message: unknown) => void): () => void;
  /** Called once when the channel closes, from either end or by losing the connection. */
  onClose(listener: () => void): () => void;
  close(): void;
}
