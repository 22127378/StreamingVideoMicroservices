const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ffmpegPipeline = require('../src/services/ffmpegPipeline');

test('FfmpegPipeline generates valid master.m3u8 with multi-bitrate profiles', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hls-test-'));

  const profiles = [
    { name: '1080p', width: 1920, height: 1080, bandwidth: 6300000 },
    { name: '720p', width: 1280, height: 720, bandwidth: 3200000 },
    { name: '480p', width: 854, height: 480, bandwidth: 1650000 },
    { name: '360p', width: 640, height: 360, bandwidth: 900000 }
  ];

  const masterPath = ffmpegPipeline.generateMasterPlaylist(tmpDir, profiles);
  assert.ok(fs.existsSync(masterPath));

  const content = fs.readFileSync(masterPath, 'utf8');
  assert.ok(content.includes('#EXTM3U'));
  assert.ok(content.includes('RESOLUTION=1920x1080'));
  assert.ok(content.includes('1080p.m3u8'));
  assert.ok(content.includes('RESOLUTION=1280x720'));
  assert.ok(content.includes('720p.m3u8'));
  assert.ok(content.includes('RESOLUTION=854x480'));
  assert.ok(content.includes('480p.m3u8'));
  assert.ok(content.includes('RESOLUTION=640x360'));
  assert.ok(content.includes('360p.m3u8'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
