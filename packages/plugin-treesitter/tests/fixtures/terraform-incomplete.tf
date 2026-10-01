variable "region" {
  default = "us-east-1"
}

resource "aws_instance" "unfinished" {
  lifecycle { prevent_destroy = true }

module "network"
