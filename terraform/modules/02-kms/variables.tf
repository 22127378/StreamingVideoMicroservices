variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "streamforge"
}

variable "common_tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
