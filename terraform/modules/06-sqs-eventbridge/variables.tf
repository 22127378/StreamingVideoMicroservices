variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "streamforge"
}

variable "s3_raw_bucket_name" {
  description = "Name of the S3 Raw Media Bucket to listen for upload events"
  type        = string
}

variable "s3_kms_key_arn" {
  description = "ARN of KMS CMK for SQS Server-Side Encryption"
  type        = string
}

variable "common_tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
