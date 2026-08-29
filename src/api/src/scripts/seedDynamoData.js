/**
 * StreamForge AWS DynamoDB Seeder Script
 * Seeds initial users, channels, categories, and VODs into Amazon DynamoDB tables.
 */

import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../config/awsConfig.js';
import bcrypt from 'bcryptjs';

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || 'streamforge-users';
const CHANNELS_TABLE = process.env.DYNAMODB_CHANNELS_TABLE || 'streamforge-channels';
const VIDEOS_TABLE = process.env.DYNAMODB_VIDEOS_TABLE || 'streamforge-videos';

export async function seedDatabase() {
  console.log('[Seeder] Starting AWS DynamoDB database seeding...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Seed Users
  const seedUsers = [
    {
      user_id: 'usr_tenz_001',
      username: 'tenz',
      email: 'tenz@streamforge.net',
      password_hash: passwordHash,
      display_name: 'TenZ',
      avatar_url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200',
      role: 'streamer',
      created_at: new Date().toISOString()
    },
    {
      user_id: 'usr_faker_002',
      username: 'faker',
      email: 'faker@streamforge.net',
      password_hash: passwordHash,
      display_name: 'Faker',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      role: 'streamer',
      created_at: new Date().toISOString()
    },
    {
      user_id: 'usr_shroud_003',
      username: 'shroud',
      email: 'shroud@streamforge.net',
      password_hash: passwordHash,
      display_name: 'Shroud',
      avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200',
      role: 'streamer',
      created_at: new Date().toISOString()
    }
  ];

  for (const user of seedUsers) {
    try {
      await dynamoDocClient.send(new PutCommand({ TableName: USERS_TABLE, Item: user }));
      console.log(`[Seeder] Seeded user: ${user.username}`);
    } catch (err) {
      console.warn(`[Seeder] Error seeding user ${user.username}: ${err.message}`);
    }
  }

  // 2. Seed Channels
  const seedChannels = [
    {
      channel_id: 'chn_tenz',
      user_id: 'usr_tenz_001',
      streamer_name: 'TenZ',
      streamer_username: 'tenz',
      streamer_avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200',
      title: 'Radiant Ranked Solo Q | SEN TenZ',
      category: 'Valorant',
      tags: ['Ranked', 'English', 'DropsEnabled'],
      is_live: 'true',
      viewer_count: 28500,
      stream_key: 'sk_live_tenz_99281a',
      playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      created_at: new Date().toISOString()
    },
    {
      channel_id: 'chn_faker',
      user_id: 'usr_faker_002',
      streamer_name: 'Faker',
      streamer_username: 'faker',
      streamer_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      title: 'T1 Faker Mid Lane Dominance',
      category: 'League of Legends',
      tags: ['Challenger', 'KR', 'Esports'],
      is_live: 'true',
      viewer_count: 42100,
      stream_key: 'sk_live_faker_18293a',
      playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      created_at: new Date().toISOString()
    },
    {
      channel_id: 'chn_shroud',
      user_id: 'usr_shroud_003',
      streamer_name: 'Shroud',
      streamer_username: 'shroud',
      streamer_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200',
      title: 'NoPixel GTA RP Cop Patrol',
      category: 'Grand Theft Auto V',
      tags: ['Roleplay', 'NoPixel', 'English'],
      is_live: 'true',
      viewer_count: 19800,
      stream_key: 'sk_live_shroud_77182b',
      playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      created_at: new Date().toISOString()
    }
  ];

  for (const channel of seedChannels) {
    try {
      await dynamoDocClient.send(new PutCommand({ TableName: CHANNELS_TABLE, Item: channel }));
      console.log(`[Seeder] Seeded channel: ${channel.streamer_name}`);
    } catch (err) {
      console.warn(`[Seeder] Error seeding channel ${channel.streamer_name}: ${err.message}`);
    }
  }

  // 3. Seed VODs
  const seedVideos = [
    {
      video_id: 'vod_vct_finals_2026',
      channel_id: 'chn_tenz',
      title: 'VCT Masters 2026 Grand Finals Match Highlights',
      description: 'Full match recap with post-game commentary.',
      category: 'Valorant',
      duration_seconds: 7340,
      s3_raw_key: 'uploads/2026/08/vct_finals.mp4',
      s3_hls_prefix: 'vods/vct_finals/',
      hls_manifest_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      thumbnail_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
      status: 'READY',
      views_count: 142000,
      created_at: new Date().toISOString()
    }
  ];

  for (const video of seedVideos) {
    try {
      await dynamoDocClient.send(new PutCommand({ TableName: VIDEOS_TABLE, Item: video }));
      console.log(`[Seeder] Seeded VOD: ${video.title}`);
    } catch (err) {
      console.warn(`[Seeder] Error seeding video ${video.title}: ${err.message}`);
    }
  }

  console.log('[Seeder] AWS DynamoDB seeding process completed.');
}

// Run directly if invoked from command line
if (process.argv[1] && process.argv[1].endsWith('seedDynamoData.js')) {
  seedDatabase().catch((e) => console.error(e));
}
