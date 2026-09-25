output "channel_arn" {
  description = "The ARN of the IVS Channel"
  value       = aws_ivs_channel.streamforge_channel.arn
}

output "channel_ingest_endpoint" {
  description = "The Ingest Endpoint for RTMP/WebRTC Broadcasting"
  value       = aws_ivs_channel.streamforge_channel.ingest_endpoint
}

output "channel_playback_url" {
  description = "The HLS Playback URL for Viewers"
  value       = aws_ivs_channel.streamforge_channel.playback_url
}

output "stream_key_value" {
  description = "The Stream Key Value (Sensitive)"
  value       = aws_ivs_stream_key.master_key.value
  sensitive   = true
}
