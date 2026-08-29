const test = require('node:test');
const assert = require('node:assert');
const { TranscoderWorker } = require('../src/worker');

test('TranscoderWorker parses EventBridge transformed SQS message body correctly', (t) => {
  const worker = new TranscoderWorker();

  const transformedEvent = JSON.stringify({
    bucket: 'streamforge-raw-media-12345-us-east-1',
    key: 'raw-uploads/usr_abc/vod_xyz/sample+video.mp4',
    action: 'TRANSCODE_VOD'
  });

  const parsed = worker.parseMessageBody(transformedEvent);
  assert.strictEqual(parsed.bucket, 'streamforge-raw-media-12345-us-east-1');
  assert.strictEqual(parsed.key, 'raw-uploads/usr_abc/vod_xyz/sample video.mp4');
});

test('TranscoderWorker parses EventBridge S3 detail envelope correctly', (t) => {
  const worker = new TranscoderWorker();

  const ebEvent = JSON.stringify({
    source: 'aws.s3',
    'detail-type': 'Object Created',
    detail: {
      bucket: { name: 'streamforge-raw-media' },
      object: { key: 'raw-uploads/usr_abc/vod_xyz/my_clip.mp4' }
    }
  });

  const parsed = worker.parseMessageBody(ebEvent);
  assert.strictEqual(parsed.bucket, 'streamforge-raw-media');
  assert.strictEqual(parsed.key, 'raw-uploads/usr_abc/vod_xyz/my_clip.mp4');
});
