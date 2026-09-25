"""Generate the original, deterministic 21-second instrumental used by this Brag.

Run with Python 3, then encode the WAV as MP3 with FFmpeg. No third-party assets.
"""

from array import array
from math import cos, exp, pi, sin, tanh
from pathlib import Path
import wave

RATE = 22050
DURATION = 21
TEMPO = 110
BEAT = 60 / TEMPO
OUT = Path(__file__).with_name("market-evidence-bed.wav")

# Original four-chord motif: Cm, Ab, Eb, Bb. Multiple quiet sine partials
# form a soft pad; pitched plucks and a tiny filtered tick mark the edit.
CHORDS = (
    (130.81, 155.56, 196.00),
    (103.83, 155.56, 207.65),
    (155.56, 196.00, 233.08),
    (116.54, 174.61, 233.08),
)
samples = array("h")
for index in range(RATE * DURATION):
    t = index / RATE
    bar = int(t / (4 * BEAT))
    notes = CHORDS[bar % len(CHORDS)]
    bed = sum(
        (sin(2 * pi * frequency * t + 0.7 * voice)
         + 0.12 * sin(2 * pi * frequency * 2 * t))
        for voice, frequency in enumerate(notes)
    ) * 0.042

    beat_phase = t % BEAT
    root = notes[0] / 2
    pluck = 0.077 * exp(-beat_phase * 5.5) * (
        sin(2 * pi * root * t) + 0.19 * sin(2 * pi * root * 2 * t)
    )
    tick = 0.0
    for cue in (3.20, 7.50, 12.00, 16.80):
        elapsed = t - cue
        if 0 <= elapsed < 0.19:
            tick += 0.065 * exp(-elapsed * 30) * (
                sin(2 * pi * 660 * elapsed) + 0.32 * sin(2 * pi * 990 * elapsed)
            )
    fade = min(1.0, t / 0.7, max(0.0, (DURATION - t) / 1.2))
    sample = tanh((bed + pluck + tick) * fade)
    samples.append(int(max(-1, min(1, sample)) * 32767))

with wave.open(str(OUT), "wb") as sound:
    sound.setnchannels(1)
    sound.setsampwidth(2)
    sound.setframerate(RATE)
    sound.writeframes(samples.tobytes())
print(OUT)
