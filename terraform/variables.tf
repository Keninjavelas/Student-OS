variable "cloud_provider" {
  description = "Cloud provider to use (aws, azure, gcp)"
  type        = string
  default     = "aws"
  validation {
    condition     = contains(["aws", "azure", "gcp"], var.cloud_provider)
    error_message = "Cloud provider must be one of: aws, azure, gcp"
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "region" {
  description = "Cloud region/location"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "student-os"
}

# ============================================
# BACKEND CONFIGURATION
# ============================================

variable "backend_container_image" {
  description = "Backend Docker image URI"
  type        = string
  default     = "student-os-backend:latest"
}

variable "backend_port" {
  description = "Backend application port"
  type        = number
  default     = 5000
}

variable "backend_replicas" {
  description = "Number of backend replicas"
  type        = number
  default     = 2
  validation {
    condition     = var.backend_replicas >= 1 && var.backend_replicas <= 10
    error_message = "Replicas must be between 1 and 10"
  }
}

variable "backend_cpu" {
  description = "Backend CPU request (millicores)"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Backend memory request (MB)"
  type        = number
  default     = 512
}

# ============================================
# AI SERVICE CONFIGURATION
# ============================================

variable "ai_service_container_image" {
  description = "AI service Docker image URI"
  type        = string
  default     = "student-os-ai:latest"
}

variable "ai_service_port" {
  description = "AI service port"
  type        = number
  default     = 8000
}

variable "ai_service_replicas" {
  description = "Number of AI service replicas"
  type        = number
  default     = 1
  validation {
    condition     = var.ai_service_replicas >= 1 && var.ai_service_replicas <= 5
    error_message = "AI service replicas must be between 1 and 5"
  }
}

variable "ai_service_cpu" {
  description = "AI service CPU request (millicores)"
  type        = number
  default     = 512
}

variable "ai_service_memory" {
  description = "AI service memory request (MB)"
  type        = number
  default     = 1024
}

# ============================================
# DATABASE CONFIGURATION
# ============================================

variable "mongodb_atlas_org_id" {
  description = "MongoDB Atlas organization ID"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_api_public_key" {
  description = "MongoDB Atlas API public key"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_api_private_key" {
  description = "MongoDB Atlas API private key"
  type        = string
  sensitive   = true
}

variable "mongodb_cluster_name" {
  description = "MongoDB cluster name"
  type        = string
  default     = "student-os-cluster"
}

variable "mongodb_instance_size" {
  description = "MongoDB instance size (M0, M5, M10, etc.)"
  type        = string
  default     = "M5"
  validation {
    condition     = contains(["M0", "M5", "M10", "M20", "M30"], var.mongodb_instance_size)
    error_message = "Instance size must be one of: M0, M5, M10, M20, M30"
  }
}

# ============================================
# STORAGE CONFIGURATION
# ============================================

variable "storage_bucket_name" {
  description = "Object storage bucket name"
  type        = string
  default     = ""  # Leave empty for auto-generation
}

variable "enable_cdn" {
  description = "Enable CDN for static assets"
  type        = bool
  default     = true
}

variable "cdn_ttl" {
  description = "CDN TTL in seconds"
  type        = number
  default     = 3600
}

# ============================================
# NETWORKING CONFIGURATION
# ============================================

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnet outbound traffic"
  type        = bool
  default     = true
}

variable "allowed_ingress_cidrs" {
  description = "CIDR blocks allowed for ingress"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# ============================================
# SECURITY CONFIGURATION
# ============================================

variable "jwt_access_secret" {
  description = "JWT access token secret"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret"
  type        = string
  sensitive   = true
}

variable "ai_service_secret" {
  description = "AI service API secret"
  type        = string
  sensitive   = true
}

variable "cors_origin" {
  description = "CORS allowed origins"
  type        = string
  default     = "http://localhost:3000"
}

variable "enable_https" {
  description = "Enable HTTPS/TLS"
  type        = bool
  default     = true
}

variable "certificate_arn" {
  description = "AWS ACM certificate ARN (for AWS provider)"
  type        = string
  default     = ""
}

# ============================================
# OBSERVABILITY CONFIGURATION
# ============================================

variable "enable_monitoring" {
  description = "Enable CloudWatch/Stackdriver monitoring"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Log retention in days"
  type        = number
  default     = 30
  validation {
    condition     = var.log_retention_days > 0
    error_message = "Log retention must be greater than 0"
  }
}

variable "enable_alerting" {
  description = "Enable alerting for monitoring"
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = ""
}

# ============================================
# SCALING CONFIGURATION
# ============================================

variable "autoscaling_enabled" {
  description = "Enable autoscaling"
  type        = bool
  default     = true
}

variable "autoscaling_min_replicas" {
  description = "Minimum number of replicas for autoscaling"
  type        = number
  default     = 1
}

variable "autoscaling_max_replicas" {
  description = "Maximum number of replicas for autoscaling"
  type        = number
  default     = 10
}

variable "autoscaling_target_cpu" {
  description = "Target CPU percentage for autoscaling"
  type        = number
  default     = 70
  validation {
    condition     = var.autoscaling_target_cpu > 0 && var.autoscaling_target_cpu < 100
    error_message = "Target CPU must be between 0 and 100"
  }
}
