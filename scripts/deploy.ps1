# =============================================================================
# StreamForge - Build, Push & Deploy Script
# Chạy script này sau khi Docker Desktop đã khởi động xong
# =============================================================================

$ECR_REGISTRY = "037547369060.dkr.ecr.ap-southeast-1.amazonaws.com"
$REGION       = "ap-southeast-1"
$CLUSTER      = "streamforge-eks-cluster"
$NAMESPACE    = "streamforge"

Write-Host "`n[1/5] Login ECR..." -ForegroundColor Cyan
$password = aws ecr get-login-password --region $REGION
docker login --username AWS --password $password $ECR_REGISTRY
if ($LASTEXITCODE -ne 0) { Write-Host "ECR login failed!" -ForegroundColor Red; exit 1 }

Write-Host "`n[2/5] Build & Push API image..." -ForegroundColor Cyan
docker build -t "$ECR_REGISTRY/streamforge/api:latest" src\api
if ($LASTEXITCODE -ne 0) { Write-Host "API build failed!" -ForegroundColor Red; exit 1 }
docker push "$ECR_REGISTRY/streamforge/api:latest"
if ($LASTEXITCODE -ne 0) { Write-Host "API push failed!" -ForegroundColor Red; exit 1 }
Write-Host "API image pushed!" -ForegroundColor Green

Write-Host "`n[3/5] Build & Push Transcoder Worker image..." -ForegroundColor Cyan
docker build -t "$ECR_REGISTRY/streamforge/transcoder-worker:latest" src\transcoder-worker
if ($LASTEXITCODE -ne 0) { Write-Host "Transcoder build failed!" -ForegroundColor Red; exit 1 }
docker push "$ECR_REGISTRY/streamforge/transcoder-worker:latest"
if ($LASTEXITCODE -ne 0) { Write-Host "Transcoder push failed!" -ForegroundColor Red; exit 1 }
Write-Host "Transcoder image pushed!" -ForegroundColor Green

Write-Host "`n[4/5] Update kubeconfig & create namespace..." -ForegroundColor Cyan
aws eks update-kubeconfig --region $REGION --name $CLUSTER
kubectl apply -f k8s/base/namespace.yaml

Write-Host "`n[4b] Create Kubernetes Secret..." -ForegroundColor Cyan
$JWT_SECRET = -join ((1..64) | ForEach-Object { '{0:X2}' -f (Get-Random -Max 256) })

kubectl create secret generic streamforge-secrets `
  --namespace=$NAMESPACE `
  --from-literal=JWT_SECRET="$JWT_SECRET" `
  --from-literal=X_ORIGIN_VERIFY_SECRET="streamforge-origin-secret" `
  --from-literal=CLOUDFRONT_KEY_PAIR_ID="K2G3V6F8NPDEVS" `
  --from-literal=CLOUDFRONT_PRIVATE_KEY="placeholder" `
  --dry-run=client -o yaml | kubectl apply -f -

Write-Host "`n[5/5] Apply K8s manifests..." -ForegroundColor Cyan
kubectl apply -f k8s/base/configmap-and-secret.yaml
kubectl apply -f k8s/base/api-deployment.yaml
kubectl apply -f k8s/base/api-service.yaml

Write-Host "`n=== Checking deployment status ===" -ForegroundColor Yellow
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE

Write-Host "`n=== DONE! ===" -ForegroundColor Green
Write-Host "CloudFront URL: https://d17c0kiwp2waq7.cloudfront.net" -ForegroundColor Green
Write-Host "ALB URL: streamforge-alb-1751074764.ap-southeast-1.elb.amazonaws.com" -ForegroundColor Green
