variable "cluster_name" {
   default 	= "taskflow-app-cluster"
   description = "Name of Cluster"
   type		= string
}

variable "vpc_cidr" {
  description   = "CIDR Block for VPC"
  type          = string
}

variable "public_cidrs" {
   description = "CIDRs of the two public subnets"
   type		= list(string)
}

variable "private_cidrs" {
   description = "CIDRs of the two private subnets"
   type		= list(string)
}

variable "availability_zones" {
   description = "Zones"
   type        = list(string)
}
