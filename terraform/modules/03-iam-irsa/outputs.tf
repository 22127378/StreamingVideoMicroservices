output "api_role_arn" {
  description = "ARN of IAM Role for Backend API Pods"
  value       = aws_iam_role.api_role.arn
}

output "worker_role_arn" {
  description = "ARN of IAM Role for FFmpeg Transcoder Worker Pods"
  value       = aws_iam_role.worker_role.arn
}

output "media_role_arn" {
  description = "ARN of IAM Role for Media Ingest Pods"
  value       = aws_iam_role.media_role.arn
}
