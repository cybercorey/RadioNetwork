# GitHub Actions Workflows

## Docker Build and Push

### Overview
Automatically builds and publishes the backend Docker image to GitHub Container Registry (ghcr.io) whenever code is pushed to the `v2` or `master` branches.

### Workflow Triggers
- **Push to v2 or master**: When backend code changes
- **Release published**: On new releases
- **Manual trigger**: Via GitHub Actions UI

### What It Does
1. Builds the backend Docker image using `backend/Dockerfile.prod`
2. Pushes to `ghcr.io/cybercorey/radionetwork/backend`
3. Creates multiple tags:
   - `latest` (for v2 branch)
   - `v2` (branch name)
   - `v2-<commit-sha>` (commit SHA)
   - Semantic versions (for releases)
4. Supports multi-platform builds (amd64, arm64)

### Image Tags

| Tag | Description | Example |
|-----|-------------|---------|
| `latest` | Latest build from v2 branch | `ghcr.io/cybercorey/radionetwork/backend:latest` |
| `v2` | Latest build from v2 branch | `ghcr.io/cybercorey/radionetwork/backend:v2` |
| `v2-<sha>` | Specific commit | `ghcr.io/cybercorey/radionetwork/backend:v2-abc123` |
| `1.0.0` | Release version | `ghcr.io/cybercorey/radionetwork/backend:1.0.0` |

### Using the Image

#### Pull the latest image
```bash
docker pull ghcr.io/cybercorey/radionetwork/backend:latest
```

#### Use in docker-compose.yml
```yaml
services:
  api:
    image: ghcr.io/cybercorey/radionetwork/backend:latest
```

#### Pull specific version
```bash
docker pull ghcr.io/cybercorey/radionetwork/backend:v2-abc123
```

### Image Visibility

The Docker images are **public** by default. To view them:
1. Go to: https://github.com/cybercorey?tab=packages
2. Find "radionetwork/backend"

### Deployment

The `deploy-backend.sh` script automatically pulls the latest image:

```bash
# Pulls latest image and deploys
./deploy-backend.sh
```

### Manual Trigger

To manually trigger a build:
1. Go to: https://github.com/cybercorey/RadioNetwork/actions/workflows/docker-build.yml
2. Click "Run workflow"
3. Select branch (v2)
4. Click "Run workflow"

### Build Cache

The workflow uses GitHub Actions cache to speed up builds:
- First build: ~5-10 minutes
- Subsequent builds: ~2-3 minutes (with cache)

### Troubleshooting

#### Build fails with "permission denied"
- The workflow uses `GITHUB_TOKEN` which is automatically provided
- No additional secrets needed

#### Image not found when pulling
- Check package visibility at: https://github.com/cybercorey/RadioNetwork/pkgs/container/radionetwork%2Fbackend
- Ensure you're logged in: `docker login ghcr.io -u cybercorey`
- Images are public, so login shouldn't be required for pulling

#### Want to build locally instead?
Edit `docker-compose.backend.yml`:
```yaml
api:
  # Comment out the image line
  # image: ghcr.io/cybercorey/radionetwork/backend:latest

  # Uncomment the build section
  build:
    context: ./backend
    dockerfile: Dockerfile.prod
```

### Benefits

1. **Faster Deployments**: No need to build on your home server
2. **Multi-platform**: Supports both AMD64 and ARM64
3. **Version Control**: Each commit gets a unique tag
4. **Rollback Easy**: Can quickly switch to previous versions
5. **CI/CD Ready**: Automated builds on every push

### Future Enhancements

Potential additions:
- ✅ Security scanning with Trivy
- ✅ Automated tests before build
- ✅ Slack/Discord notifications
- ✅ Automated deployment to production
- ✅ Build status badges in README
