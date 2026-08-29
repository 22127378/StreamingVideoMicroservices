/**
 * StreamForge Mock & Fallback Data
 * High-quality stream feeds, game categories, avatars, and live channels.
 */

export const MOCK_FEATURED_STREAM = {
  channel_id: 'chn_tenz_live',
  streamer_name: 'TenZ',
  streamer_username: 'tenz',
  streamer_avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80',
  title: 'VCT Champions 2026 Grand Finals Watchparty | Radiant Ranked Games',
  category: 'Valorant',
  tags: ['Radiant', 'Ranked', 'English', 'Esports'],
  viewer_count: 84290,
  is_live: 'true',
  playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  thumbnail_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
  bio: 'Professional Valorant Player & Content Creator for Sentinels.'
};

export const MOCK_CATEGORIES = [
  {
    id: 'cat_valorant',
    name: 'Valorant',
    viewers: 184500,
    tags: ['FPS', 'Shooter', 'Esports'],
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'cat_lol',
    name: 'League of Legends',
    viewers: 245100,
    tags: ['MOBA', 'Strategy', 'Competitive'],
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'cat_just_chatting',
    name: 'Just Chatting',
    viewers: 320400,
    tags: ['IRL', 'Talk Show', 'Community'],
    image: 'https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'cat_gta5',
    name: 'Grand Theft Auto V',
    viewers: 112000,
    tags: ['Open World', 'Roleplay', 'Action'],
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'cat_software',
    name: 'Software & Game Dev',
    viewers: 54300,
    tags: ['Coding', 'Cloud', 'Architecture'],
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'cat_music',
    name: 'Music & Creative',
    viewers: 38900,
    tags: ['Live Band', 'Lofi', 'Beats'],
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'
  }
];

export const MOCK_CHANNELS = [
  MOCK_FEATURED_STREAM,
  {
    channel_id: 'chn_shroud_live',
    streamer_name: 'shroud',
    streamer_username: 'shroud',
    streamer_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    title: 'Testing New Competitive Meta | FPS Aim God',
    category: 'Valorant',
    tags: ['Aim', 'FPS', 'PC'],
    viewer_count: 52100,
    is_live: 'true',
    playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnail_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
    bio: 'Former CS:GO Pro, Full-time Streamer & Human Aimbot.'
  },
  {
    channel_id: 'chn_faker_live',
    streamer_name: 'Faker',
    streamer_username: 'faker',
    streamer_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
    title: 'T1 Faker - Challenger Mid Lane Solo Queue',
    category: 'League of Legends',
    tags: ['T1', 'Challenger', 'Mid', 'Korean'],
    viewer_count: 98400,
    is_live: 'true',
    playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnail_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80',
    bio: 'The Unkillable Demon King. 4x World Champion.'
  },
  {
    channel_id: 'chn_techlead_live',
    streamer_name: 'TechLeadPro',
    streamer_username: 'techlead',
    streamer_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    title: 'Live Coding: Event-Driven Video Transcoder with AWS EKS & KEDA',
    category: 'Software & Game Dev',
    tags: ['AWS', 'Kubernetes', 'Terraform', 'NodeJS'],
    viewer_count: 14200,
    is_live: 'true',
    playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnail_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    bio: 'Principal Cloud Architect & Senior DevOps Engineer.'
  },
  {
    channel_id: 'chn_lofi_girl',
    streamer_name: 'Lofi Girl',
    streamer_username: 'lofigirl',
    streamer_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    title: 'beats to relax/study to - 24/7 Live Stream Radio',
    category: 'Music & Creative',
    tags: ['Chill', 'Study', 'Relax', 'Lofi'],
    viewer_count: 42300,
    is_live: 'true',
    playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnail_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    bio: 'Peaceful lofi hip hop beats for your daily focus and chill sessions.'
  }
];
