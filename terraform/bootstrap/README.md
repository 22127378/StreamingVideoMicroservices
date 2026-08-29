# StreamForge - Terraform Remote State Bootstrap (Layer 0)

This module provisions the foundational remote state management infrastructure for the StreamForge AWS platform.

## Resources Created

1. **KMS Customer Managed Key (CMK)** (`aws_kms_key.tf_state_key`):
   - Dedicated encryption key for Terraform state storage and DynamoDB table locking.
   - Automatic 1-year key rotation enabled.
2. **S3 State Storage Bucket** (`aws_s3_bucket.tf_state_bucket`):
   - S3 bucket with versioning enabled to maintain full history of state revisions.
   - Default Server-Side Encryption (SSE-KMS) with the dedicated CMK.
   - Public Access Block strictly enabled on all 4 settings.
   - Lifecycle rule expiring noncurrent versions after 90 days.
3. **DynamoDB State Lock Table** (`aws_dynamodb_table.tf_state_locks`):
   - Pay-Per-Request (On-Demand) billing mode to eliminate idle costs.
   - Point-in-time recovery (PITR) enabled.
   - KMS Server-side encryption enabled.

## Usage

```bash
cd terraform/bootstrap
terraform init
terraform plan
terraform apply
```

After provisioning, copy the `backend_config_snippet` output into `terraform/environments/prod/main.tf`.
