output "url" {
  value = "https://${azurerm_container_app.f1.ingress[0].fqdn}"
}

output "google_redirect_uris" {
  value = compact([
    "https://${azurerm_container_app.f1.ingress[0].fqdn}/.auth/login/google/callback",
    var.custom_domain == "" ? "" : "https://${var.custom_domain}/.auth/login/google/callback",
  ])
}

output "custom_domain_dns" {
  value = {
    cname = { name = "f1", value = azurerm_container_app.f1.ingress[0].fqdn }
    txt   = { name = "asuid.f1", value = azurerm_container_app_environment.f1.custom_domain_verification_id }
  }
}

output "github_variables" {
  value = {
    AZURE_CLIENT_ID       = azurerm_user_assigned_identity.deploy.client_id
    AZURE_TENANT_ID       = data.azurerm_client_config.current.tenant_id
    AZURE_SUBSCRIPTION_ID = var.subscription_id
    AZURE_RESOURCE_GROUP  = azurerm_resource_group.f1.name
    AZURE_CONTAINER_APP   = azurerm_container_app.f1.name
  }
}
