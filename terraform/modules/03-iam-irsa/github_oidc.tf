# ==============================================================================
# GitHub Actions OpenID Connect (OIDC) Integration
# Allows GitHub Actions to assume AWS IAM Roles without long-lived static keys
# ==============================================================================

resource "aws_iam_openid_connect_provider" "github_actions" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"] # Default GitHub OIDC thumbprint
}

resource "aws_iam_role" "github_actions_role" {
  name = "github-actions-oidc-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_actions.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            # TODO: User must replace "22127378/StreamingVideoMicroservices" with their GitHub username/repo
            "token.actions.githubusercontent.com:sub" : "repo:22127378/StreamingVideoMicroservices:*"
          }
        }
      }
    ]
  })
}

# Attach permissions to allow pushing images to ECR
resource "aws_iam_role_policy" "github_actions_ecr_policy" {
  name = "github-actions-ecr-push-policy"
  role = aws_iam_role.github_actions_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetRepositoryPolicy",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = "*" # Restrict to specific ECR ARNs in production
      }
    ]
  })
}

output "github_actions_role_arn" {
  description = "The ARN of the IAM Role for GitHub Actions"
  value       = aws_iam_role.github_actions_role.arn
}
