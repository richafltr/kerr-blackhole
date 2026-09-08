"""Generate original narration using an existing ElevenLabs subscription.
Reads ELEVENLABS_API_KEY or --key-file; never ships a key to the browser.
Existing raw clips are reused. Remove a clip deliberately to regenerate it.
Free-tier output has no commercial license; regenerate under a paid plan for that use.
Requires ffmpeg and ffprobe on PATH. No Python packages required.
"""
import argparse, base64, datetime, hashlib, json, os, subprocess, urllib.request, urllib.error
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--key-file', type=Path)
parser.add_argument('--work', type=Path, default=Path('work/narration'))
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
config = json.loads((root / 'scripts/narration.json').read_text())
key = args.key_file.read_text().strip() if args.key_file else os.environ.get('ELEVENLABS_API_KEY', '')
if not key:
    raise SystemExit('Provide ELEVENLABS_API_KEY in your environment or --key-file.')

def api(path, data=None):
    req = urllib.request.Request('https://api.elevenlabs.io/v1/' + path,
        headers={'xi-api-key': key, 'Content-Type': 'application/json'},
        data=json.dumps(data).encode() if data else None)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # Do not log headers, credentials, or provider payloads.
        raise SystemExit(f'ElevenLabs returned HTTP {error.code}. No automatic retry.') from None

plan = api('user/subscription')['tier']
args.work.mkdir(parents=True, exist_ok=True)
cues = []
start = 0.0
for i, cue in enumerate(config['cues']):
    raw = args.work / f'voice-{i}.mp3'
    stamp = args.work / f'voice-{i}.json'
    fingerprint = hashlib.sha256(json.dumps({**config, 'cue': i}, sort_keys=True).encode()).hexdigest()
    if stamp.exists() and json.loads(stamp.read_text()).get('tier') != plan:
        raise SystemExit('Cached audio was generated under a different subscription tier. Use a fresh --work directory to regenerate.')
    if raw.exists() and (not stamp.exists() or json.loads(stamp.read_text()).get('fingerprint') != fingerprint):
        raise SystemExit(f'Cached clip {i} differs from the script. Remove it explicitly to regenerate.')
    if not raw.exists():
        response = api(f"text-to-speech/{config['voice_id']}/with-timestamps?output_format=mp3_44100_128", {
            'text': cue['text'], 'model_id': config['model_id'], 'voice_settings': config['voice_settings'],
            'previous_text': config['cues'][i-1]['text'] if i else '',
            'next_text': config['cues'][i+1]['text'] if i+1 < len(config['cues']) else '',
        })
        raw.write_bytes(base64.b64decode(response['audio_base64']))
        stamp.write_text(json.dumps({'fingerprint': fingerprint, 'tier': plan, 'alignment': response.get('alignment')}))
    duration = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(raw)]))
    lead = 1.0
    total = lead + duration + cue['hold']
    wav = args.work / f'cue-{i}.wav'
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',
        f'adelay=1000:all=1,apad,atrim=duration={total}', '-ar','44100','-ac','1',str(wav)], check=True)
    cues.append({**cue, 'start':round(start,3), 'speechStart':round(start+lead,3),
                 'speechEnd':round(start+lead+duration,3), 'end':round(start+total,3)})
    start += total
    print(f'Prepared cue {i+1}: {duration:.2f}s voice / {total:.2f}s shot',flush=True)
concat = args.work / 'concat.txt'
concat.write_text(''.join(f"file '{(args.work / f'cue-{i}.wav').resolve()}'\n" for i in range(len(cues))))
out = root / 'public/assets/audio'
out.mkdir(parents=True, exist_ok=True)
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(concat),
    '-af','loudnorm=I=-18:TP=-2:LRA=8','-ar','44100','-ac','1','-b:a','128k',str(out/'prologue-voice.mp3')],check=True)
manifest = {'voice': config['voice_name'], 'voiceId': config['voice_id'], 'model':config['model_id'],
    'generated':datetime.date.today().isoformat(), 'tier':plan, 'license':'Noncommercial preview with ElevenLabs attribution' if plan=='free' else 'Generated under paid ElevenLabs subscription; provider terms apply',
    'duration':round(start,3), 'cues':cues}
(root/'lib/prologue.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Finished {start:.2f}s prologue; {plan} tier. Credential not stored in output.')
