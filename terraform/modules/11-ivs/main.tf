# ==============================================================================
# Module 11: AWS Interactive Video Service (IVS)
# Provisions IVS Channels and Stream Keys for Real-Time Streaming
# ==============================================================================

# Create a master demo IVS channel (Low Latency HLS)
# In a fully multi-tenant app, the Backend API dynamically creates these.
# We provision one here as a reliable fallback/demo channel.
resource "aws_ivs_channel" "streamforge_channel" {
  name = "${var.project_name}-master-channel"
  
  # LOW ensures ultra-low latency for chat interactivity (under 3 seconds)
  latency_mode = "LOW"
  
  # STANDARD type supports up to 1080p 60fps
  type = "STANDARD"

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ivs-master-channel"
  })
}

# Explicitly create a stream key for the master channel
resource "aws_ivs_stream_key" "master_key" {
  channel_arn = aws_ivs_channel.streamforge_channel.arn

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ivs-master-key"
  })
}
