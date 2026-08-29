# ==============================================================================
# StreamForge Infrastructure Outputs
# ==============================================================================

output "cloudfront_domain_name" {
  description = "Public URL for StreamForge Video Streaming Platform (CloudFront Edge)"
  value       = "https://${module.cloudfront.cloudfront_domain_name}"
}

output "eks_cluster_name" {
  description = "EKS Cluster Name for kubectl configuration"
  value       = module.eks.cluster_name
}

output "eks_kubeconfig_command" {
  description = "AWS CLI command to update local kubeconfig for the cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "s3_raw_bucket_name" {
  description = "S3 Raw Media Bucket Name"
  value       = module.s3.raw_media_bucket_name
}

output "s3_hls_bucket_name" {
  description = "S3 HLS Delivery Bucket Name"
  value       = module.s3.hls_delivery_bucket_name
}

output "sqs_transcode_queue_url" {
  description = "SQS Transcode Queue URL"
  value       = module.sqs_eventbridge.transcode_queue_url
}

output "sqs_transcode_dlq_url" {
  description = "SQS Transcode Dead-Letter Queue URL"
  value       = module.sqs_eventbridge.transcode_dlq_url
}

output "dynamodb_users_table" {
  description = "DynamoDB Users Table"
  value       = module.dynamodb.users_table_name
}

output "dynamodb_channels_table" {
  description = "DynamoDB Channels Table"
  value       = module.dynamodb.channels_table_name
}

output "dynamodb_streams_table" {
  description = "DynamoDB Streams Table"
  value       = module.dynamodb.streams_table_name
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS Name"
  value       = module.alb.alb_dns_name
}

output "signed_cookies_private_key_pem" {
  description = "Private Key for Backend API to sign CloudFront Signed Cookies (Sensitive)"
  value       = tls_private_key.cloudfront_signed_cookies.private_key_pem
  sensitive   = true
}

output "signed_cookies_key_pair_id" {
  description = "Key Pair ID for Signed Cookies"
  value       = module.cloudfront.signed_cookies_public_key_id
}
