variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "streamforge"
}

variable "vpc_id" {
  description = "VPC ID where ALB is deployed"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB"
  type        = list(string)
}

variable "cloudfront_secret_header_value" {
  description = "Secret value for X-Origin-Verify header to prevent direct ALB bypass"
  type        = string
  sensitive   = true
}

variable "common_tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
