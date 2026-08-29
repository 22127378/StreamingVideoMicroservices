# ==============================================================================
# Module 04: S3 Media Storage & Delivery (Layer 2)
# Provisions S3 Raw Media Bucket (with SSE-KMS, CORS, EventBridge) and S3 HLS Delivery Bucket (with OAC)
# ==============================================================================

# 1. S3 Raw Media Bucket (For Direct Browser Presigned Uploads)
resource "aws_s3_bucket" "raw_media" {
  bucket        = "${var.project_name}-raw-media-${data.aws_caller_identity.current.account_id}-${var.aws_region}"
  force_destroy = false

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-raw-media-bucket"
    Type = "RawMedia"
  })
}

resource "aws_s3_bucket_versioning" "raw_media_versioning" {
  bucket = aws_s3_bucket.raw_media.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "raw_media_encryption" {
  bucket = aws_s3_bucket.raw_media.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.s3_kms_key_arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "raw_media_pab" {
  bucket = aws_s3_bucket.raw_media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "raw_media_cors" {
  bucket = aws_s3_bucket.raw_media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag", "x-amz-server-side-encryption"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "raw_media_lifecycle" {
  bucket = aws_s3_bucket.raw_media.id

  rule {
    id     = "archive-raw-to-glacier-and-expire"
    status = "Enabled"

    filter {}

    transition {
      days          = 30
      storage_class = "GLACIER_IR"
    }

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# Enable EventBridge Notifications on S3 Raw Bucket
resource "aws_s3_bucket_notification" "raw_media_notification" {
  bucket      = aws_s3_bucket.raw_media.id
  eventbridge = true
}

# 2. S3 HLS Delivery Bucket (For Multi-bitrate ABR Playlists and TS/M4S Chunks)
resource "aws_s3_bucket" "hls_delivery" {
  bucket        = "${var.project_name}-hls-delivery-${data.aws_caller_identity.current.account_id}-${var.aws_region}"
  force_destroy = false

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-hls-delivery-bucket"
    Type = "HLSDelivery"
  })
}

resource "aws_s3_bucket_versioning" "hls_delivery_versioning" {
  bucket = aws_s3_bucket.hls_delivery.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "hls_delivery_encryption" {
  bucket = aws_s3_bucket.hls_delivery.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.s3_kms_key_arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "hls_delivery_pab" {
  bucket = aws_s3_bucket.hls_delivery.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "hls_delivery_cors" {
  bucket = aws_s3_bucket.hls_delivery.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["Content-Length", "Content-Range", "ETag", "Date"]
    max_age_seconds = 86400
  }
}

# S3 Bucket Policy allowing CloudFront Origin Access Control (OAC)
resource "aws_s3_bucket_policy" "hls_delivery_oac_policy" {
  bucket = aws_s3_bucket.hls_delivery.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.hls_delivery.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = var.cloudfront_distribution_arn != "" ? var.cloudfront_distribution_arn : "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/*"
          }
        }
      }
    ]
  })
}

data "aws_caller_identity" "current" {}
