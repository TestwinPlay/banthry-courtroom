/**
 * Captures microphone audio, downsamples/encodes to 16-bit linear PCM (16kHz mono),
 * and streams raw chunks upstream.
 */

export class AudioRecorder {
  constructor(onAudioChunk, onVolumeChange) {
    this.onAudioChunk = onAudioChunk;
    this.onVolumeChange = onVolumeChange;
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.source = null;
    this.isRecording = false;
  }

  async start() {
    if (this.isRecording) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });

    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Buffer size of 2048 samples (~128ms at 16kHz) provides low latency for bidi streaming
    this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);

      // Calculate instantaneous RMS volume for visualizer
      if (this.onVolumeChange) {
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.onVolumeChange(Math.min(1, rms * 5));
      }

      // Convert Float32Array to 16-bit Linear PCM (Int16Array)
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      if (this.onAudioChunk) {
        this.onAudioChunk(pcm16.buffer);
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    this.isRecording = true;
  }

  stop() {
    if (!this.isRecording) return;
    this.isRecording = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }
}
