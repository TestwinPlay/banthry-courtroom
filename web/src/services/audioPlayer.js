/**
 * Smoothly plays audio received as base64 PCM / wav chunks from backend.
 */

export class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.nextStartTime = 0;
    this.isPlaying = false;
  }

  _initContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 24000 });
      this.nextStartTime = this.audioContext.currentTime;
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playBase64PCM(base64Audio, sampleRate = 24000) {
    this._initContext();

    try {
      // Decode base64 to binary
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM bytes to Float32
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      // Create audio buffer
      const buffer = this.audioContext.createBuffer(1, float32.length, sampleRate);
      buffer.copyToChannel(float32, 0);

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);

      const currentTime = this.audioContext.currentTime;
      const startTime = Math.max(currentTime, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + buffer.duration;
      this.isPlaying = true;

      source.onended = () => {
        if (this.audioContext && this.audioContext.currentTime >= this.nextStartTime) {
          this.isPlaying = false;
        }
      };
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  }

  stop() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.nextStartTime = 0;
    this.isPlaying = false;
  }
}

export const audioPlayer = new AudioPlayer();
