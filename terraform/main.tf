terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Uncomment for remote state management (Terraform Cloud, S3, Azure Storage, etc.)
  # cloud {
  #   organization = "your-org"
  #   workspaces {
  #     name = "student-os"
  #   }
  # }
}

# ============================================
# LOCAL VARIABLES
# ============================================

locals {
  app_name = "student-os"
  environment = var.environment
  tags = {
    Application = local.app_name
    Environment = local.environment
    ManagedBy   = "Terraform"
    CreatedAt   = timestamp()
  }
}
