const fs = require('fs');
const path = require('path');

const sampleRate = 24000;
const seconds = 12;

function writeWave(filename, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, index) => {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), index * 2);
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'sounds', filename), Buffer.concat([header, data]));
}

const count = sampleRate * seconds;
const ambience = new Array(count);
for (let i = 0; i < count; i += 1) {
  const t = i / sampleRate;
  const phase = (t % seconds) / seconds;
  const swell = 0.76 + 0.24 * Math.sin(2 * Math.PI * phase);
  const softHarmonic =
    Math.sin(2 * Math.PI * 144 * t) * 0.38 +
    Math.sin(2 * Math.PI * 192 * t) * 0.27 +
    Math.sin(2 * Math.PI * 216 * t) * 0.19 +
    Math.sin(2 * Math.PI * 288 * t) * 0.08;
  ambience[i] = softHarmonic * swell * 0.12;
}
writeWave('ambience.wav', ambience);

const cueSeconds = 2.4;
const cueCount = Math.floor(sampleRate * cueSeconds);
const cue = new Array(cueCount);
for (let i = 0; i < cueCount; i += 1) {
  const t = i / sampleRate;
  const swell = Math.sin(Math.PI * Math.min(1, t / cueSeconds)) ** 1.4;
  const tone = Math.sin(2 * Math.PI * 293.66 * t) * 0.58 + Math.sin(2 * Math.PI * 369.99 * t) * 0.27 + Math.sin(2 * Math.PI * 440 * t) * 0.1;
  cue[i] = tone * swell * 0.36;
}
writeWave('zen-cue.wav', cue);
