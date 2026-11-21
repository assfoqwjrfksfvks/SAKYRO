"""Render the original SAKYRO demos with Python 3 and FFmpeg."""

from array import array
from dataclasses import dataclass
from math import cos, exp, pi, sin, sqrt, tanh, tau
from pathlib import Path
from random import Random
from subprocess import run
from sys import byteorder
from tempfile import TemporaryDirectory
from wave import open as open_wave


SAMPLE_RATE = 44_100
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "audio"


@dataclass(frozen=True)
class Song:
    name: str
    duration: int
    tempo: int
    chords: tuple[tuple[int, ...], ...]
    melody: tuple[int, ...]
    lead: str
    pattern: str


SONGS = (
    Song("night-signal", 30, 80, ((42, 57, 61, 64), (38, 57, 61, 66), (45, 59, 61, 64), (40, 56, 59, 66)),
         (73, 76, 78, 76, 73, 71, 69, 73), "bell", "air"),
    Song("warm-noise", 27, 92, ((43, 58, 62, 65), (39, 55, 58, 62), (46, 57, 60, 65), (41, 57, 60, 63)),
         (70, 69, 65, 67, 70, 74, 72, 69), "keys", "groove"),
    Song("water-lines", 33, 72, ((38, 57, 61, 66), (42, 57, 62, 64), (43, 59, 62, 66), (45, 57, 62, 64)),
         (76, 78, 81, 78, 74, 76, 73, 69), "bell", "tide"),
    Song("without-orbit", 26, 111, ((37, 56, 59, 64), (33, 56, 59, 61), (40, 56, 59, 66), (35, 54, 58, 64)),
         (68, 71, 73, 76, 71, 66, 68, 64), "pulse", "arpeggio"),
    Song("after-rain", 31, 76, ((39, 55, 58, 62), (36, 55, 58, 63), (44, 55, 60, 63), (46, 57, 60, 65)),
         (70, 74, 75, 79, 77, 75, 72, 70), "piano", "solo"),
    Song("city-sleeps", 29, 86, ((45, 57, 60, 64), (41, 57, 60, 64), (38, 55, 57, 65), (40, 56, 59, 64)),
         (72, 69, 67, 64, 67, 69, 65, 64), "keys", "downtempo"),
)


class StereoMix:
    def __init__(self, duration: int, seed: int):
        self.frames = duration * SAMPLE_RATE
        self.left = array("f", [0.0]) * self.frames
        self.right = array("f", [0.0]) * self.frames
        self.random = Random(seed)

    def tone(self, start, length, note, level, pan, voice):
        offset = round(start * SAMPLE_RATE)
        frames = min(round(length * SAMPLE_RATE), self.frames - offset)
        phase_step = tau * 440 * 2 ** ((note - 69) / 12) / SAMPLE_RATE
        left = level * sqrt((1 - pan) / 2)
        right = level * sqrt((1 + pan) / 2)

        for frame in range(frames):
            time = frame / SAMPLE_RATE
            phase = frame * phase_step

            if voice == "pad":
                attack = min(time / 0.78, 1, (length - time) / 0.9)
                envelope = sin(attack * pi / 2) ** 2
                value = sin(phase) + 0.37 * sin(phase * 1.003 + 0.4) + 0.11 * sin(phase * 2.005)
                value *= 0.9 + 0.1 * sin(tau * 0.48 * time + pan)
            elif voice == "bass":
                envelope = min(time / 0.04, 1, (length - time) / 0.19) * exp(-time * 0.52)
                value = sin(phase) + 0.14 * sin(phase * 2)
            else:
                envelope = min(time / 0.018, 1, (length - time) / 0.19)
                if voice == "bell":
                    value = sin(phase) * exp(-time * 1.65) + 0.25 * sin(phase * 2.01) * exp(-time * 3.4)
                    value += 0.12 * sin(phase * 3.98) * exp(-time * 5.4)
                elif voice == "keys":
                    value = sin(phase) * exp(-time * 1.9) + 0.3 * sin(phase * 2.003) * exp(-time * 3.7)
                    value += 0.10 * sin(phase * 3.01) * exp(-time * 5)
                elif voice == "piano":
                    value = (sin(phase) + sin(phase * 1.001 + 0.27)) * 0.52 * exp(-time * 1.45)
                    value += 0.32 * sin(phase * 2.003) * exp(-time * 2.8) + 0.17 * sin(phase * 3.009) * exp(-time * 6)
                else:
                    value = (sin(phase) + 0.26 * sin(phase * 2) + 0.09 * sin(phase * 3)) * exp(-time * 4.5)

            self.left[offset + frame] += left * value * envelope
            self.right[offset + frame] += right * value * envelope

    def percussion(self, start, level, kind, pan=0):
        offset = round(start * SAMPLE_RATE)
        frames = min(round(0.23 * SAMPLE_RATE), self.frames - offset)
        left = level * sqrt((1 - pan) / 2)
        right = level * sqrt((1 + pan) / 2)
        previous_noise = 0
        random = self.random

        for frame in range(frames):
            time = frame / SAMPLE_RATE
            fade = min(time / 0.004, 1, (0.23 - time) / 0.018)

            if kind == "kick":
                phase = tau * (43 * time + 3.1 * (1 - exp(-time * 33)))
                value = sin(phase) * exp(-time * 17)
            else:
                noise = random.uniform(-1, 1)
                if kind == "hat":
                    value = (noise - previous_noise) * exp(-time * 53) * 0.6
                else:
                    value = (0.6 * noise + 0.4 * previous_noise) * exp(-time * 24)
                    value += 0.27 * sin(tau * 132 * time) * exp(-time * 43)
                previous_noise = noise

            self.left[offset + frame] += left * value * fade
            self.right[offset + frame] += right * value * fade

    def save(self, path):
        peak = max(max(map(abs, self.left)), max(map(abs, self.right)))
        gain = 0.76 / peak
        samples = array("h", [0]) * (2 * self.frames)

        for frame, (left, right) in enumerate(zip(self.left, self.right)):
            fade_in = min(frame / (0.075 * SAMPLE_RATE), 1)
            fade_out = min((self.frames - frame - 1) / (1.6 * SAMPLE_RATE), 1)
            fade = (1 - cos(pi * min(fade_in, fade_out))) / 2
            samples[2 * frame] = round(tanh(left * gain) * fade * 32767)
            samples[2 * frame + 1] = round(tanh(right * gain) * fade * 32767)

        if byteorder != "little":
            samples.byteswap()

        with open_wave(str(path), "wb") as wave:
            wave.setparams((2, 2, SAMPLE_RATE, 0, "NONE", "not compressed"))
            wave.writeframes(samples.tobytes())


