variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "StreamForge"
}

variable "dynamodb_kms_key_arn" {
  description = "ARN of KMS CMK for DynamoDB Table Encryption"
  type        = string
}

variable "common_tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
