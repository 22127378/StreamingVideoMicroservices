variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "streamforge"
}

variable "oidc_provider_arn" {
  description = "ARN of EKS OIDC Provider"
  type        = string
}

variable "oidc_provider" {
  description = "URL of EKS OIDC Provider"
  type        = string
}

variable "sqs_transcode_queue_arn" {
  description = "ARN of SQS Transcode Queue monitored by KEDA"
  type        = string
}

variable "keda_chart_version" {
  description = "KEDA Helm Chart version"
  type        = string
  default     = "2.14.0"
}

variable "common_tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
