# ==============================================================================
# Layer 0: Remote State Bootstrap
# Provisions S3 Bucket + KMS Encryption + DynamoDB Lock Table for Terraform State
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = merge(var.common_tags, {
      Module    = "Bootstrap"
      ManagedBy = "Terraform"
    })
  }
}

# 1. KMS Customer Managed Key (CMK) for Terraform State Encryption
resource "aws_kms_key" "tf_state_key" {
  description             = "KMS CMK for StreamForge Terraform State S3 Bucket and DynamoDB Lock Table"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-tf-state-kms"
  }
}

resource "aws_kms_alias" "tf_state_key_alias" {
  name          = "alias/${var.project_name}-tf-state"
  target_key_id = aws_kms_key.tf_state_key.key_id
}

# 2. S3 Bucket for Terraform Remote State Storage
resource "aws_s3_bucket" "tf_state_bucket" {
  bucket        = "${var.project_name}-tf-state-${data.aws_caller_identity.current.account_id}-${var.aws_region}"
  force_destroy = false

  tags = {
    Name = "${var.project_name}-tf-state-bucket"
  }
}

resource "aws_s3_bucket_versioning" "tf_state_versioning" {
  bucket = aws_s3_bucket.tf_state_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state_encryption" {
  bucket = aws_s3_bucket.tf_state_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.tf_state_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state_pab" {
  bucket = aws_s3_bucket.tf_state_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "tf_state_lifecycle" {
  bucket = aws_s3_bucket.tf_state_bucket.id

  rule {
    id     = "expire-old-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# 3. DynamoDB Table for Terraform State Locking
resource "aws_dynamodb_table" "tf_state_locks" {
  name         = "${var.project_name}-tf-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.tf_state_key.arn
  }

  tags = {
    Name = "${var.project_name}-tf-locks-table"
  }
}

data "aws_caller_identity" "current" {}
