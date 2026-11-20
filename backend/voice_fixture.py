"""Synthetic tone fixtures only, never a person's recorded voice."""
import io
import math
import struct
import subprocess
import wave


def tone_wav() -> bytes:
    stream = io.BytesIO()
    with wave.open(stream, 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(b''.join(struct.pack('<h', int(3000 * math.sin(2 * math.pi * 440 * n / 16000))) for n in range(8000)))
    return stream.getvalue()


def tone_file(extension: str) -> bytes:
    data = tone_wav()
    if extension == 'wav':
        return data
    codec, container = {
        'mp3': ('libmp3lame', 'mp3'), 'ogg': ('libvorbis', 'ogg'),
        'oga': ('libvorbis', 'ogg'), 'm4a': ('aac', 'mp4'),
        'aac': ('aac', 'adts'), 'webm': ('libopus', 'webm'),
    }[extension]
    command = ['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-c:a', codec]
    if extension == 'm4a':
        command += ['-movflags', 'frag_keyframe+empty_moov']
    return subprocess.run(command + ['-f', container, 'pipe:1'], input=data, capture_output=True, check=True, timeout=10).stdout
