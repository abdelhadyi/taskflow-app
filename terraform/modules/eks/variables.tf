variable "cluster_name" {
   type = string
}

variable "private_cidrs_id" {
   description = "CIDRs of the two private subnets"
   type         = list(string)
}


variable "node_groups" {
  description   = "EKS node groups configuration"
  type          = map(object({
    instance_types = list(string)
    capacity_type  = string
    scaling_config = object({
      desired_size = number
      max_size     = number
      min_size     = number
    })
  }))
}
