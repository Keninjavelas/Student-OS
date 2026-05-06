# Production Deployment Checklist

## Pre-Deployment

### Code Quality & Testing
- [ ] All tests pass locally: `npm test` (backend), `npm test` (frontend), `pytest` (AI)
- [ ] Linting passes: `npm run lint` (backend/frontend)
- [ ] No security vulnerabilities: `npm audit` (backend/frontend)
- [ ] Code review completed and approved
- [ ] CHANGELOG.md updated with new features/fixes
- [ ] Documentation updated if needed

### Environment & Configuration
- [ ] All required environment variables defined (check .env.example)
- [ ] Secrets stored in Secret Manager (not in code)
- [ ] Database connection string tested and working
- [ ] API endpoints configured correctly (CORS origins, etc.)
- [ ] Logging level set appropriately (info for prod, debug for staging)
- [ ] Monitoring dashboard URLs prepared

### Infrastructure & DevOps
- [ ] Terraform plan reviewed and approved
- [ ] Container images built and pushed to registry
- [ ] DNS records prepared/updated
- [ ] SSL/TLS certificates configured
- [ ] Load balancer rules configured
- [ ] Database backups enabled and tested
- [ ] Storage bucket policies configured
- [ ] CDN cache settings configured

### Security & Access
- [ ] IAM roles/policies reviewed for least privilege
- [ ] Network security groups/NSGs configured
- [ ] Firewall rules implemented
- [ ] API rate limiting tested
- [ ] CORS policy validated
- [ ] CSRF tokens working
- [ ] Authentication/authorization flows tested

## Deployment

### Terraform Deployment
```bash
cd terraform

# Initialize if first time
terraform init -backend-config="bucket=your-bucket"

# Validate configuration
terraform validate

# Plan deployment
terraform plan -var-file="terraform.tfvars" -out=tfplan

# Review plan output carefully
# Approve if safe

# Apply changes
terraform apply tfplan

# Verify outputs
terraform output -json
```

### Container Deployment
- [ ] Images pulled from correct registry
- [ ] Images scanned for vulnerabilities
- [ ] Deployments with proper health checks
- [ ] Rolling updates configured (no downtime)
- [ ] Resource limits set (CPU, memory)
- [ ] Autoscaling policies verified

### Database Migration (if needed)
- [ ] Backup taken before migration
- [ ] Migration script tested on staging
- [ ] Rollback procedure documented
- [ ] Migration monitoring active
- [ ] Post-migration validation completed

## Post-Deployment

### Smoke Tests (Automated)
- [ ] Backend health check passes: `/health` returns 200
- [ ] Database connectivity verified: `/ready` returns 200
- [ ] Frontend assets accessible and cached
- [ ] API authentication working
- [ ] AI service responding to requests

### Manual Verification
- [ ] Login flow works (student + admin)
- [ ] Create/read/update operations work
- [ ] File uploads function correctly
- [ ] Email notifications sent (if applicable)
- [ ] Admin analytics dashboard loads
- [ ] Error handling displays proper messages

### Monitoring & Observability
- [ ] Logs appearing in centralized logging system
- [ ] Metrics dashboard showing data
- [ ] Error rates normal (no unexpected spikes)
- [ ] Latency metrics acceptable (p95 < 500ms)
- [ ] Alerts configured and tested

### Performance Validation
- [ ] API response times acceptable
- [ ] Database query performance normal
- [ ] No memory leaks detected
- [ ] CDN serving static assets
- [ ] Page load times acceptable

### Communication
- [ ] Stakeholders notified of successful deployment
- [ ] Release notes published
- [ ] Known issues documented
- [ ] Support team briefed on changes
- [ ] Incident response team on standby

## Rollback Procedure (If Needed)

### Quick Rollback
```bash
# Option 1: Redeploy previous version
terraform apply -var-file="terraform.tfvars" -var="backend_container_image=yourregistry/student-os-backend:previous-tag"

# Option 2: Revert database if schema changed
mongorestore --uri="mongodb+srv://..." --dir=backup-dir
```

### Steps
1. [ ] Assess impact and severity
2. [ ] Notify stakeholders
3. [ ] Identify last known good version
4. [ ] Revert infrastructure/containers
5. [ ] Verify rollback success
6. [ ] Document root cause
7. [ ] Plan fix for next deployment

## Disaster Recovery

### Backup Verification
- [ ] Database backups automated and tested
- [ ] Code repository has redundancy
- [ ] Secrets backed up securely
- [ ] Disaster recovery runbook created
- [ ] Team trained on disaster recovery

### Recovery Time Objectives (RTO)
- Database recovery: 15 minutes
- Application recovery: 10 minutes
- Full stack recovery: 30 minutes

### Recovery Point Objectives (RPO)
- Database: Last 6 hours
- Logs: Last 30 days
- Configurations: Real-time (IaC)

## Escalation Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| DevOps Lead | [Name] | [Phone] | [Email] |
| Backend Lead | [Name] | [Phone] | [Email] |
| Database Admin | [Name] | [Phone] | [Email] |
| Security Lead | [Name] | [Phone] | [Email] |
| On-Call Engineer | [Name] | [Phone] | [Email] |

## Post-Deployment Review (24-48 hours)

- [ ] Monitor for any delayed issues
- [ ] Check error logs for patterns
- [ ] Review customer feedback
- [ ] Assess performance metrics
- [ ] Document lessons learned
- [ ] Plan any follow-up improvements

## Sign-Off

- [ ] DevOps Engineer: _________________ Date: _______
- [ ] Engineering Lead: ________________ Date: _______
- [ ] Product Manager: _________________ Date: _______
- [ ] Security Lead: ___________________ Date: _______
