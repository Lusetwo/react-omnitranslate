export class TranslationSocket {
  private socket: WebSocket | null = null

  connect(url: string): void {
    this.disconnect()
    this.socket = new WebSocket(url)
  }

  onMessage(handler: (payload: unknown) => void): void {
    if (!this.socket) {
      return
    }

    this.socket.onmessage = (event) => {
      try {
        handler(JSON.parse(event.data))
      } catch {
        handler(event.data)
      }
    }
  }

  send(payload: unknown): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return
    }

    this.socket.send(JSON.stringify(payload))
  }

  disconnect(): void {
    if (!this.socket) {
      return
    }

    this.socket.close()
    this.socket = null
  }
}
