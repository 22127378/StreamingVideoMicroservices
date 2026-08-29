output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs (for EKS Nodes and Data)"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs"
  value       = aws_nat_gateway.nat[*].id
}

output "s3_endpoint_id" {
  description = "ID of the S3 VPC Gateway Endpoint"
  value       = aws_vpc_endpoint.s3.id
}

output "dynamodb_endpoint_id" {
  description = "ID of the DynamoDB VPC Gateway Endpoint"
  value       = aws_vpc_endpoint.dynamodb.id
}
