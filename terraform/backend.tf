terraform {
  backend "s3" {
    bucket = "abdelhadii-bucket-2026"
    key    = "eks/terraform.tfstate"
    region = "us-east-1"
    dynamodb_table = "abdelhadii-table"
    encrypt = true
  }
}
