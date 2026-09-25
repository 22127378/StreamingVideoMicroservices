# ==============================================================================
# StreamForge Production Environment (Root Orchestration)
# Connects 10 Terraform Modules across 5 Layers into a unified, zero-cost teardown platform
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Remote State configuration (Provisioned via Layer 0 Bootstrap)
  backend "s3" {
    bucket       = "streamforge-tf-state-037547369060-ap-southeast-1"
    key          = "environments/prod/terraform.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    encrypt      = true
    kms_key_id   = "arn:aws:kms:ap-southeast-1:037547369060:key/b2bc8613-020e-4700-866b-6797fa98fd2e"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = var.common_tags
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    command     = "aws"
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
      command     = "aws"
    }
  }
}

# Generate Secret Token for CloudFront -> ALB verification
resource "random_password" "origin_secret" {
  length  = 32
  special = false
}

# Generate RSA Key Pair for CloudFront Signed Cookies
resource "tls_private_key" "cloudfront_signed_cookies" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# ------------------------------------------------------------------------------
# LAYER 1: BASE NETWORK, KMS & IRSA
# ------------------------------------------------------------------------------

module "vpc" {
  source = "../../modules/01-vpc"

  aws_region          = var.aws_region
  project_name        = var.project_name
  cluster_name        = var.cluster_name
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs= var.private_subnet_cidrs
  single_nat_gateway  = var.single_nat_gateway
  common_tags         = var.common_tags
}

module "kms" {
  source = "../../modules/02-kms"

  project_name = var.project_name
  common_tags  = var.common_tags
}

module "iam_irsa" {
  source = "../../modules/03-iam-irsa"

  project_name                = var.project_name
  oidc_provider_arn           = module.eks.oidc_provider_arn
  oidc_provider               = module.eks.oidc_provider
  k8s_namespace               = var.k8s_namespace
  s3_raw_bucket_arn           = module.s3.raw_media_bucket_arn
  s3_hls_bucket_arn           = module.s3.hls_delivery_bucket_arn
  sqs_transcode_queue_arn     = module.sqs_eventbridge.transcode_queue_arn
  dynamodb_tables_arn_pattern = module.dynamodb.tables_arn_pattern
  s3_kms_key_arn              = module.kms.s3_kms_key_arn
  dynamodb_kms_key_arn        = module.kms.dynamodb_kms_key_arn
  common_tags                 = var.common_tags
}

# ------------------------------------------------------------------------------
# LAYER 2: STORAGE, DATABASE & EVENT-DRIVEN MESSAGING
# ------------------------------------------------------------------------------

module "s3" {
  source = "../../modules/04-s3"

  aws_region                 = var.aws_region
  project_name               = var.project_name
  s3_kms_key_arn             = module.kms.s3_kms_key_arn
  cloudfront_distribution_arn= module.cloudfront.cloudfront_distribution_arn
  common_tags                = var.common_tags
}

module "dynamodb" {
  source = "../../modules/05-dynamodb"

  project_name         = var.project_name
  dynamodb_kms_key_arn = module.kms.dynamodb_kms_key_arn
  common_tags          = var.common_tags
}

module "sqs_eventbridge" {
  source = "../../modules/06-sqs-eventbridge"

  project_name       = var.project_name
  s3_raw_bucket_name = module.s3.raw_media_bucket_name
  s3_kms_key_arn     = module.kms.s3_kms_key_arn
  common_tags        = var.common_tags
}

# ------------------------------------------------------------------------------
# LAYER 3: COMPUTE (EKS SPOT) & KEDA AUTOSCALING
# ------------------------------------------------------------------------------

module "eks" {
  source = "../../modules/07-eks"

  project_name            = var.project_name
  cluster_name            = var.cluster_name
  kubernetes_version      = var.kubernetes_version
  public_subnet_ids       = module.vpc.public_subnet_ids
  private_subnet_ids      = module.vpc.private_subnet_ids
  eks_secrets_kms_key_arn = module.kms.eks_secrets_kms_key_arn
  common_tags             = var.common_tags
}

module "keda" {
  source = "../../modules/08-keda"

  project_name            = var.project_name
  oidc_provider_arn       = module.eks.oidc_provider_arn
  oidc_provider           = module.eks.oidc_provider
  sqs_transcode_queue_arn = module.sqs_eventbridge.transcode_queue_arn
  common_tags             = var.common_tags
}

# ------------------------------------------------------------------------------
# LAYER 4: INGRESS & GLOBAL EDGE CDN
# ------------------------------------------------------------------------------

module "alb" {
  source = "../../modules/09-alb"

  project_name                   = var.project_name
  vpc_id                         = module.vpc.vpc_id
  public_subnet_ids              = module.vpc.public_subnet_ids
  cloudfront_secret_header_value = random_password.origin_secret.result
  common_tags                    = var.common_tags
}

module "cloudfront" {
  source = "../../modules/10-cloudfront"

  project_name                       = var.project_name
  s3_hls_bucket_regional_domain_name = module.s3.hls_delivery_bucket_regional_domain_name
  alb_dns_name                       = module.alb.alb_dns_name
  cloudfront_secret_header_value     = random_password.origin_secret.result
  cloudfront_public_key_pem          = tls_private_key.cloudfront_signed_cookies.public_key_pem
  common_tags                        = var.common_tags
}
