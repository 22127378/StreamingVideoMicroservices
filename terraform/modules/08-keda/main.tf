# ==============================================================================
# Module 08: KEDA (Kubernetes Event-driven Autoscaling) (Layer 3)
# Provisions KEDA Helm Chart & IRSA Role to enable Scale-to-Zero on SQS Queue Depth
# ==============================================================================

# 1. IAM Role for KEDA Operator (IRSA) to read SQS Metrics
resource "aws_iam_role" "keda_operator" {
  name = "${var.project_name}-keda-operator-irsa-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.oidc_provider}:sub" = "system:serviceaccount:keda:keda-operator"
            "${var.oidc_provider}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-keda-operator-role"
  })
}

resource "aws_iam_policy" "keda_sqs_policy" {
  name        = "${var.project_name}-keda-sqs-metrics-policy"
  description = "Allows KEDA to query SQS Queue Attributes for queue depth autoscaling"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "QuerySQSQueueLength"
        Effect = "Allow"
        Action = [
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = var.sqs_transcode_queue_arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "keda_attach" {
  role       = aws_iam_role.keda_operator.name
  policy_arn = aws_iam_policy.keda_sqs_policy.arn
}

# 2. Kubernetes Namespace for KEDA
resource "kubernetes_namespace" "keda" {
  metadata {
    name = "keda"
    labels = {
      "app.kubernetes.io/name" = "keda"
    }
  }
}

# 3. KEDA Helm Release
resource "helm_release" "keda" {
  name       = "keda"
  repository = "https://kedacore.github.io/charts"
  chart      = "keda"
  version    = var.keda_chart_version
  namespace  = kubernetes_namespace.keda.metadata[0].name

  timeout = 600 # 10 minutes
  wait    = true
  atomic  = false

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.keda_operator.arn
  }

  set {
    name  = "operator.name"
    value = "keda-operator"
  }

  set {
    name  = "watchNamespace"
    value = "" # Cluster-wide
  }

  depends_on = [
    aws_iam_role_policy_attachment.keda_attach,
    kubernetes_namespace.keda
  ]
}
