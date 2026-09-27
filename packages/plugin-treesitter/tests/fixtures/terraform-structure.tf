terraform {
  required_version = ">= 1.5"
}

provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias = "west"
  region = "us-west-2"
}

module "network" {
  source = "./network"
}

variable "region" {
  default = "us-east-1"
}

output "region" {
  value = var.region
}

resource "aws_instance" "web" {
  lifecycle {
    prevent_destroy = true
  }
  provisioner "local-exec" {
    command = "echo web"
  }
}

data "aws_ami" "base" {
  most_recent = true
}

resource "aws_instance" "api_frontend" {
  ami = "ami-1"
}

resource "aws_instance" "api_frontend" {
  ami = "ami-2"
}

locals {
  service = "web"
  region_name = var.region
}

resource "aws_security_group" "web-sg" {
  ingress {
    from_port = 22
  }
  ingress {
    from_port = 443
  }
}
