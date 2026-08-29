output "tf_state_bucket_name" {
  description = "Name of S3 bucket hosting Terraform remote state"
  value       = aws_s3_bucket.tf_state_bucket.id
}

output "tf_state_bucket_arn" {
  description = "ARN of S3 bucket hosting Terraform remote state"
  value       = aws_s3_bucket.tf_state_bucket.arn
}

output "tf_state_dynamodb_table" {
  description = "Name of DynamoDB table used for Terraform state locking"
  value       = aws_dynamodb_table.tf_state_locks.name
}

output "tf_kms_key_arn" {
  description = "ARN of KMS CMK used for encrypting Terraform state and locks"
  value       = aws_kms_key.tf_state_key.arn
}

output "tf_kms_key_id" {
  description = "Key ID of KMS CMK"
  value       = aws_kms_key.tf_state_key.key_id
}

output "backend_config_snippet" {
  description = "Copy-pasteable backend configuration snippet for Terraform environments"
  value       = <<-EOT
    terraform {
      backend "s3" {
        bucket         = "${aws_s3_bucket.tf_state_bucket.id}"
        key            = "environments/prod/terraform.tfstate"
        region         = "${var.aws_region}"
        dynamodb_table = "${aws_dynamodb_table.tf_state_locks.name}"
        encrypt        = true
        kms_key_id     = "${aws_kms_key.tf_state_key.arn}"
      }
    }
  EOT
}
