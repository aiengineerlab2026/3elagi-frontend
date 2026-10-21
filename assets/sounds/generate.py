"""Regenerates the call ring sounds. Run: python3 assets/sounds/generate.py

Synthesized rather than downloaded so the app ships nothing licence-encumbered.
Tweak the frequencies / cadence below to taste, or drop a replacement
ringback.wav / ringtone.wav / incoming_call.wav in this folder.
incoming_call.wav is copied into Android res/raw/ on prebuild for native ringing.
"""

import math
import os
import struct
import wave

SR = 16000
HERE = os.path.dirname(os.path.abspath(__file__))


def write(name, samples):
    with wave.open(os.path.join(HERE, name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(
            b"".join(
                struct.pack("<h", max(-32767, min(32767, int(s * 32767))))
                for s in samples
            )
        )


def tone(freqs, dur, amp=0.5, fade=0.02):
    """Summed sines with a short fade in/out so loops never click."""
    out = []
    for i in range(int(SR * dur)):
        t = i / SR
        v = sum(math.sin(2 * math.pi * f * t) for f in freqs) / len(freqs)
        env = min(1.0, t / fade, (dur - t) / fade)
        out.append(v * amp * max(0.0, env))
    return out


def silence(dur):
    return [0.0] * int(SR * dur)


# Outgoing ringback: the classic 440+480 Hz pair, 2s on / 3s off.
write("ringback.wav", tone([440, 480], 2.0) + silence(3.0))

# Incoming ringtone: a rising three-note chime (A5-C#6-E6), twice, then a rest.
motif = []
for f in (880.0, 1108.73, 1318.51):
    motif += tone([f, f * 2], 0.16, amp=0.42, fade=0.012) + silence(0.04)
write("ringtone.wav", motif + silence(0.25) + motif + silence(1.6))
write("incoming_call.wav", motif + silence(0.25) + motif + silence(1.6))

print("wrote ringback.wav + ringtone.wav + incoming_call.wav")
