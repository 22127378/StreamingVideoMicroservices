output "cluster_name" {
  description = "Name of the EKS Cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_id" {
  description = "ID of the EKS Cluster"
  value       = aws_eks_cluster.main.id
}

output "cluster_arn" {
  description = "ARN of the EKS Cluster"
  value       = aws_eks_cluster.main.arn
}

output "cluster_endpoint" {
  description = "API Endpoint for the EKS Cluster"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "oidc_provider_arn" {
  description = "ARN of the IAM OIDC Provider for IRSA"
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "oidc_provider" {
  description = "URL of the IAM OIDC Provider (without https://) for IRSA conditions"
  value       = replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")
}

output "cluster_security_group_id" {
  description = "Security Group ID attached to the EKS Cluster control plane"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}
