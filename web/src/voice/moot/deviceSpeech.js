export function createDeviceSpeech() {
  return {
    canListen: true,
    canSpeak: true,
    speak: (text, opts) => {},
    cancelSpeech: () => {},
    startListening: (cb) => {},
    stopListening: () => {},
    dispose: () => {},
  };
}
