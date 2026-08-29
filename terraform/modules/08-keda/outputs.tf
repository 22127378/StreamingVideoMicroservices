output "keda_operator_role_arn" {
  description = "ARN of IAM Role used by KEDA Operator for SQS Metrics"
  value       = aws_iam_role.keda_operator.arn
}

output "keda_namespace" {
  description = "Kubernetes namespace where KEDA is deployed"
  value       = kubernetes_namespace.keda.metadata[0].name
}

output "keda_release_name" {
  description = "Helm release name for KEDA"
  value       = helm_release.keda.name
}
