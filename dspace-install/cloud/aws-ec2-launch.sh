#!/usr/bin/env bash
# =============================================================================
# aws-ec2-launch.sh — Launch a Bulawayo Polytechnic DSpace server on AWS EC2
#
# Prerequisites:
#   - AWS CLI installed and configured (aws configure)
#   - Edit VARIABLES section below before running
#
# Usage: bash aws-ec2-launch.sh
# =============================================================================
set -euo pipefail

# ── Variables — edit these ────────────────────────────────────────────────────
AWS_REGION="af-south-1"           # Cape Town — closest to Zimbabwe
INSTANCE_TYPE="t3.xlarge"         # 4 vCPU, 16 GB RAM (minimum for DSpace 7)
AMI_ID=""                         # leave blank to auto-detect Ubuntu 22.04 LTS
KEY_NAME="bpoly-dspace-key"       # EC2 key pair name (must exist in AWS)
SECURITY_GROUP_NAME="bpoly-dspace-sg"
INSTANCE_NAME="BPoly-DSpace-IR"
VOLUME_SIZE_GB="120"              # Root EBS volume size
SUBNET_ID=""                      # leave blank to use default subnet
VPC_ID=""                         # leave blank to use default VPC
CLOUD_INIT_FILE="$(dirname "$0")/cloud-init.yml"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'

log()  { echo -e "${CYAN}[$(date '+%H:%M:%S')]${RESET} $*"; }
ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET} $*"; }

# ── Checks ────────────────────────────────────────────────────────────────────
command -v aws &>/dev/null || { echo "AWS CLI not installed. Run: pip3 install awscli"; exit 1; }
aws sts get-caller-identity &>/dev/null || { echo "AWS CLI not configured. Run: aws configure"; exit 1; }
[[ -f "$CLOUD_INIT_FILE" ]] || { echo "Missing cloud-init.yml at $CLOUD_INIT_FILE"; exit 1; }

log "Launching DSpace EC2 instance in $AWS_REGION..."

# ── Find latest Ubuntu 22.04 LTS AMI ─────────────────────────────────────────
if [[ -z "$AMI_ID" ]]; then
  log "Looking up latest Ubuntu 22.04 LTS AMI..."
  AMI_ID=$(aws ec2 describe-images \
    --region "$AWS_REGION" \
    --owners 099720109477 \
    --filters \
      "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
      "Name=state,Values=available" \
    --query "sort_by(Images,&CreationDate)[-1].ImageId" \
    --output text)
  ok "AMI: $AMI_ID"
fi

# ── Security Group ────────────────────────────────────────────────────────────
log "Creating security group '$SECURITY_GROUP_NAME'..."
SG_ID=$(aws ec2 describe-security-groups \
  --region "$AWS_REGION" \
  --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" \
  --query "SecurityGroups[0].GroupId" \
  --output text 2>/dev/null || echo "None")

if [[ "$SG_ID" == "None" || -z "$SG_ID" ]]; then
  VPC_OPTS=""
  [[ -n "$VPC_ID" ]] && VPC_OPTS="--vpc-id $VPC_ID"
  SG_ID=$(aws ec2 create-security-group \
    --region "$AWS_REGION" \
    --group-name "$SECURITY_GROUP_NAME" \
    --description "Bulawayo Polytechnic DSpace Institutional Repository" \
    $VPC_OPTS \
    --query "GroupId" --output text)

  aws ec2 authorize-security-group-ingress \
    --region "$AWS_REGION" --group-id "$SG_ID" \
    --ip-permissions \
      "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=0.0.0.0/0,Description=SSH}]" \
      "IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0,Description=HTTP}]" \
      "IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0,Description=HTTPS}]"
  ok "Security group created: $SG_ID"
else
  ok "Reusing existing security group: $SG_ID"
fi

# ── Launch instance ───────────────────────────────────────────────────────────
SUBNET_OPTS=""
[[ -n "$SUBNET_ID" ]] && SUBNET_OPTS="--subnet-id $SUBNET_ID"

log "Launching t3.xlarge instance..."
INSTANCE_ID=$(aws ec2 run-instances \
  --region "$AWS_REGION" \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  $SUBNET_OPTS \
  --block-device-mappings "[{
    \"DeviceName\":\"/dev/sda1\",
    \"Ebs\":{\"VolumeSize\":${VOLUME_SIZE_GB},\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}
  }]" \
  --user-data "file://$CLOUD_INIT_FILE" \
  --tag-specifications \
    "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME},{Key=Project,Value=BPolyDSpace},{Key=Environment,Value=production}]" \
  --query "Instances[0].InstanceId" \
  --output text)

ok "Instance launched: $INSTANCE_ID"

# ── Wait for running state ────────────────────────────────────────────────────
log "Waiting for instance to start (up to 3 min)..."
aws ec2 wait instance-running --region "$AWS_REGION" --instance-ids "$INSTANCE_ID"

PUBLIC_IP=$(aws ec2 describe-instances \
  --region "$AWS_REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text)

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${RESET}"
echo -e "${GREEN}  EC2 Instance Ready!${RESET}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${RESET}"
echo -e "  Instance ID:  $INSTANCE_ID"
echo -e "  Public IP:    $PUBLIC_IP"
echo -e "  Region:       $AWS_REGION"
echo ""
echo -e "${YELLOW}Next steps:${RESET}"
echo "  1. Point ir.bpoly.ac.zw A record → $PUBLIC_IP"
echo "  2. Wait ~45 min for DSpace to install (cloud-init runs automatically)"
echo "  3. Monitor: ssh ubuntu@$PUBLIC_IP 'tail -f /var/log/dspace-install.log'"
echo "  4. Once done, visit: https://ir.bpoly.ac.zw"
echo ""
warn "Remember to update the DB_PASSWORD in cloud-init.yml before re-deploying!"
