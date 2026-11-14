# SYNTHETIC MOCK TERRAFORM CONFIGURATION FOR DEMO PURPOSES ONLY
# This file is used to demonstrate IaC misconfiguration detection by Checkov.

terraform {
  required_version = ">= 1.5.0"
}

provider "aws" {
  region = "us-east-1"
}

# Misconfigured overprivileged role granting full S3 wildcard admin
resource "aws_iam_role" "staging_deployer" {
  name = "staging_deployer_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:user/staging-ci-bot"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "wildcard_s3_access" {
  name = "staging_wildcard_s3_policy"
  role = aws_iam_role.staging_deployer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "s3:*"
        Resource = "*"
      }
    ]
  })
}
