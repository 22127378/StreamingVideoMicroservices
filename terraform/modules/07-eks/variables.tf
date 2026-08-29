variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "streamforge"
}

variable "cluster_name" {
  description = "EKS Cluster Name"
  type        = string
  default     = "streamforge-eks-cluster"
}

variable "kubernetes_version" {
  description = "Kubernetes Version"
  type        = string
  default     = "1.30"
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for EKS worker nodes"
  type        = list(string)
}

variable "eks_secrets_kms_key_arn" {
  description = "KMS CMK ARN for EKS Secrets Envelope Encryption"
  type        = string
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "List of CIDR blocks that can access the EKS public API server endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "system_node_instance_types" {
  description = "EC2 Instance types for Core System Node Group"
  type        = list(string)
  default     = ["t3.medium", "t3a.medium"]
}

variable "spot_node_instance_types" {
  description = "EC2 Instance types for Spot Node Group (Compute optimized for FFmpeg)"
  type        = list(string)
  default     = ["c5.large", "c5a.large", "c6i.large", "m5.large"]
}

variable "spot_node_desired_size" {
  description = "Desired number of spot worker nodes"
  type        = number
  default     = 1
}

variable "common_tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
