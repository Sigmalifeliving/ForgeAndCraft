"""Local Audio Generation Hierarchy.

AudioGenerator
├── VoiceGenerator
│   └── KokoroVoiceGenerator
├── MusicGenerator
│   └── LocalMusicGenerator
├── SFXGenerator
│   └── LocalSFXGenerator
└── AmbienceGenerator
    └── LocalAmbienceGenerator
"""

from abc import ABC, abstractmethod
import hashlib
from pathlib import Path
import re
import numpy as np
import soundfile as sf

from ..config import settings
from .voice_service import is_voice_valid, _get_kokoro, _kokoro_lock, VOICE_PRESETS

SAMPLE_RATE = 24000


def _hash_seed(seed_text: str, salt: int = 0) -> int:
    h = hashlib.sha256(f"{seed_text}_{salt}".encode("utf-8")).hexdigest()
    return int(h[:8], 16)


class AudioGenerator(ABC):
    """Abstract base class for all audio generators."""

    @abstractmethod
    def generate(self, prompt: str, out_path: Path, **kwargs) -> tuple[int, float]:
        """Generate audio to out_path. Returns (byte_size, duration_seconds)."""
        pass


class KokoroVoiceGenerator(AudioGenerator):
    """Local Kokoro TTS voice generator."""

    def __init__(self):
        self.sample_rate = settings.KOKORO_SAMPLE_RATE

    def generate(
        self,
        prompt: str,
        out_path: Path,
        voice: str = "am_michael",
        speed: float = 1.0,
        pitch: str = "",
        **kwargs,
    ) -> tuple[int, float]:
        text = prompt.strip()
        if not text:
            raise ValueError("Voice prompt/text cannot be empty.")
        if not is_voice_valid(voice):
            voice = "am_michael"

        kokoro = _get_kokoro()
        with _kokoro_lock:
            samples, sample_rate = kokoro.create(text, voice=voice, speed=max(0.5, min(2.0, speed)))

        out_path.parent.mkdir(parents=True, exist_ok=True)
        data = np.asarray(samples)
        if data.dtype.kind == "f":
            data = (data * 32767).astype("int16")

        # Optional pitch / EQ post-processing
        if pitch == "low" or "deep" in str(pitch).lower():
            data = self._apply_low_shelf(data)

        sf.write(str(out_path), data, sample_rate)
        duration = float(len(data)) / sample_rate
        return out_path.stat().st_size, duration

    def _apply_low_shelf(self, data: np.ndarray) -> np.ndarray:
        alpha = 0.35
        filtered = np.zeros_like(data, dtype=np.float32)
        filtered[0] = data[0]
        for i in range(1, len(data)):
            filtered[i] = alpha * data[i] + (1 - alpha) * filtered[i - 1]
        boosted = 0.6 * data.astype(np.float32) + 0.4 * filtered
        return np.clip(boosted, -32768, 32767).astype(np.int16)