def arrange(song, seed):
    mix = StereoMix(song.duration, seed)
    beat = 60 / song.tempo
    bar = 4 * beat
    bar_count = int(song.duration / bar) + 1

    for index in range(bar_count):
        start = index * bar
        root, *chord = song.chords[index % len(song.chords)]

        if song.pattern == "solo":
            mix.tone(start, 2.9 * beat, root + 12, 0.24, -0.24, "piano")
            for beat_offset, note in zip((0.5, 1.25, 2.0, 3.0), (chord[0], chord[1], chord[2], chord[1])):
                mix.tone(start + beat_offset * beat, 2.0 * beat, note, 0.20, -0.16, "piano")
        else:
            for pan, note in zip((-0.58, 0.52, 0.06), chord):
                mix.tone(start, bar + 0.65, note, 0.09, pan, "pad")
            mix.tone(start, 2.7 * beat, root, 0.29, 0, "bass")

        if song.pattern in ("groove", "downtempo", "arpeggio"):
            mix.tone(start + 2.5 * beat, 1.4 * beat, root + 12, 0.15, 0, "bass")
            kicks = (0, 1.5, 2.75) if song.pattern == "groove" else (0, 2.5)
            for hit in kicks:
                mix.percussion(start + hit * beat, 0.45, "kick")
            for hit in (1, 3):
                mix.percussion(start + hit * beat, 0.24, "snare", -0.13)
            for hit in (0.5, 1.52, 2.5, 3.55):
                mix.percussion(start + hit * beat, 0.15, "hat", 0.33)

        if song.pattern == "arpeggio":
            lead_offsets = (0.25, 0.75, 1.25, 2, 2.75, 3.5)
        elif song.pattern in ("tide", "solo"):
            lead_offsets = (0.1, 1.2, 2.25, 3.3)
        else:
            lead_offsets = (0.25, 1.75, 3.25)

        for step, offset in enumerate(lead_offsets):
            note = song.melody[(index * 2 + step) % len(song.melody)]
            timestamp = start + offset * beat
            length = min(1.8, beat * 2.5)
            mix.tone(timestamp, length, note, 0.24 if step == 0 else 0.16, 0.14, song.lead)

            if song.pattern != "solo":
                mix.tone(timestamp + 0.75 * beat, length, note, 0.048, -0.73, song.lead)
                mix.tone(timestamp + 1.5 * beat, length, note, 0.018, 0.68, song.lead)

    return mix


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)

    with TemporaryDirectory(prefix="sakyro-audio-") as scratch:
        wav = Path(scratch) / "mix.wav"

        for index, song in enumerate(SONGS):
            arrange(song, seed=4200 + index).save(wav)
            run([
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
                "-c:a", "libmp3lame", "-b:a", "96k", "-map_metadata", "-1", str(OUTPUT / f"{song.name}.mp3"),
            ], check=True)
            print(f"{song.name}.mp3 ({song.duration} с)", flush=True)


if __name__ == "__main__":
    main()
