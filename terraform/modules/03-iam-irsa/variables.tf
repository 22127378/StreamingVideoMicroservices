variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "streamforge"
}

variable "oidc_provider_arn" {
  description = "ARN of the EKS OIDC Provider"
  type        = string
}

variable "oidc_provider" {
  description = "URL of the EKS OIDC Provider (without https://)"
  type        = string
}

variable "k8s_namespace" {
  description = "Kubernetes Namespace for StreamForge workloads"
  type        = string
  default     = "streamforge"
}

variable "api_service_account_name" {
  description = "Kubernetes Service Account name for API service"
  type        = string
  default     = "streamforge-api-sa"
}

variable "worker_service_account_name" {
  description = "Kubernetes Service Account name for Transcoder Worker"
  type        = string
  default     = "streamforge-worker-sa"
}

variable "media_service_account_name" {
  description = "Kubernetes Service Account name for Media Ingest"
  type        = string
  default     = "streamforge-media-sa"
}

variable "s3_raw_bucket_arn" {
  description = "ARN of S3 Raw Media Bucket"
  type        = string
}

variable "s3_hls_bucket_arn" {
  description = "ARN of S3 HLS Delivery Bucket"
  type        = string
}

variable "sqs_transcode_queue_arn" {
  description = "ARN of SQS Transcode Queue"
  type        = string
}

variable "dynamodb_tables_arn_pattern" {
  description = "ARN pattern for StreamForge DynamoDB tables"
  type        = string
}

variable "s3_kms_key_arn" {
  description = "ARN of KMS Key for S3"
  type        = string
}

variable "dynamodb_kms_key_arn" {
  description = "ARN of KMS Key for DynamoDB"
  type        = string
}

variable "common_tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