class LocalMusicGenerator(AudioGenerator):
    """Procedural multi-part music generator (Rhythm, Bass, Harmonies, Melody)."""

    def generate(
        self,
        prompt: str,
        out_path: Path,
        duration: float = 12.0,
        tempo: int = 120,
        genre: str = "",
        mood: str = "",
        variation_salt: int = 0,
        **kwargs,
    ) -> tuple[int, float]:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        seed = _hash_seed(prompt, variation_salt)
        rng = np.random.default_rng(seed)

        bpm_match = re.search(r"(\d{2,3})\s*bpm", prompt, re.IGNORECASE)
        if bpm_match:
            tempo = int(bpm_match.group(1))
        tempo = max(60, min(180, tempo))

        p_lower = (prompt + " " + genre + " " + mood).lower()

        if any(w in p_lower for w in ("horror", "dark", "eerie", "haunting", "abandoned", "zombie", "tense")):
            mode = "diminished"
            root_freq = 65.41  # C2
            intervals = [0, 3, 6, 7, 10, 12, 15, 18]
        elif any(w in p_lower for w in ("cyber", "racing", "speed", "synth", "future", "techno")):
            mode = "synthwave"
            root_freq = 73.42  # D2
            intervals = [0, 2, 3, 7, 10, 12, 14, 15, 19]
        elif any(w in p_lower for w in ("surf", "tropical", "beach", "sunny", "cheerful", "happy")):
            mode = "major"
            root_freq = 82.41  # E2
            intervals = [0, 2, 4, 7, 9, 12, 14, 16]
        elif any(w in p_lower for w in ("medieval", "fantasy", "magic", "tavern", "rpg", "forest")):
            mode = "medieval"
            root_freq = 73.42  # D2
            intervals = [0, 2, 3, 5, 7, 9, 10, 12, 14]
        else:
            mode = "cinematic"
            root_freq = 65.41
            intervals = [0, 2, 3, 7, 8, 12, 14, 15]

        scale_freqs = [root_freq * (2 ** (semi / 12.0)) for semi in intervals]

        duration = max(6.0, min(30.0, float(duration)))
        n_samples = int(duration * SAMPLE_RATE)
        t = np.arange(n_samples) / SAMPLE_RATE

        beat_sec = 60.0 / tempo
        sixteenth = beat_sec / 4.0
        total_steps = int(duration / sixteenth)

        track = np.zeros(n_samples, dtype=np.float32)

        # Dedicated horror gametrack composition
        if mode == "diminished":
            # 1. Sinister sub-bass drone with eerie slow pulsation
            sub_drone_f = 43.65  # F1
            drone_lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.18 * t)
            sub_drone = (
                0.7 * np.sin(2 * np.pi * sub_drone_f * t)
                + 0.3 * np.sin(2 * np.pi * (sub_drone_f * 1.5) * t)
                + 0.2 * np.tanh(np.sin(2 * np.pi * sub_drone_f * 2.0 * t) * 2.0)
            ) * drone_lfo
            track += sub_drone * 0.45

            # 2. Ominous Heartbeat / Doom Kick (thump-thump pattern)
            heart_bpm = 54
            heart_beat_sec = 60.0 / heart_bpm
            total_beats = int(duration / heart_beat_sec)
            for hb in range(total_beats):
                t0 = int(hb * heart_beat_sec * SAMPLE_RATE)
                len1 = min(int(0.22 * SAMPLE_RATE), n_samples - t0)
                if len1 > 0:
                    kt1 = np.arange(len1) / SAMPLE_RATE
                    k_f1 = 75.0 * np.exp(-kt1 * 18.0) + 38.0
                    kick1 = np.sin(2 * np.pi * k_f1 * kt1) * np.exp(-kt1 * 9.0)
                    track[t0 : t0 + len1] += kick1 * 0.5
                t1 = t0 + int(0.28 * SAMPLE_RATE)
                if t1 < n_samples:
                    len2 = min(int(0.2 * SAMPLE_RATE), n_samples - t1)
                    if len2 > 0:
                        kt2 = np.arange(len2) / SAMPLE_RATE
                        k_f2 = 65.0 * np.exp(-kt2 * 20.0) + 36.0
                        kick2 = np.sin(2 * np.pi * k_f2 * kt2) * np.exp(-kt2 * 11.0)
                        track[t1 : t1 + len2] += kick2 * 0.35

            # 3. Creepy Detuned Music Box / Diminished Arpeggio
            dim_freqs = [261.63 * (2 ** (s / 12.0)) for s in [0, 3, 6, 9, 12, 15, 18]]
            step_time = 0.42
            num_steps = int(duration / step_time)
            for s in range(num_steps):
                if rng.random() > 0.3:
                    note_idx = (s * 3 + (seed % 5)) % len(dim_freqs)
                    nf = dim_freqs[note_idx]
                    start = int(s * step_time * SAMPLE_RATE)
                    box_len = min(int(0.85 * SAMPLE_RATE), n_samples - start)
                    if box_len > 0:
                        bt = np.arange(box_len) / SAMPLE_RATE
                        m_box = (
                            0.7 * np.sin(2 * np.pi * nf * bt)
                            + 0.3 * np.sin(2 * np.pi * (nf * 3.01) * bt)
                            + 0.15 * np.sin(2 * np.pi * (nf * 5.04) * bt)
                        ) * np.exp(-bt * 5.0)
                        track[start : start + box_len] += m_box * 0.32

            # 4. Eerie Bowed Metal / Tension String Cluster
            tension_cluster = [520.0, 552.0, 735.0]
            for tf in tension_cluster:
                detune = rng.uniform(0.994, 1.006)
                tremolo = 0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(3.0, 6.0) * t)
                tension = np.sin(2 * np.pi * tf * detune * t + 0.3 * np.sin(2 * np.pi * 0.4 * t)) * tremolo
                envelope = np.sin(np.pi * (t / duration)) ** 1.2
                track += (tension * envelope) * 0.12
        else:
            # 1. Bassline
            bass_step = beat_sec * 0.5
            bass_count = int(duration / bass_step)
            for b in range(bass_count):
                start = int(b * bass_step * SAMPLE_RATE)
                note_dur = min(int(bass_step * 0.9 * SAMPLE_RATE), n_samples - start)
                if note_dur <= 0:
                    break
                b_t = np.arange(note_dur) / SAMPLE_RATE
                note_f = scale_freqs[b % len(scale_freqs[:3])]
                bass_wave = (
                    0.7 * np.sin(2 * np.pi * note_f * b_t)
                    + 0.3 * np.sin(2 * np.pi * (note_f * 2) * b_t)
                ) * np.exp(-b_t * 3.5)
                track[start : start + note_dur] += bass_wave * 0.45

            # 2. Percussion / Beat
            for beat_idx in range(int(duration / beat_sec)):
                b_start = int(beat_idx * beat_sec * SAMPLE_RATE)
                kick_len = min(int(0.2 * SAMPLE_RATE), n_samples - b_start)
                if kick_len > 0:
                    k_t = np.arange(kick_len) / SAMPLE_RATE
                    kick_freq = 150.0 * np.exp(-k_t * 24.0) + 45.0
                    kick = np.sin(2 * np.pi * kick_freq * k_t) * np.exp(-k_t * 12.0)
                    track[b_start : b_start + kick_len] += kick * 0.55

                if beat_idx % 2 == 1:
                    snare_len = min(int(0.18 * SAMPLE_RATE), n_samples - b_start)
                    if snare_len > 0:
                        s_t = np.arange(snare_len) / SAMPLE_RATE
                        noise = rng.standard_normal(snare_len) * np.exp(-s_t * 18.0)
                        snare_tone = np.sin(2 * np.pi * 210.0 * s_t) * np.exp(-s_t * 22.0)
                        track[b_start : b_start + snare_len] += (noise * 0.4 + snare_tone * 0.25)

            # 3. Arpeggiated / Melodic Lead
            for s in range(total_steps):
                if rng.random() > 0.45:
                    start = int(s * sixteenth * SAMPLE_RATE)
                    lead_dur = min(int(sixteenth * 1.5 * SAMPLE_RATE), n_samples - start)
                    if lead_dur <= 0:
                        break
                    l_t = np.arange(lead_dur) / SAMPLE_RATE
                    f = rng.choice(scale_freqs[2:]) * (2 if mode == "synthwave" else 1)
                    lead = (
                        0.6 * np.sin(2 * np.pi * f * l_t)
                        + 0.3 * np.sin(2 * np.pi * (f * 1.5) * l_t)
                        + 0.1 * np.sin(2 * np.pi * (f * 2.0) * l_t)
                    ) * np.exp(-l_t * 6.0)
                    track[start : start + lead_dur] += lead * 0.35

            # 4. Atmospheric Pad Layer
            pad_freqs = [scale_freqs[0] * 2, scale_freqs[2] * 2, scale_freqs[4] * 2]
            pad = np.zeros(n_samples, dtype=np.float32)
            for pf in pad_freqs:
                detune = rng.uniform(0.995, 1.005)
                pad += np.sin(2 * np.pi * pf * detune * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.2 * t))
            track += pad * 0.12

        # Normalize and crossfade head and tail
        max_val = np.max(np.abs(track)) + 1e-6
        track = (track / max_val) * 0.88

        fade_samples = min(int(0.3 * SAMPLE_RATE), n_samples // 4)
        if fade_samples > 0:
            track[:fade_samples] *= np.linspace(0.0, 1.0, fade_samples)
            track[-fade_samples:] *= np.linspace(1.0, 0.0, fade_samples)

        sf.write(str(out_path), track.astype(np.float32), SAMPLE_RATE)
        return out_path.stat().st_size, duration


class LocalSFXGenerator(AudioGenerator):
    """Procedural game sound effects generator."""

    def generate(
        self,
        prompt: str,
        out_path: Path,
        category: str = "sfx",
        duration: float = 1.5,
        variation_salt: int = 0,
        **kwargs,
    ) -> tuple[int, float]:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        seed = _hash_seed(prompt, variation_salt)
        rng = np.random.default_rng(seed)

        p = prompt.lower()
        duration = max(0.4, min(5.0, float(duration)))
        n_samples = int(duration * SAMPLE_RATE)
        t = np.arange(n_samples) / SAMPLE_RATE

        # 1. RESONANT BELL / CHIME / GONG
        if any(w in p for w in ("bell", "chime", "gong", "toll", "ding", "dong", "temple", "church bell")):
            f0 = 440.0 + (seed % 180)
            partials = [
                (0.5, 0.35, 1.2),    # Hum tone (lingers longest)
                (1.0, 0.50, 1.8),    # Prime
                (1.19, 0.30, 2.2),   # Minor 3rd / Tierce
                (1.51, 0.25, 2.5),   # Quint
                (2.0, 0.40, 3.2),    # Nominal / Strike
                (2.76, 0.20, 4.5),   # Superquint
                (4.07, 0.15, 6.0),   # Octave Nominal
                (5.42, 0.10, 8.0),   # High chime
                (8.18, 0.08, 12.0),  # Bright shimmer
            ]
            audio = np.zeros(n_samples, dtype=np.float32)
            # Strike transient: hammer tap
            tap_len = min(int(0.04 * SAMPLE_RATE), n_samples)
            tap_t = np.arange(tap_len) / SAMPLE_RATE
            tap_noise = rng.standard_normal(tap_len) * np.exp(-tap_t * 90.0) * 0.4
            audio[:tap_len] += tap_noise

            for mult, amp, decay_rate in partials:
                freq = f0 * mult
                # Dual-mode detuning beat for metallic shimmer
                detune = 1.002
                tone = (
                    0.55 * np.sin(2 * np.pi * freq * t)
                    + 0.45 * np.sin(2 * np.pi * (freq * detune) * t)
                ) * np.exp(-t * (decay_rate / (duration * 0.7)))
                audio += (tone * amp).astype(np.float32)

        # 2. BREAKING GLASS / SHATTERING WINDOW
        elif any(w in p for w in ("glass", "shatter", "window break", "shard", "crystal break")):
            audio = np.zeros(n_samples, dtype=np.float32)

            # A. Initial Sharp Fracture Snap (high-passed noise burst)
            snap_len = min(int(0.06 * SAMPLE_RATE), n_samples)
            st = np.arange(snap_len) / SAMPLE_RATE
            snap_noise = (rng.standard_normal(snap_len) - 0.5 * np.roll(rng.standard_normal(snap_len), 1))
            snap_transient = snap_noise * np.exp(-st * 70.0) * 0.85
            audio[:snap_len] += snap_transient

            # B. Crystalline Resonant Ringing Modes
            glass_modes = [2800.0, 3600.0, 4900.0, 6400.0, 8200.0, 10500.0]
            for gm in glass_modes:
                det = rng.uniform(0.97, 1.03)
                decay = rng.uniform(14.0, 28.0)
                ring = np.sin(2 * np.pi * gm * det * t) * np.exp(-t * decay)
                audio += (ring * 0.16).astype(np.float32)

            # C. Cascading Shards Scattering & Tumbling on Hard Surface (micro-impacts)
            num_shards = 20
            for i in range(num_shards):
                shard_start_sec = rng.uniform(0.08, min(duration * 0.85, 1.4))
                start_idx = int(shard_start_sec * SAMPLE_RATE)
                shard_dur = rng.uniform(0.015, 0.055)
                shard_len = min(int(shard_dur * SAMPLE_RATE), n_samples - start_idx)
                if shard_len > 0:
                    sht = np.arange(shard_len) / SAMPLE_RATE
                    shard_f = rng.uniform(3200.0, 9500.0)
                    shard_click = (
                        np.sin(2 * np.pi * shard_f * sht) * 0.6
                        + rng.standard_normal(shard_len) * 0.4
                    ) * np.exp(-sht * 110.0)
                    shard_amp = rng.uniform(0.18, 0.45) * np.exp(-shard_start_sec * 1.8)
                    audio[start_idx : start_idx + shard_len] += (shard_click * shard_amp).astype(np.float32)

        # 3. GUNSHOT / FIREARM
        elif any(w in p for w in ("gunshot", "gun", "shot", "rifle", "pistol", "bullet", "cannon")):
            audio = np.zeros(n_samples, dtype=np.float32)
            crack_len = min(int(0.08 * SAMPLE_RATE), n_samples)
            ct = np.arange(crack_len) / SAMPLE_RATE
            crack = rng.standard_normal(crack_len) * np.exp(-ct * 60.0)
            audio[:crack_len] += crack * 0.7
            sub = np.sin(2 * np.pi * (140.0 * np.exp(-t * 22.0) + 40.0) * t) * np.exp(-t * 12.0)
            tail = rng.standard_normal(n_samples) * np.exp(-t * 4.5)
            audio += (sub * 0.6 + tail * 0.25).astype(np.float32)

        # 4. THUNDER / LIGHTNING
        elif any(w in p for w in ("thunder", "lightning", "storm strike")):
            crack_len = min(int(0.12 * SAMPLE_RATE), n_samples)
            ct = np.arange(crack_len) / SAMPLE_RATE
            crack = rng.standard_normal(crack_len) * np.exp(-ct * 30.0)
            audio = np.zeros(n_samples, dtype=np.float32)
            audio[:crack_len] += crack * 0.8
            white = rng.standard_normal(n_samples)
            brown = np.cumsum(white)
            brown = brown / (np.max(np.abs(brown)) + 1e-6)
            rumble_env = np.maximum(0.0, np.sin(np.pi * (t / duration))) ** 0.8
            rumble_sub = np.sin(2 * np.pi * (55.0 + 15.0 * np.sin(2 * np.pi * 1.2 * t)) * t) * rumble_env
            audio += (brown * rumble_env * 0.5 + rumble_sub * 0.4).astype(np.float32)

        # 5. MAGIC SPELL / SPARKLE
        elif any(w in p for w in ("magic", "spell", "sparkle", "fairy", "enchant", "wand")):
            audio = np.zeros(n_samples, dtype=np.float32)
            magic_notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0]
            for idx, mf in enumerate(magic_notes):
                m_start = int(idx * 0.08 * SAMPLE_RATE)
                m_len = min(int(0.6 * SAMPLE_RATE), n_samples - m_start)
                if m_len > 0:
                    mt = np.arange(m_len) / SAMPLE_RATE
                    spark = (
                        np.sin(2 * np.pi * mf * mt) * 0.7
                        + np.sin(2 * np.pi * (mf * 2.0) * mt) * 0.3
                    ) * np.exp(-mt * 7.0)
                    audio[m_start : m_start + m_len] += (spark * 0.35).astype(np.float32)
            sweep_noise = rng.standard_normal(n_samples) * np.exp(-t * 2.5) * 0.12
            audio += sweep_noise.astype(np.float32)

        elif any(w in p for w in ("door", "creak", "wood", "scrape", "groan")):
            f0 = 180.0 + (seed % 90)
            mod = 40.0 * np.sin(2 * np.pi * 3.5 * t)
            phase = 2 * np.pi * np.cumsum(f0 + mod) / SAMPLE_RATE
            sound = np.sin(phase) + 0.5 * np.sin(2 * phase) + 0.25 * np.sin(3 * phase)
            jitter = rng.standard_normal(n_samples) * 0.15
            envelope = np.sin(np.pi * (t / duration)) ** 1.8
            audio = (sound + jitter) * envelope

        elif any(w in p for w in ("wave", "water", "splash", "ocean", "surf", "spray")):
            noise = rng.standard_normal(n_samples)
            surge = np.exp(-((t - 0.25) ** 2) * 20.0) + 0.3 * np.exp(-t * 2.0)
            bubbles = np.zeros(n_samples)
            for _ in range(8):
                b_start = int(rng.uniform(0.05, duration * 0.8) * SAMPLE_RATE)
                b_len = min(int(0.08 * SAMPLE_RATE), n_samples - b_start)
                if b_len > 0:
                    bt = np.arange(b_len) / SAMPLE_RATE
                    bf = rng.uniform(400.0, 1800.0)
                    bubbles[b_start : b_start + b_len] += np.sin(2 * np.pi * bf * bt) * np.exp(-bt * 40.0)
            audio = (noise * surge * 0.6) + (bubbles * 0.4)

        elif any(w in p for w in ("laser", "blast", "pew", "beam", "pulse", "sci-fi")):
            f_start = 2200.0 + (seed % 1000)
            f_end = 120.0
            sweep = f_start * np.exp(-t * 14.0) + f_end
            phase = 2 * np.pi * np.cumsum(sweep) / SAMPLE_RATE
            audio = (np.sin(phase) + 0.3 * np.sin(3 * phase)) * np.exp(-t * 8.0)

        elif any(w in p for w in ("hit", "impact", "punch", "strike", "smash", "sword", "clash")):
            punch = np.sin(2 * np.pi * (180.0 * np.exp(-t * 30.0) + 50.0) * t) * np.exp(-t * 15.0)
            metal_f = 950.0 + (seed % 400)
            ring = np.sin(2 * np.pi * metal_f * t) * np.exp(-t * 6.0)
            crunch = rng.standard_normal(n_samples) * np.exp(-t * 25.0)
            audio = punch * 0.5 + ring * 0.3 + crunch * 0.4

        elif any(w in p for w in ("explosion", "bomb", "boom", "blast", "shatter")):
            white = rng.standard_normal(n_samples)
            brown = np.cumsum(white)
            brown = brown / (np.max(np.abs(brown)) + 1e-6)
            boom = np.sin(2 * np.pi * 55.0 * t) * np.exp(-t * 3.0)
            audio = boom * 0.5 + brown * np.exp(-t * 1.8) * 0.7

        elif any(w in p for w in ("ui", "click", "button", "beep", "menu", "select")):
            f1 = 880.0 + (seed % 200)
            f2 = f1 * 1.5
            short_samples = min(int(0.12 * SAMPLE_RATE), n_samples)
            st = np.arange(short_samples) / SAMPLE_RATE
            chirp = (np.sin(2 * np.pi * f1 * st) + np.sin(2 * np.pi * f2 * st)) * np.exp(-st * 35.0)
            audio = np.zeros(n_samples)
            audio[:short_samples] = chirp

        elif any(w in p for w in ("coin", "pickup", "collect", "gem", "chime", "powerup")):
            audio = np.zeros(n_samples)
            chord = [659.25, 830.61, 987.77, 1318.51]
            note_len = int(0.1 * SAMPLE_RATE)
            for idx, freq in enumerate(chord):
                start = idx * int(0.06 * SAMPLE_RATE)
                end = min(start + note_len, n_samples)
                if start < n_samples:
                    nt = np.arange(end - start) / SAMPLE_RATE
                    audio[start:end] += np.sin(2 * np.pi * freq * nt) * np.exp(-nt * 18.0)

        elif any(w in p for w in ("footstep", "step", "walk", "run")):
            thud = np.sin(2 * np.pi * 80.0 * t) * np.exp(-t * 30.0)
            crunch = rng.standard_normal(n_samples) * np.exp(-t * 22.0)
            audio = thud * 0.6 + crunch * 0.4

        elif any(w in p for w in ("roar", "growl", "zombie", "monster", "beast")):
            f0 = 75.0 + (seed % 30)
            growl_mod = 15.0 * np.sin(2 * np.pi * 45.0 * t)
            phase = 2 * np.pi * np.cumsum(f0 + growl_mod) / SAMPLE_RATE
            distorted = np.tanh(np.sin(phase) * 3.0)
            shiver = rng.standard_normal(n_samples) * 0.2
            envelope = np.sin(np.pi * (t / duration)) ** 1.5
            audio = (distorted + shiver) * envelope

        else:
            f_start = 200.0 + (seed % 400)
            f_end = 1200.0 + ((seed >> 4) % 1500)
            sweep = np.sin(2 * np.pi * (f_start + (f_end - f_start) * (t / duration)) * t)
            noise = rng.standard_normal(n_samples) * 0.3
            audio = (sweep + noise) * np.exp(-t * 3.0)

        max_val = np.max(np.abs(audio)) + 1e-6
        audio = (audio / max_val) * 0.9

        fade_len = min(int(0.05 * SAMPLE_RATE), n_samples)
        audio[-fade_len:] *= np.linspace(1.0, 0.0, fade_len)

        sf.write(str(out_path), audio.astype(np.float32), SAMPLE_RATE)
        return out_path.stat().st_size, duration


