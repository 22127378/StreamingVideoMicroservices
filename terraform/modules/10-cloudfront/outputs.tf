output "cloudfront_distribution_id" {
  description = "ID of the CloudFront Distribution"
  value       = aws_cloudfront_distribution.cdn.id
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront Distribution"
  value       = aws_cloudfront_distribution.cdn.arn
}

output "cloudfront_domain_name" {
  description = "Public Domain Name of the CloudFront Distribution (e.g. d111111abcdef8.cloudfront.net)"
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "signed_cookies_key_group_id" {
  description = "ID of the CloudFront Key Group used for Signed Cookies"
  value       = aws_cloudfront_key_group.signed_cookies_group.id
}

output "signed_cookies_public_key_id" {
  description = "ID of the CloudFront Public Key used for Signed Cookies"
  value       = aws_cloudfront_public_key.signed_cookies_key.id
}
