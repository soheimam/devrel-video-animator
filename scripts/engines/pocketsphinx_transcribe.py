#!/usr/bin/env python3
"""Transcribes 16 kHz mono 16-bit PCM with PocketSphinx and prints word timings as JSON.

PocketSphinx ships its English model inside the PyPI package (`pip install pocketsphinx`),
so it works where model hosts are unreachable. It is far less accurate than Whisper; use
it as a fallback only. Called by scripts/transcribe.mjs (--engine pocketsphinx).

Usage: pocketsphinx_transcribe.py audio.raw
Output: {"utterances": [{"start": s, "end": s, "words": [{"word", "start", "end"}]}]}
"""
import json
import sys

from pocketsphinx import Decoder, Segmenter

FRAME_RATE = 100  # PocketSphinx's default frames per second
SKIP = {"<s>", "</s>", "<sil>", "[NOISE]", "[SPEECH]", "[BREATH]", "[COUGH]", "[UH]", "[UM]"}


def main(path):
    decoder = Decoder(samprate=16000)
    segmenter = Segmenter(sample_rate=16000)
    utterances = []
    with open(path, "rb") as stream:
        for speech in segmenter.segment(stream):
            decoder.start_utt()
            decoder.process_raw(speech.pcm, full_utt=True)
            decoder.end_utt()
            words = []
            for seg in decoder.seg():
                word = seg.word.split("(")[0]  # "the(2)" marks an alternate pronunciation
                if word in SKIP or word.startswith("["):
                    continue
                words.append({
                    "word": word,
                    "start": round(speech.start_time + seg.start_frame / FRAME_RATE, 2),
                    "end": round(speech.start_time + (seg.end_frame + 1) / FRAME_RATE, 2),
                })
            if words:
                utterances.append({"start": speech.start_time, "end": speech.end_time, "words": words})
    json.dump({"utterances": utterances}, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1])