class LocalAmbienceGenerator(AudioGenerator):
    """Procedural atmospheric ambient soundscape generator."""

    def generate(
        self,
        prompt: str,
        out_path: Path,
        duration: float = 14.0,
        variation_salt: int = 0,
        **kwargs,
    ) -> tuple[int, float]:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        seed = _hash_seed(prompt, variation_salt)
        rng = np.random.default_rng(seed)

        p = prompt.lower()
        duration = max(8.0, min(30.0, float(duration)))
        n_samples = int(duration * SAMPLE_RATE)
        t = np.arange(n_samples) / SAMPLE_RATE

        white = rng.standard_normal(n_samples)
        brown = np.cumsum(white)
        brown = brown / (np.max(np.abs(brown)) + 1e-6)

        if any(w in p for w in ("horror", "hospital", "haunted", "abandoned", "dark", "dungeon")):
            drone_f = 48.0 + (seed % 10)
            drone = np.sin(2 * np.pi * drone_f * t) + 0.3 * np.sin(2 * np.pi * (drone_f * 1.5) * t)
            metallic = 0.15 * np.sin(2 * np.pi * (340.0 + 8.0 * np.sin(2 * np.pi * 0.1 * t)) * t)
            subtle_wind = brown * (0.3 + 0.25 * np.sin(2 * np.pi * 0.08 * t))
            soundscape = drone * 0.45 + metallic + subtle_wind * 0.35

        elif any(w in p for w in ("ocean", "beach", "surf", "sea", "coastal", "island", "waves")):
            wave_period = 4.5
            swell = np.maximum(0.0, np.sin(2 * np.pi * (t / wave_period))) ** 2.0
            foam = rng.standard_normal(n_samples) * swell * 0.4
            deep_sea = brown * (0.4 + 0.3 * swell)
            soundscape = foam + deep_sea

        elif any(w in p for w in ("space", "station", "cockpit", "sci-fi", "ship")):
            hum = np.sin(2 * np.pi * 60.0 * t) + 0.2 * np.sin(2 * np.pi * 120.0 * t)
            hiss = rng.standard_normal(n_samples) * 0.1
            pulse = 0.1 * np.sin(2 * np.pi * 0.5 * t) * np.sin(2 * np.pi * 880.0 * t)
            soundscape = hum * 0.5 + hiss + pulse

        elif any(w in p for w in ("forest", "nature", "jungle", "wind", "trees")):
            wind_lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.15 * t)
            soundscape = brown * wind_lfo * 0.6 + white * 0.08

        else:
            soundscape = brown * 0.5 + 0.2 * np.sin(2 * np.pi * 110.0 * t)

        max_val = np.max(np.abs(soundscape)) + 1e-6
        soundscape = (soundscape / max_val) * 0.85

        fade_samples = min(int(1.0 * SAMPLE_RATE), n_samples // 4)
        if fade_samples > 0:
            fade_in = np.linspace(0.0, 1.0, fade_samples)
            fade_out = np.linspace(1.0, 0.0, fade_samples)
            soundscape[:fade_samples] *= fade_in
            soundscape[-fade_samples:] *= fade_out

        sf.write(str(out_path), soundscape.astype(np.float32), SAMPLE_RATE)
        return out_path.stat().st_size, duration


# Singletons
voice_generator = KokoroVoiceGenerator()
music_generator = LocalMusicGenerator()
sfx_generator = LocalSFXGenerator()
ambience_generator = LocalAmbienceGenerator()
