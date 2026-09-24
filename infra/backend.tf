terraform {
  backend "azurerm" {
    resource_group_name  = "banking-tfstate"
    storage_account_name = "bankingtfstateb401e2b8"
    container_name       = "tfstate"
    key                  = "f1.tfstate"
    use_azuread_auth     = true
  }
}
