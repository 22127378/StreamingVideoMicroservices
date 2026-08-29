output "s3_kms_key_arn" {
  description = "ARN of KMS Key for S3 Media Buckets"
  value       = aws_kms_key.s3_key.arn
}

output "s3_kms_key_id" {
  description = "ID of KMS Key for S3 Media Buckets"
  value       = aws_kms_key.s3_key.key_id
}

output "dynamodb_kms_key_arn" {
  description = "ARN of KMS Key for DynamoDB Tables"
  value       = aws_kms_key.dynamodb_key.arn
}

output "dynamodb_kms_key_id" {
  description = "ID of KMS Key for DynamoDB Tables"
  value       = aws_kms_key.dynamodb_key.key_id
}

output "eks_secrets_kms_key_arn" {
  description = "ARN of KMS Key for EKS Secrets Envelope Encryption"
  value       = aws_kms_key.eks_secrets_key.arn
}
