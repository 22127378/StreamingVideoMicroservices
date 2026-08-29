output "users_table_name" {
  description = "Name of Users DynamoDB Table"
  value       = aws_dynamodb_table.users.name
}

output "users_table_arn" {
  description = "ARN of Users DynamoDB Table"
  value       = aws_dynamodb_table.users.arn
}

output "channels_table_name" {
  description = "Name of Channels DynamoDB Table"
  value       = aws_dynamodb_table.channels.name
}

output "channels_table_arn" {
  description = "ARN of Channels DynamoDB Table"
  value       = aws_dynamodb_table.channels.arn
}

output "streams_table_name" {
  description = "Name of Streams DynamoDB Table"
  value       = aws_dynamodb_table.streams.name
}

output "streams_table_arn" {
  description = "ARN of Streams DynamoDB Table"
  value       = aws_dynamodb_table.streams.arn
}

output "follows_table_name" {
  description = "Name of Follows DynamoDB Table"
  value       = aws_dynamodb_table.follows.name
}

output "follows_table_arn" {
  description = "ARN of Follows DynamoDB Table"
  value       = aws_dynamodb_table.follows.arn
}

output "tables_arn_pattern" {
  description = "ARN pattern matching all StreamForge DynamoDB tables"
  value       = "arn:aws:dynamodb:*:*:table/${var.project_name}_*"
}
