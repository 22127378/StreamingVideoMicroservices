# ==============================================================================
# Module 03: IAM Roles for Service Accounts (IRSA) (Layer 1)
# Establishes fine-grained, least-privilege IAM roles for EKS Pods via OIDC
# ==============================================================================

# 1. IAM Role for Backend API Pods (IRSA)
resource "aws_iam_role" "api_role" {
  name = "${var.project_name}-api-irsa-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.oidc_provider}:sub" = "system:serviceaccount:${var.k8s_namespace}:${var.api_service_account_name}"
            "${var.oidc_provider}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-api-irsa-role"
  })
}

# Least-privilege IAM Policy for API Pods
resource "aws_iam_policy" "api_policy" {
  name        = "${var.project_name}-api-policy"
  description = "Least privilege policy for StreamForge API Service"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # DynamoDB Operations
      {
        Sid    = "DynamoDBTableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          var.dynamodb_tables_arn_pattern,
          "${var.dynamodb_tables_arn_pattern}/index/*"
        ]
      },
      # S3 Raw Upload Presigned URL Generation & Media Read
      {
        Sid    = "S3RawBucketAccess"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:AbortMultipartUpload"
        ]
        Resource = "${var.s3_raw_bucket_arn}/*"
      },
      # SQS Transcode Queue Notification Pusher
      {
        Sid    = "SQSPublishAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = var.sqs_transcode_queue_arn
      },
      # KMS Decrypt/GenerateDataKey for S3 and DynamoDB
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = [
          var.s3_kms_key_arn,
          var.dynamodb_kms_key_arn
        ]
      },
      # IVS Access for dynamically managing Channels and Stream Keys
      {
        Sid    = "IVSAccess"
        Effect = "Allow"
        Action = [
          "ivs:CreateChannel",
          "ivs:DeleteChannel",
          "ivs:GetChannel",
          "ivs:ListChannels",
          "ivs:CreateStreamKey",
          "ivs:DeleteStreamKey",
          "ivs:GetStreamKey",
          "ivs:ListStreamKeys",
          "ivs:StopStream"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "api_attach" {
  role       = aws_iam_role.api_role.name
  policy_arn = aws_iam_policy.api_policy.arn
}

# 2. IAM Role for FFmpeg Transcoder Worker Pods (IRSA)
resource "aws_iam_role" "worker_role" {
  name = "${var.project_name}-transcoder-worker-irsa-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.oidc_provider}:sub" = "system:serviceaccount:${var.k8s_namespace}:${var.worker_service_account_name}"
            "${var.oidc_provider}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-worker-irsa-role"
  })
}

# Least-privilege IAM Policy for Transcoder Worker Pods
resource "aws_iam_policy" "worker_policy" {
  name        = "${var.project_name}-worker-policy"
  description = "Least privilege policy for StreamForge FFmpeg Transcoder Worker"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Read Raw Video from S3 Raw Bucket
      {
        Sid    = "ReadRawMedia"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectTagging"
        ]
        Resource = "${var.s3_raw_bucket_arn}/*"
      },
      # Upload HLS Segments and Playlists to S3 HLS Delivery Bucket
      {
        Sid    = "UploadHlsMedia"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:PutObjectTagging"
        ]
        Resource = "${var.s3_hls_bucket_arn}/*"
      },
      # SQS Queue Consumer Operations
      {
        Sid    = "SQSConsumerAccess"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = var.sqs_transcode_queue_arn
      },
      # Update Video Transcoding Status in DynamoDB
      {
        Sid    = "DynamoDBStatusUpdate"
        Effect = "Allow"
        Action = [
          "dynamodb:UpdateItem",
          "dynamodb:GetItem"
        ]
        Resource = var.dynamodb_tables_arn_pattern
      },
      # KMS Decrypt / Encrypt
      {
        Sid    = "KMSWorkerAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = [
          var.s3_kms_key_arn,
          var.dynamodb_kms_key_arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "worker_attach" {
  role       = aws_iam_role.worker_role.name
  policy_arn = aws_iam_policy.worker_policy.arn
}

# 3. IAM Role for Live RTMP Ingest Pods (IRSA)
resource "aws_iam_role" "media_role" {
  name = "${var.project_name}-media-ingest-irsa-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.oidc_provider}:sub" = "system:serviceaccount:${var.k8s_namespace}:${var.media_service_account_name}"
            "${var.oidc_provider}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-media-ingest-irsa-role"
  })
}

resource "aws_iam_policy" "media_policy" {
  name        = "${var.project_name}-media-policy"
  description = "Least privilege policy for StreamForge Live RTMP Ingest"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "UploadLiveHlsSegments"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${var.s3_hls_bucket_arn}/*"
      },
      {
        Sid    = "KMSMediaAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = var.s3_kms_key_arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "media_attach" {
  role       = aws_iam_role.media_role.name
  policy_arn = aws_iam_policy.media_policy.arn
}
