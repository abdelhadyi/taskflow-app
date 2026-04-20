output "private_cidrs" {
  value = var.private_cidrs
}

output "private_cidrs_id" {
  value = aws_subnet.private_subnet[*].id
}

output "cluster_name" {
  value = var.cluster_name
}

output "public_cidrs" {
  value = var.public_cidrs
}
