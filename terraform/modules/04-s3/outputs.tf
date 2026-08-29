output "raw_media_bucket_name" {
  description = "Name of S3 Raw Media Bucket"
  value       = aws_s3_bucket.raw_media.id
}

output "raw_media_bucket_arn" {
  description = "ARN of S3 Raw Media Bucket"
  value       = aws_s3_bucket.raw_media.arn
}

output "hls_delivery_bucket_name" {
  description = "Name of S3 HLS Delivery Bucket"
  value       = aws_s3_bucket.hls_delivery.id
}

output "hls_delivery_bucket_arn" {
  description = "ARN of S3 HLS Delivery Bucket"
  value       = aws_s3_bucket.hls_delivery.arn
}

output "hls_delivery_bucket_regional_domain_name" {
  description = "Regional Domain Name of S3 HLS Delivery Bucket for CloudFront Origin"
  value       = aws_s3_bucket.hls_delivery.bucket_regional_domain_name
}
