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
  default = "olamva/f1"
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
  default   = ""
}
