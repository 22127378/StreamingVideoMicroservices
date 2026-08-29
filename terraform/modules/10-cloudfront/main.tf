# ==============================================================================
# Module 10: CloudFront CDN with Signed Cookies & Origin Access Control (Layer 4)
# Provisions Global Edge Delivery for ABR HLS Video and Tier-Gated Playback
# ==============================================================================

# 1. CloudFront Origin Access Control (OAC) for S3 HLS Delivery Bucket
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "${var.project_name}-s3-hls-oac"
  description                       = "OAC for StreamForge S3 HLS Delivery Bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# 2. CloudFront Public Key & Key Group for Tier-Gated Signed Cookies / URLs
resource "aws_cloudfront_public_key" "signed_cookies_key" {
  name        = "${var.project_name}-signed-cookies-pubkey"
  encoded_key = var.cloudfront_public_key_pem
  comment     = "Public Key for verifying short-lived signed cookies for VIP / Sub stream playback"
}

resource "aws_cloudfront_key_group" "signed_cookies_group" {
  name    = "${var.project_name}-signed-cookies-keygroup"
  items   = [aws_cloudfront_public_key.signed_cookies_key.id]
  comment = "Key Group for tier-gated video playback access control"
}

# 3. CloudFront Distribution
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "StreamForge Global Edge Distribution (Video Streaming + API + Web)"
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # US & Europe edge nodes for cost efficiency

  # --- ORIGIN 1: S3 HLS Delivery Bucket (Video Streams & Playlists) ---
  origin {
    domain_name              = var.s3_hls_bucket_regional_domain_name
    origin_id                = "S3-HLSDelivery"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  # --- ORIGIN 2: Application Load Balancer (API, WebSockets, Frontend) ---
  origin {
    domain_name = var.alb_dns_name
    origin_id   = "ALB-StreamForge"

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "http-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_keepalive_timeout = 60
      origin_read_timeout      = 60
    }

    # Inject Secret Header to authenticate CloudFront to ALB
    custom_header {
      name  = "X-Origin-Verify"
      value = var.cloudfront_secret_header_value
    }
  }

  # --- CACHE BEHAVIOR 1: Tier-Gated VIP Video Playback (/hls/vip/*) ---
  ordered_cache_behavior {
    path_pattern     = "/hls/vip/*"
    target_origin_id = "S3-HLSDelivery"

    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    compress         = true

    # Tier-gated protection using CloudFront Signed Cookies
    trusted_key_groups = [aws_cloudfront_key_group.signed_cookies_group.id]

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 2 # Low TTL for live HLS manifests
    max_ttl                = 86400

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      cookies {
        forward = "none"
      }
    }
  }

  # --- CACHE BEHAVIOR 2: Standard HLS Video Streams (/hls/*) ---
  ordered_cache_behavior {
    path_pattern     = "/hls/*"
    target_origin_id = "S3-HLSDelivery"

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]
    compress        = true

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 2
    max_ttl                = 86400

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      cookies {
        forward = "none"
      }
    }
  }

  # --- CACHE BEHAVIOR 3: Backend REST API (/api/*) ---
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    target_origin_id = "ALB-StreamForge"

    allowed_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods  = ["GET", "HEAD"]
    compress        = true

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0

    forwarded_values {
      query_string = true
      headers      = ["*"] # Forward all headers (Authorization, Host, etc.)
      cookies {
        forward = "all"
      }
    }
  }

  # --- CACHE BEHAVIOR 4: WebSocket Connections (/ws*) ---
  ordered_cache_behavior {
    path_pattern     = "/ws*"
    target_origin_id = "ALB-StreamForge"

    allowed_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods  = ["GET", "HEAD"]

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "all"
      }
    }
  }

  # --- DEFAULT CACHE BEHAVIOR: Frontend Web Application (SPA) ---
  default_cache_behavior {
    target_origin_id = "ALB-StreamForge"

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]
    compress        = true

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  # SPA Routing Fallback for HTML5 PushState Router
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-cloudfront-cdn"
  })
}
