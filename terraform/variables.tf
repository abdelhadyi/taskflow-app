variable "cluster_name" {
   default     = "TaskFlow-App-Cluster"
   description = "Name of Cluster"
   type        = string
}

variable "vpc_cidr" {
  description   = "CIDR Block for VPC"
  type          = string
  default       = "10.0.0.0/16"
}

variable "public_cidrs" {
   description = "my two public subnets"
   type        = list(string)
   default     = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]
}

variable "private_cidrs" {
   description = "CIDRs of the two private subnets"
   type        = list(string)
   default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "availability_zones" {
   description = "Zones"
   type        = list(string)
   default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "node_groups" {
  description = "EKS node groups configuration"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    scaling_config = object({
      desired_size = number
      max_size     = number
      min_size     = number
    })
  }))

  default = {
    default = {
      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 2
        max_size     = 3
        min_size     = 2
      }
    }
  }
}
