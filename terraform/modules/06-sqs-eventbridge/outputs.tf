output "transcode_queue_url" {
  description = "URL of the primary SQS Transcode Queue"
  value       = aws_sqs_queue.transcode_queue.id
}

output "transcode_queue_arn" {
  description = "ARN of the primary SQS Transcode Queue"
  value       = aws_sqs_queue.transcode_queue.arn
}

output "transcode_queue_name" {
  description = "Name of the primary SQS Transcode Queue (for KEDA ScaledObject)"
  value       = aws_sqs_queue.transcode_queue.name
}

output "transcode_dlq_url" {
  description = "URL of the SQS Dead-Letter Queue"
  value       = aws_sqs_queue.transcode_dlq.id
}

output "transcode_dlq_arn" {
  description = "ARN of the SQS Dead-Letter Queue"
  value       = aws_sqs_queue.transcode_dlq.arn
}

output "eventbridge_rule_arn" {
  description = "ARN of the EventBridge Rule for S3 Uploads"
  value       = aws_cloudwatch_event_rule.s3_upload_rule.arn
}
