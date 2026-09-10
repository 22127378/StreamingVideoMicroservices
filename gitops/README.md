# StreamForge GitOps - ArgoCD App-of-Apps

Thư mục này chứa toàn bộ cấu hình **GitOps** cho nền tảng StreamForge, quản lý bởi **ArgoCD** theo mô hình **App-of-Apps**.

---

## Cấu trúc thư mục

```
gitops/
├── root-app.yaml           # ArgoCD App-of-Apps (bootstrap entry point)
└── apps/
    ├── streamforge-base.yaml     # Child App -> k8s/base/ (Services, KEDA, Ingress)
    └── streamforge-rollouts.yaml # Child App -> k8s/rollouts/ (Canary Rollout)
```

---

## Quy trình Deployment (GitOps Flow)

```
git push
  -> GitHub Actions CI/CD (Milestone 6)
      -> Build Docker Image
      -> Scan with Trivy (0 Critical CVEs)
      -> Push to Amazon ECR
      -> kustomize edit set image streamforge-api=:<new-tag>
      -> git commit & push (updates k8s/base/kustomization.yaml)
  -> ArgoCD detects Git drift (auto-poll every 3 min or webhook)
      -> Syncs streamforge-base (wave 1): namespaces, services, KEDA
      -> Syncs streamforge-rollouts (wave 2): triggers Argo Rollout
  -> Argo Rollouts Canary Progression:
      -> 10% traffic -> canary pods  (2 min pause + AnalysisTemplate)
      -> 30% traffic -> canary pods  (5 min pause + AnalysisTemplate)
      -> 60% traffic -> canary pods  (5 min pause + AnalysisTemplate)
      -> 100% promote (auto) | rollback (if analysis fails)
```

---

## Bootstrap ArgoCD (chạy 1 lần khi mới setup EKS)

```bash
# 1. Cài ArgoCD vào EKS cluster
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 2. Cài Argo Rollouts controller
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts \
  -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# 3. Lấy ArgoCD admin password
kubectl get secret argocd-initial-admin-secret \
  -n argocd -o jsonpath="{.data.password}" | base64 -d

# 4. Cập nhật repoURL trong root-app.yaml và apps/*.yaml
#    (thay YOUR_ORG bằng GitHub username/org thực tế)

# 5. Bootstrap root App-of-Apps (chỉ cần apply 1 lần)
kubectl apply -f gitops/root-app.yaml

# -> ArgoCD sẽ tự phát hiện gitops/apps/*.yaml và tạo các child apps tự động
```

---

## Xem trạng thái Canary Rollout

```bash
# Xem trạng thái rollout
kubectl argo rollouts get rollout streamforge-api-rollout -n streamforge --watch

# Promote thủ công (bỏ qua pause, dùng khi cần deploy nhanh)
kubectl argo rollouts promote streamforge-api-rollout -n streamforge

# Abort và rollback về stable version
kubectl argo rollouts abort streamforge-api-rollout -n streamforge

# Xem AnalysisRun (kết quả kiểm tra tự động)
kubectl get analysisrun -n streamforge
```
