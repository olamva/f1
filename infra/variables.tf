variable "subscription_id" {
  type = string
}

variable "name" {
  type    = string
  default = "f1"
}

variable "location" {
  type    = string
  default = "norwayeast"
}

variable "image" {
  type    = string
  default = "mcr.microsoft.com/k8se/quickstart:latest"
}

variable "github_repository" {
  type    = string
  default = "olamva@93545174/f1@1385292032"
}

variable "allowed_emails" {
  type      = list(string)
  sensitive = true
}

variable "custom_domain" {
  type    = string
  default = ""
}

variable "google_client_id" {
  type    = string
  default = ""
}

variable "google_client_secret" {
  type      = string
  sensitive = true

  validation {
    condition     = length(trimspace(var.google_client_secret)) > 0 && var.google_client_secret != "unset"
    error_message = "Set google_client_secret to the Google OAuth client secret."
  }
}

variable "f1_origin" {
  type      = string
  sensitive = true
  default   = "https://livetiming.formula1.com"
}
