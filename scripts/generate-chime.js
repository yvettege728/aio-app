const fs = require('fs');
const sampleRate = 44100;
const seconds = 1.2;
const count = Math.floor(sampleRate * seconds);
const data = Buffer.alloc(count * 2);
for (let i = 0; i < count; i += 1) {
  const t = i / sampleRate;
  const envelope = Math.min(1, t / 0.12) * Math.min(1, (seconds - t) / 0.35);
  const sample = Math.sin(2 * Math.PI * 523.25 * t) * 0.34 * envelope + Math.sin(2 * Math.PI * 659.25 * t) * 0.12 * envelope;
  data.writeInt16LE(Math.max(-1, Math.min(1, sample)) * 32767, i * 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8); header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
fs.writeFileSync(new URL('../assets/sounds/chime.wav', `file://${__dirname}/`), Buffer.concat([header, data]));
