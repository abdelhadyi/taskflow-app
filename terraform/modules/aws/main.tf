resource "aws_vpc" "my_vpc" {
  cidr_block       = var.vpc_cidr

  tags = {
    Name = "cluster_vpc"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}

resource "aws_subnet" "public_subnet" {
  count	            = length(var.public_cidrs)
  vpc_id   	    = aws_vpc.my_vpc.id
  cidr_block 	    = var.public_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]
  map_public_ip_on_launch   = true
  
  tags = {
    Name = "${var.cluster_name}_public_subnet"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    "kubernetes.io/role/elb" = "1"
  }
}



resource "aws_subnet" "private_subnet" {
  count	            = length(var.private_cidrs)
  vpc_id   	    = aws_vpc.my_vpc.id
  cidr_block 	    = var.private_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.cluster_name}_private_subnet"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    "kubernetes.io/role/internal-elb" = "1"
  }
}



resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.my_vpc.id

  tags = {
    Name = "${var.cluster_name}-IGW"
  }
}



resource "aws_route_table" "my_route_table_public" {
  vpc_id = aws_vpc.my_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "${var.cluster_name}-route-table-public"
  }
}


resource "aws_route_table_association" "rt-subnet-public" {
  count 	 = length(var.public_cidrs)
  subnet_id      = aws_subnet.public_subnet[count.index].id
  route_table_id = aws_route_table.my_route_table_public.id
}


resource "aws_eip" "eip" {
  domain   = "vpc"
}


resource "aws_nat_gateway" "nat_gw" {
  allocation_id = aws_eip.eip.id
  subnet_id     = aws_subnet.public_subnet[0].id

  tags = {
    Name = "${var.cluster_name}-NAT-GW"
  }

  depends_on = [aws_internet_gateway.igw]
}



resource "aws_route_table" "my_route_table_private" {
  vpc_id = aws_vpc.my_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_nat_gateway.nat_gw.id
  }

  tags = {
    Name = "${var.cluster_name}-route-table-private"
  }
}



resource "aws_route_table_association" "rt-subnet-private" {
  count 	 = length(var.private_cidrs)
  subnet_id      = aws_subnet.private_subnet[count.index].id
  route_table_id = aws_route_table.my_route_table_private.id
}
