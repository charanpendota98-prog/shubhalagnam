"""Bounded, offline voice-container inspection and audio decoding.

No untrusted filename or URL reaches a decoder. A private temporary file is
opened with an explicit demuxer, with network protocols and MOV external data
references disabled. Upload size limits are checked first.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

_FORMATS = {
    'mp3': {'mp3'}, 'wav': {'wav'}, 'ogg': {'ogg'}, 'oga': {'ogg'},
    'm4a': {'mov', 'mp4', 'm4a', '3gp', '3g2', 'mj2'},
    'aac': {'aac'}, 'webm': {'matroska', 'webm'},
}


def inspect_voice(data: bytes, extension: str) -> dict[str, Any]:
    unavailable = {'ok': False, 'unavailable': True}
    invalid = {'ok': False, 'unavailable': False}
    probe, decoder = shutil.which('ffprobe'), shutil.which('ffmpeg')
    if not probe or not decoder:
        return unavailable
    try:
        demuxer = {'mp3':'mp3','wav':'wav','ogg':'ogg','oga':'ogg','m4a':'mov','aac':'aac','webm':'matroska'}.get(extension)
        if not demuxer:
            return invalid
        # A seekable private file preserves ordinary M4A clips with a trailing
        # metadata atom. stdin-only decoding rejects those valid recordings.
        with tempfile.TemporaryDirectory(prefix='voice-validate-') as directory:
            path = Path(directory) / 'clip'
            path.write_bytes(data)
            source = ['-protocol_whitelist', 'file,pipe', '-f', demuxer]
            if demuxer == 'mov':
                source += ['-enable_drefs', '0', '-use_absolute_path', '0']
            return _inspect_file(str(path), source, extension, probe, decoder)
    except OSError:
        return invalid


def _inspect_file(path: str, source: list[str], extension: str, probe: str, decoder: str) -> dict[str, Any]:
    invalid = {'ok': False, 'unavailable': False}
    unavailable = {'ok': False, 'unavailable': True}
    try:
        result = subprocess.run(
            [probe, '-v', 'error', *source,
             '-probesize', '2097152', '-analyzeduration', '3000000',
             '-i', path, '-show_streams', '-show_format', '-of', 'json'],
            capture_output=True, timeout=5, check=False,
        )
        if result.returncode or len(result.stdout) > 131072:
            return invalid
        metadata = json.loads(result.stdout)
        streams = metadata.get('streams', [])
        audio = [stream for stream in streams if stream.get('codec_type') == 'audio']
        formats = set(str(metadata.get('format', {}).get('format_name', '')).split(','))
        if not formats.intersection(_FORMATS.get(extension, set())) or not audio:
            return invalid
        if any(stream.get('codec_type') == 'video' and not stream.get('disposition', {}).get('attached_pic') for stream in streams):
            return invalid
        if any(not stream.get('codec_name') or int(stream.get('sample_rate', 0)) <= 0 or int(stream.get('channels', 0)) <= 0 for stream in audio):
            return invalid
        decoded = subprocess.run(
            [decoder, '-nostdin', '-hide_banner', '-v', 'error', '-xerror',
             *source, '-threads', '1',
             '-i', path, '-map', '0:a:0', '-vn', '-sn', '-dn',
             '-threads', '1', '-f', 'null', '-progress', 'pipe:1', '-'],
            capture_output=True, timeout=8, check=False,
        )
        if decoded.returncode or len(decoded.stdout) > 131072:
            return invalid
        times = [int(line.split('=', 1)[1]) for line in decoded.stdout.decode('ascii', errors='ignore').splitlines() if line.startswith('out_time_us=') and line.split('=', 1)[1].isdigit()]
        if not times or max(times) <= 0:
            return invalid
        return {'ok': True, 'duration_seconds': max(times) / 1_000_000}
    except FileNotFoundError:
        return unavailable
    except (OSError, subprocess.TimeoutExpired, ValueError, TypeError, KeyError):
        return invalid
