# ==============================================================================
# Module 06: SQS Transcoding Queue & EventBridge (Layer 2)
# Provisions SQS Transcode Queue with DLQ and EventBridge rule triggering on S3 ObjectCreated
# ==============================================================================

# 1. Dead-Letter Queue (DLQ) for Failed Transcoding Jobs
resource "aws_sqs_queue" "transcode_dlq" {
  name                      = "${var.project_name}-transcode-dlq"
  message_retention_seconds = 1209600 # 14 days retention for inspection
  kms_master_key_id         = var.s3_kms_key_arn

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-transcode-dlq"
    Type = "DLQ"
  })
}

# 2. Primary SQS Transcode Queue
resource "aws_sqs_queue" "transcode_queue" {
  name                       = "${var.project_name}-transcode-queue"
  visibility_timeout_seconds = 300  # 5 minutes visibility window for FFmpeg processing
  message_retention_seconds  = 345600 # 4 days
  receive_wait_time_seconds  = 20   # Long-polling enabled
  kms_master_key_id          = var.s3_kms_key_arn

  # Redrive Policy sending to DLQ after 3 failures
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.transcode_dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-transcode-queue"
    Type = "MainQueue"
  })
}

# SQS Queue Policy allowing EventBridge and API Service to send messages
resource "aws_sqs_queue_policy" "transcode_queue_policy" {
  queue_url = aws_sqs_queue.transcode_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridgeToSendMessage"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.transcode_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_cloudwatch_event_rule.s3_upload_rule.arn
          }
        }
      }
    ]
  })
}

# 3. Amazon EventBridge Rule (Matches S3 Raw Bucket ObjectCreated for .mp4 files)
resource "aws_cloudwatch_event_rule" "s3_upload_rule" {
  name        = "${var.project_name}-s3-mp4-upload-rule"
  description = "Trigger SQS transcode queue when a new .mp4 video is uploaded to S3 Raw bucket"

  event_pattern = jsonencode({
    source      = ["aws.s3"]
    detail-type = ["Object Created"]
    detail = {
      bucket = {
        name = [var.s3_raw_bucket_name]
      }
      object = {
        key = [{
          suffix = ".mp4"
        }]
      }
    }
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-s3-upload-event-rule"
  })
}

# EventBridge Target to SQS Transcode Queue
resource "aws_cloudwatch_event_target" "sqs_target" {
  rule      = aws_cloudwatch_event_rule.s3_upload_rule.name
  target_id = "SendToTranscodeSQS"
  arn       = aws_sqs_queue.transcode_queue.arn

  # Transform S3 Event payload into clean JSON for Transcoder Worker
  input_transformer {
    input_paths = {
      bucket = "$.detail.bucket.name"
      key    = "$.detail.object.key"
      size   = "$.detail.object.size"
      time   = "$.time"
    }
    input_template = <<EOF
{
  "bucket": <bucket>,
  "key": <key>,
  "size": <size>,
  "timestamp": <time>,
  "action": "TRANSCODE_VOD"
}
EOF
  }
}
