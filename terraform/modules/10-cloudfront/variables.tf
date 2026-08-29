variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "streamforge"
}

variable "s3_hls_bucket_regional_domain_name" {
  description = "Regional domain name of S3 HLS Delivery bucket"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  type        = string
}

variable "cloudfront_secret_header_value" {
  description = "Secret token injected by CloudFront to ALB for X-Origin-Verify"
  type        = string
  sensitive   = true
}

variable "cloudfront_public_key_pem" {
  description = "PEM encoded RSA Public Key for CloudFront Signed Cookies verification"
  type        = string
}

variable "common_tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
