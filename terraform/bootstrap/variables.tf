variable "aws_region" {
  description = "AWS Region for Bootstrap resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project prefix for resource naming"
  type        = string
  default     = "streamforge"
}

variable "common_tags" {
  description = "Common resource tags"
  type        = map(string)
  default = {
    Project     = "StreamForge"
    Environment = "Bootstrap"
    ManagedBy   = "Terraform"
  }
}
