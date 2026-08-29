# ==============================================================================
# Module 05: DynamoDB Tables (Layer 2)
# Provisions Users, Channels, Streams, and Follows tables with On-Demand billing, GSIs, and KMS
# ==============================================================================

# 1. StreamForge_Users Table
resource "aws_dynamodb_table" "users" {
  name         = "${var.project_name}_Users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "username"
    type = "S"
  }

  # Global Secondary Index: Search by Email
  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  # Global Secondary Index: Search by Username
  global_secondary_index {
    name            = "username-index"
    hash_key        = "username"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.dynamodb_kms_key_arn
  }

  tags = merge(var.common_tags, {
    Name  = "${var.project_name}_Users"
    Table = "Users"
  })
}

# 2. StreamForge_Channels Table
resource "aws_dynamodb_table" "channels" {
  name         = "${var.project_name}_Channels"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "channel_id"

  attribute {
    name = "channel_id"
    type = "S"
  }

  attribute {
    name = "streamer_id"
    type = "S"
  }

  attribute {
    name = "is_live"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  global_secondary_index {
    name            = "streamer_id-index"
    hash_key        = "streamer_id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "is_live-index"
    hash_key        = "is_live"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "category-index"
    hash_key        = "category"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.dynamodb_kms_key_arn
  }

  tags = merge(var.common_tags, {
    Name  = "${var.project_name}_Channels"
    Table = "Channels"
  })
}

# 3. StreamForge_Streams Table (For Live Streams and Transcoded VODs)
resource "aws_dynamodb_table" "streams" {
  name         = "${var.project_name}_Streams"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "stream_id"

  attribute {
    name = "stream_id"
    type = "S"
  }

  attribute {
    name = "channel_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S" # PROCESSING, READY, FAILED, LIVE, OFFLINE
  }

  global_secondary_index {
    name            = "channel_id-index"
    hash_key        = "channel_id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.dynamodb_kms_key_arn
  }

  tags = merge(var.common_tags, {
    Name  = "${var.project_name}_Streams"
    Table = "Streams"
  })
}

# 4. StreamForge_Follows Table
resource "aws_dynamodb_table" "follows" {
  name         = "${var.project_name}_Follows"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "channel_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "channel_id"
    type = "S"
  }

  global_secondary_index {
    name            = "channel_id-user_id-index"
    hash_key        = "channel_id"
    range_key       = "user_id"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.dynamodb_kms_key_arn
  }

  tags = merge(var.common_tags, {
    Name  = "${var.project_name}_Follows"
    Table = "Follows"
  })
}
