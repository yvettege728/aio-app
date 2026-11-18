"""Synthesise aio's two wind sounds (no samples, no licences).

  rustle.wav  a short soft breath of air, played while letters fall away
  wind.wav    a longer gust that swells and fades, played when everything is gone

Filtered noise with a slowly drifting cutoff and a smooth envelope.
Run: python3 scripts/make-wind-sounds.py
"""
import math, random, struct, wave, os

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "wind", "assets")


def gust(seconds, peak, attack, seed, lo, hi, wobble):
    rnd = random.Random(seed)
    n = int(RATE * seconds)
    out, a, b, brown = [], 0.0, 0.0, 0.0
    for i in range(n):
        t = i / n
        # envelope: smooth rise then long fall
        env = (t / attack) ** 1.6 if t < attack else ((1 - t) / (1 - attack)) ** 1.8
        env = math.sin(env * math.pi / 2)
        # cutoff drifts so it sounds like moving air, not static
        drift = 0.5 + 0.5 * math.sin(2 * math.pi * wobble * t + 1.3) * math.sin(2 * math.pi * wobble * 0.37 * t)
        cut = lo + (hi - lo) * (0.35 + 0.65 * env) * (0.7 + 0.3 * drift)
        k = 1 - math.exp(-2 * math.pi * cut / RATE)
        white = rnd.uniform(-1, 1)
        brown = 0.985 * brown + 0.06 * white
        x = 0.55 * white + 0.45 * brown
        a += k * (x - a)          # two one-pole lowpasses = softer slope
        b += k * (a - b)
        out.append(b * env * peak)
    m = max(abs(v) for v in out) or 1
    return [v / m * peak for v in out]


def write(name, samples):
    path = os.path.join(OUT, name)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v)) * 32767)) for v in samples))
    print(path)


write("rustle.wav", gust(0.42, 0.55, 0.28, seed=7, lo=500, hi=2600, wobble=3.0))
write("wind.wav", gust(2.6, 0.7, 0.3, seed=11, lo=260, hi=1500, wobble=1.4))
