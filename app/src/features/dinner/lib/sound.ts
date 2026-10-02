let context: AudioContext | null = null;
let room: AudioBufferSourceNode | null = null;
let roomGain: GainNode | null = null;
let speechMuted = false;
let roomRevision = 0;
export function muteForSpeech(muted: boolean) {
  speechMuted = muted;
  if (roomGain && context) roomGain.gain.setTargetAtTime(muted ? 0 : .11, context.currentTime, .06);
}
export async function toggleRoom(enabled: boolean) {
  const revision = ++roomRevision;
  if (!enabled) { room?.stop(); room=null; await context?.suspend(); return; }
  context ??= new AudioContext(); await context.resume();
  if (revision !== roomRevision) return;
  if (room) return;
  const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate);
  const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.3;
  room=context.createBufferSource();room.buffer=buffer;room.loop=true;
  const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=430;
  const gain=context.createGain();roomGain=gain;gain.gain.value=speechMuted?0:.11;
  room.connect(filter).connect(gain).connect(context.destination);room.start();
}
export function clink() {
  if(speechMuted||!context||context.state!=='running')return;
  [1800,2650].forEach((frequency,i)=>{const oscillator=context!.createOscillator();const gain=context!.createGain();oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.023/(i+1),context!.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context!.currentTime+.45);oscillator.connect(gain).connect(context!.destination);oscillator.start();oscillator.stop(context!.currentTime+.5);});
}
