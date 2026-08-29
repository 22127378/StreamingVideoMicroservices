variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "streamforge"
}

variable "s3_kms_key_arn" {
  description = "ARN of KMS CMK for S3 Server-Side Encryption"
  type        = string
}

variable "cors_allowed_origins" {
  description = "List of allowed origins for S3 direct CORS uploads"
  type        = list(string)
  default     = ["http://localhost:5173", "http://localhost:3000", "https://*.cloudfront.net"]
}

variable "cloudfront_distribution_arn" {
  description = "ARN of CloudFront Distribution for OAC bucket policy (optional during initial bootstrap)"
  type        = string
  default     = ""
}

variable "common_tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
