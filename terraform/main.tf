module "aws" {
   source             = "./modules/aws"
   cluster_name       = var.cluster_name 
   vpc_cidr           = var.vpc_cidr
   private_cidrs      = var.private_cidrs
   public_cidrs       = var.public_cidrs
   availability_zones = var.availability_zones
}


module "eks" {
   source    	      = "./modules/eks"
   cluster_name       = module.aws.cluster_name
   private_cidrs_id   = module.aws.private_cidrs_id
   node_groups        = var.node_groups
}
