# ==============================================================================
# Module 02: KMS Customer Managed Keys (Layer 1)
# Provisions dedicated CMK keys for S3 Media Buckets, DynamoDB Tables, and EKS Secrets
# ==============================================================================

# 1. KMS Key for S3 Media Storage (Raw & HLS)
resource "aws_kms_key" "s3_key" {
  description             = "KMS CMK for StreamForge S3 Media Buckets (Raw & HLS)"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudFrontAndS3Services"
        Effect = "Allow"
        Principal = {
          Service = [
            "s3.amazonaws.com",
            "cloudfront.amazonaws.com",
            "events.amazonaws.com"
          ]
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-s3-kms"
  })
}

resource "aws_kms_alias" "s3_key_alias" {
  name          = "alias/${var.project_name}-s3"
  target_key_id = aws_kms_key.s3_key.key_id
}

# 2. KMS Key for DynamoDB Tables
resource "aws_kms_key" "dynamodb_key" {
  description             = "KMS CMK for StreamForge DynamoDB Tables"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowDynamoDBService"
        Effect = "Allow"
        Principal = {
          Service = "dynamodb.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-dynamodb-kms"
  })
}

resource "aws_kms_alias" "dynamodb_key_alias" {
  name          = "alias/${var.project_name}-dynamodb"
  target_key_id = aws_kms_key.dynamodb_key.key_id
}

# 3. KMS Key for EKS Cluster Secrets Encryption (Envelope Encryption)
resource "aws_kms_key" "eks_secrets_key" {
  description             = "KMS CMK for EKS Cluster Secrets Envelope Encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-eks-secrets-kms"
  })
}

resource "aws_kms_alias" "eks_secrets_key_alias" {
  name          = "alias/${var.project_name}-eks-secrets"
  target_key_id = aws_kms_key.eks_secrets_key.key_id
}

data "aws_caller_identity" "current" {}
