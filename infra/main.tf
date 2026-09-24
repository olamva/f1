terraform {
  required_version = ">= 1.9"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

provider "azapi" {}

data "azurerm_client_config" "current" {}

locals {
  digest   = substr(sha1(var.subscription_id), 0, 6)
  sessions = jsondecode(file("${path.module}/sessions.json"))
}

resource "azurerm_resource_group" "f1" {
  name     = var.name
  location = var.location
}

resource "azurerm_container_app_environment" "f1" {
  name                = var.name
  resource_group_name = azurerm_resource_group.f1.name
  location            = azurerm_resource_group.f1.location
  logs_destination    = "azure-monitor"
}

resource "azurerm_key_vault" "f1" {
  name                       = "${var.name}-vault-${local.digest}"
  resource_group_name        = azurerm_resource_group.f1.name
  location                   = azurerm_resource_group.f1.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  rbac_authorization_enabled = true
}

resource "azurerm_user_assigned_identity" "app" {
  name                = "${var.name}-app"
  resource_group_name = azurerm_resource_group.f1.name
  location            = azurerm_resource_group.f1.location
}

resource "azurerm_role_assignment" "app_secrets" {
  scope                = azurerm_key_vault.f1.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

resource "azurerm_container_app" "f1" {
  name                         = var.name
  resource_group_name          = azurerm_resource_group.f1.name
  container_app_environment_id = azurerm_container_app_environment.f1.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  secret {
    name  = "google-client-secret"
    value = var.google_client_secret == "" ? "unset" : var.google_client_secret
  }

  secret {
    name  = "f1-origin"
    value = var.f1_origin
  }

  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas               = 0
    max_replicas               = 1
    cooldown_period_in_seconds = 3600

    http_scale_rule {
      name                = "http"
      concurrent_requests = "50"
    }

    dynamic "custom_scale_rule" {
      for_each = local.sessions
      content {
        name             = custom_scale_rule.value.name
        custom_rule_type = "cron"
        metadata = {
          timezone        = "Etc/UTC"
          start           = custom_scale_rule.value.start
          end             = custom_scale_rule.value.end
          desiredReplicas = "1"
        }
      }
    }

    container {
      name   = "web"
      image  = var.image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "PORT"
        value = "80"
      }
      env {
        name  = "AZURE_CLIENT_ID"
        value = azurerm_user_assigned_identity.app.client_id
      }
      env {
        name  = "KEY_VAULT_NAME"
        value = azurerm_key_vault.f1.name
      }
      env {
        name        = "F1_ORIGIN"
        secret_name = "f1-origin"
      }
      env {
        name  = "ALLOWED_EMAILS"
        value = join(",", var.allowed_emails)
      }
    }
  }

  depends_on = [azurerm_role_assignment.app_secrets]

  lifecycle {
    ignore_changes = [template[0].container[0].image]
  }
}

resource "azapi_resource" "auth" {
  count     = var.google_client_id == "" ? 0 : 1
  type      = "Microsoft.App/containerApps/authConfigs@2024-03-01"
  name      = "current"
  parent_id = azurerm_container_app.f1.id

  body = {
    properties = {
      platform = {
        enabled = true
      }
      globalValidation = {
        unauthenticatedClientAction = "AllowAnonymous"
      }
      identityProviders = {
        google = {
          enabled = true
          registration = {
            clientId                = var.google_client_id
            clientSecretSettingName = "google-client-secret"
          }
          login = {
            scopes = ["openid", "email"]
          }
        }
      }
    }
  }
}

resource "azurerm_container_app_custom_domain" "f1" {
  count = var.custom_domain == "" ? 0 : 1

  name                     = var.custom_domain
  container_app_id         = azurerm_container_app.f1.id
  certificate_binding_type = "Auto"

  lifecycle {
    ignore_changes = [certificate_binding_type, container_app_environment_certificate_id]
  }
}

resource "azurerm_container_app_environment_managed_certificate" "f1" {
  count = var.custom_domain == "" ? 0 : 1

  name                         = replace(var.custom_domain, ".", "-")
  container_app_environment_id = azurerm_container_app_environment.f1.id
  subject_name                 = var.custom_domain
  domain_control_validation    = "CNAME"

  depends_on = [azurerm_container_app_custom_domain.f1]
}

resource "azurerm_user_assigned_identity" "deploy" {
  name                = "${var.name}-deploy"
  resource_group_name = azurerm_resource_group.f1.name
  location            = azurerm_resource_group.f1.location
}

resource "azurerm_federated_identity_credential" "github" {
  name                = "github-main"
  resource_group_name = azurerm_resource_group.f1.name
  parent_id           = azurerm_user_assigned_identity.deploy.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = "repo:${var.github_repository}:ref:refs/heads/main"
}

resource "azurerm_role_assignment" "deploy" {
  scope                = azurerm_container_app.f1.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.deploy.principal_id
}
