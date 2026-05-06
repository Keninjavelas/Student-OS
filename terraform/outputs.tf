output "backend_url" {
  description = "Backend API endpoint"
  value       = var.cloud_provider == "aws" ? module.aws_backend[0].api_endpoint : var.cloud_provider == "azure" ? module.azure_backend[0].api_endpoint : module.gcp_backend[0].api_endpoint
  sensitive   = false
}

output "frontend_url" {
  description = "Frontend application URL"
  value       = var.cloud_provider == "aws" ? module.aws_frontend[0].cdn_domain_name : var.cloud_provider == "azure" ? module.azure_frontend[0].cdn_endpoint : module.gcp_frontend[0].cdn_domain_name
  sensitive   = false
}

output "ai_service_endpoint" {
  description = "AI service endpoint"
  value       = var.cloud_provider == "aws" ? module.aws_ai_service[0].service_endpoint : var.cloud_provider == "azure" ? module.azure_ai_service[0].service_endpoint : module.gcp_ai_service[0].service_endpoint
  sensitive   = false
}

output "mongodb_uri" {
  description = "MongoDB connection URI"
  value       = module.mongodb_atlas.connection_string
  sensitive   = true
}

output "storage_bucket_name" {
  description = "Object storage bucket name"
  value       = var.cloud_provider == "aws" ? aws_s3_bucket.frontend_assets[0].id : var.cloud_provider == "azure" ? azurerm_storage_account.frontend[0].name : google_storage_bucket.frontend[0].name
  sensitive   = false
}

output "database_name" {
  description = "Database name"
  value       = "student-os"
}

output "load_balancer_endpoint" {
  description = "Load balancer endpoint"
  value       = var.cloud_provider == "aws" ? module.aws_loadbalancer[0].endpoint : var.cloud_provider == "azure" ? module.azure_loadbalancer[0].endpoint : module.gcp_loadbalancer[0].endpoint
  sensitive   = false
}

output "monitoring_dashboard_url" {
  description = "URL to monitoring dashboard"
  value       = var.cloud_provider == "aws" ? "https://console.aws.amazon.com/cloudwatch/" : var.cloud_provider == "azure" ? "https://portal.azure.com/" : "https://console.cloud.google.com/monitoring/"
  sensitive   = false
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name (AWS only)"
  value       = var.cloud_provider == "aws" ? aws_cloudwatch_log_group.backend[0].name : null
  sensitive   = false
}

output "deployment_status" {
  description = "Deployment status summary"
  value = {
    environment           = var.environment
    region                = var.region
    cloud_provider        = var.cloud_provider
    backend_replicas      = var.backend_replicas
    ai_service_replicas   = var.ai_service_replicas
    autoscaling_enabled   = var.autoscaling_enabled
    cdn_enabled           = var.enable_cdn
    https_enabled         = var.enable_https
  }
}
