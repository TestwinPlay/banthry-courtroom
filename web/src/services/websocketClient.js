/**
 * Courtroom WebSocket Client for live audio bidi streaming and real-time events.
 */

export class CourtroomWebSocketClient {
  constructor(sessionId, role = 'Petitioner', studentName = 'Learned Counsel', onEvent) {
    this.sessionId = sessionId;
    this.role = role;
    this.studentName = studentName;
    this.onEvent = onEvent;
    this.socket = null;
    this.isOpen = false;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/courtroom/${this.sessionId}?role=${encodeURIComponent(this.role)}&student_name=${encodeURIComponent(this.studentName)}`;

    this.socket = new WebSocket(url);
    this.socket.binaryType = 'arraybuffer';

    this.socket.onopen = () => {
      this.isOpen = true;
      if (this.onEvent) {
        this.onEvent({ type: 'connection_status', status: 'connected' });
      }
    };

    this.socket.onmessage = (event) => {
      try {
        if (typeof event.data === 'string') {
          const parsed = JSON.parse(event.data);
          if (this.onEvent) this.onEvent(parsed);
        }
      } catch (e) {
        console.error('Error handling WebSocket message:', e);
      }
    };

    this.socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      if (this.onEvent) {
        this.onEvent({ type: 'connection_status', status: 'error', error: err });
      }
    };

    this.socket.onclose = () => {
      this.isOpen = false;
      if (this.onEvent) {
        this.onEvent({ type: 'connection_status', status: 'disconnected' });
      }
    };
  }

  sendAudioChunk(arrayBuffer) {
    if (this.socket && this.isOpen) {
      this.socket.send(arrayBuffer);
    }
  }

  sendJson(payload) {
    if (this.socket && this.isOpen) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  sendUserSpeech(transcriptText) {
    this.sendJson({
      type: 'user_transcript',
      text: transcriptText,
    });
  }

  raiseObjection(objectionType, grounds) {
    this.sendJson({
      type: 'raise_objection',
      objection_type: objectionType,
      grounds,
    });
  }

  verifyCitation(citation, context = '') {
    this.sendJson({
      type: 'verify_citation',
      citation,
      context,
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isOpen = false;
  }
}
