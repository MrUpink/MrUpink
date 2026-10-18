"""Musik latar "Ceria" — komposisi asli Pintar Ceria, disintesis langsung dengan numpy.

Tidak memakai sampel, loop, atau melodi pihak ketiga, sehingga bebas dipakai komersial.
Jalankan:  python tools/music/compose.py  (butuh numpy + ffmpeg dengan libvorbis)
Hasil:     app/src/main/assets/www/audio/music/ceria.ogg  (loop mulus)
"""
import os
import subprocess
import tempfile
import wave

import numpy as np

SR = 44100
BPM = 108
EIGHTH = 60 / BPM / 2
BAR = EIGHTH * 8
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "app", "src", "main", "assets", "www", "audio", "music", "ceria.ogg")

NAMES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(n):
    return 12 * (int(n[-1]) + 1) + NAMES[n[0]] + (1 if "#" in n else 0)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


CHORDS = ["C", "Am", "F", "G", "C", "Am", "F", "G", "F", "G", "Em", "Am", "F", "G", "C", "G7"]
CHORD_NOTES = {
    "C": ["C4", "E4", "G4"], "Am": ["A3", "C4", "E4"], "F": ["F3", "A3", "C4"],
    "G": ["G3", "B3", "D4"], "Em": ["E3", "G3", "B3"], "G7": ["G3", "B3", "F4"],
}
BASS = {"C": "C2", "Am": "A1", "F": "F1", "G": "G1", "Em": "E2", "G7": "G1"}

MELODY = """
E5 . G5 . C6 - G5 E5 | A5 - G5 E5 C5 - . . | F5 . A5 . C6 - A5 F5 | G5 - F5 D5 B4 - . .
E5 . G5 . C6 - D6 E6 | C6 - A5 - E5 - A5 C6 | D6 - C6 A5 F5 - A5 C6 | B5 - - - G5 - . .
A5 . A5 C6 F5 . A5 C6 | B5 . B5 D6 G5 . B5 D6 | E6 - D6 B5 G5 - E5 G5 | A5 - - - C6 - . .
C6 . A5 . F5 . A5 C6 | D6 . B5 . G5 . B5 D6 | E6 - D6 - C6 - G5 E5 | F5 - D5 - B4 - . .
"""

LENGTH = len(CHORDS) * BAR
N = int(LENGTH * SR)
TAIL = int(3 * SR)


def env(n, attack, tau):
    t = np.arange(n) / SR
    e = np.exp(-t / tau)
    a = max(1, int(attack * SR))
    e[:a] *= np.linspace(0, 1, a)
    return e


def place(buf, start, sig):
    i = int(start * SR)
    buf[i:i + len(sig)] += sig[: max(0, len(buf) - i)]


def bell(f, dur):
    n = int((dur + 0.6) * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * env(n, 0.002, 0.15) \
        + 0.08 * np.sin(2 * np.pi * 4.01 * f * t) * env(n, 0.001, 0.05)
    e = env(n, 0.004, 0.45)
    gate = np.ones(n)
    k = int(dur * SR)
    gate[k:] = np.exp(-np.arange(n - k) / SR / 0.12)
    return s * e * gate


def pluck(f, dur):
    n = int((dur + 0.3) * SR)
    t = np.arange(n) / SR
    tri = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * t))
    return (0.6 * tri + 0.4 * np.sin(2 * np.pi * 2 * f * t) * env(n, 0.001, 0.06)) * env(n, 0.003, 0.18)


def bass(f, dur):
    n = int((dur + 0.15) * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    e = env(n, 0.01, 0.6)
    k = int(dur * SR)
    e[k:] *= np.exp(-np.arange(n - k) / SR / 0.04)
    return s * e


def pad(freqs, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * d * t + d) for f in freqs for d in (0.997, 1.0, 1.003))
    a = int(0.35 * SR)
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    e[-a:] = np.linspace(1, 0, a)
    return s * e / 9


rng = np.random.default_rng(3)


def kick():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    f = 50 + 90 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.08)


def noise_hit(tau, n_sec, smooth):
    n = int(n_sec * SR)
    x = rng.standard_normal(n)
    x = x - np.convolve(x, np.ones(smooth) / smooth, mode="same")  # buang frekuensi rendah
    return x * env(n, 0.001, tau)


def reverb(x, secs=1.6, mix=0.22):
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / (secs / 5))
    ir = np.convolve(ir, np.ones(8) / 8, mode="same")
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x + mix * wet


def render():
    total = N + TAIL
    lead, arp, low, drums, pads = (np.zeros(total) for _ in range(5))

    tokens = [b.split() for b in MELODY.replace("\n", "|").split("|") if b.strip()]
    assert len(tokens) == len(CHORDS) and all(len(b) == 8 for b in tokens)
    for bar, slots in enumerate(tokens):
        for i, tok in enumerate(slots):
            if tok in "-.":
                continue
            j = i + 1
            while j < len(slots) and slots[j] == "-":
                j += 1
            place(lead, bar * BAR + i * EIGHTH, bell(hz(midi(tok)), (j - i) * EIGHTH))

    for bar, ch in enumerate(CHORDS):
        notes = CHORD_NOTES[ch]
        t0 = bar * BAR
        place(pads, t0, pad([hz(midi(x)) for x in notes], BAR + 0.3))
        order = [0, 1, 2, 1, 0, 1, 2, 1]
        for i, k in enumerate(order):
            m = midi(notes[k]) + (12 if i in (2, 6) else 0)
            place(arp, t0 + i * EIGHTH, pluck(hz(m), EIGHTH))
        r = midi(BASS[ch])
        for beat, m in ((0, r), (3, r + 7), (4, r + 12), (6, r + 7)):
            place(low, t0 + beat * EIGHTH, bass(hz(m), EIGHTH * (2 if beat != 3 else 1) * 0.9))
        for beat in range(4):
            if beat in (0, 2):
                place(drums, t0 + beat * 2 * EIGHTH, 0.9 * kick())
            else:
                place(drums, t0 + beat * 2 * EIGHTH, 0.22 * noise_hit(0.07, 0.25, 12))
        for i in range(8):
            place(drums, t0 + i * EIGHTH, (0.07 if i % 2 else 0.04) * noise_hit(0.025, 0.08, 3))

    mix = reverb(0.30 * lead) + 0.16 * reverb(arp, mix=0.3) + 0.30 * low + 0.18 * pads + 0.5 * drums
    # Bungkus ekor ke awal supaya loop mulus.
    out = mix[:N].copy()
    out[:TAIL] += mix[N:]
    out = np.tanh(out / np.max(np.abs(out)) * 1.2) / np.tanh(1.2) * 0.89
    return out


def main():
    out = render()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "ceria.wav")
        with wave.open(wav, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((out * 32767).astype("<i2").tobytes())
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis", "-q:a", "3", OUT], check=True)
    print(OUT, f"{LENGTH:.1f} detik", os.path.getsize(OUT) // 1024, "KB")


if __name__ == "__main__":
    main()
