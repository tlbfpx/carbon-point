# Carbon Point - Production Operations Runbook

**Version:** 1.0.0
**Last Updated:** 2026-04-30

---

## 1. Overview

This runbook contains procedures for operating the Carbon Point production system, including deployment, switchover, rollback, and incident response.

### System Architecture
- **Backend:** Spring Boot (saas-backend/carbon-app)
- **Frontends:** Enterprise Admin (port 3000), Platform Admin (port 3001), H5 (port 3002)
- **Database:** MySQL with multi-tenant schema
- **Cache:** Redis
- **Auth:** JWT with Argon2 password hashing

---

## 2. Pre-Deployment Checklist

- [ ] All tests passed (unit, integration, E2E, performance, security)
- [ ] Final verification report reviewed and signed off
- [ ] Deployment guide reviewed (see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md))
- [ ] Rollback plan validated (see [ROLLBACK DRILL](#4-rollback-procedure))
- [ ] Monitoring and alerts configured
- [ ] Communication plan with stakeholders in place
- [ ] Maintenance window scheduled (low traffic: 02:00 - 04:00)

---

## 3. Deployment Procedure (NEW Architecture)

### 3.1 Pre-Deployment Steps
```bash
# 1. Back up database
mysqldump -u [USER] -p [DB_NAME] > backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Verify backup integrity
ls -lah backup-*.sql

# 3. Stop non-essential jobs (if any)
# ...
```

### 3.2 Deploy Backend
```bash
# 1. Build (skip tests, they were already run)
cd saas-backend
./mvnw clean package -Dmaven.test.skip=true

# 2. Stop current backend
# (systemctl stop carbon-point or similar)

# 3. Deploy new JAR
cp carbon-app/target/carbon-app-1.0.0-SNAPSHOT.jar /path/to/deploy/

# 4. Start new backend
# (systemctl start carbon-point or similar)

# 5. Verify startup
curl -f http://localhost:8080/actuator/health || echo "Backend not healthy"
```

### 3.3 Deploy Frontends
```bash
# Enterprise Admin
cd saas-frontend/enterprise-frontend
pnpm install
pnpm build
# deploy to your static hosting / CDN

# Platform Admin
cd ../platform-frontend
pnpm install
pnpm build
# deploy

# H5
cd ../h5
pnpm install
pnpm build
# deploy
```

### 3.4 Post-Deployment Verification
- [ ] Backend health check passed (`/actuator/health`)
- [ ] Frontends accessible, no console errors
- [ ] Login works for all user roles
- [ ] Key functionality: check-in, exchange, leaderboards
- [ ] Monitoring metrics look normal

---

## 4. Switchover Procedure (NEW → OLD)

Use this if you need to switch traffic from NEW architecture back to OLD architecture.

### 4.1 Pre-Switchover
- [ ] Notify stakeholders
- [ ] Confirm OLD architecture is still running/ready
- [ ] Verify dual-write is enabled (both OLD and NEW data stores are in sync)
- [ ] Capture current state (metrics, active users)

### 4.2 Switchover Steps
```bash
# 1. Enable maintenance mode (if needed)
# ...

# 2. Drain traffic from NEW
# (wait for existing connections to complete, ~30-60s)

# 3. Switch load balancer/DNS to point to OLD
# ...

# 4. Verify OLD is handling traffic
# Check logs, metrics

# 5. Disable maintenance mode
# ...
```

### 4.3 Post-Switchover Verification
- [ ] Traffic is flowing to OLD
- [ ] Error rate < 1%
- [ ] Key functionality works
- [ ] No data loss reported

---

## 5. Rollback Procedure (OLD → NEW)

Use this to rollback from OLD to NEW architecture (e.g., after a failed switchover).

### 5.1 Pre-Rollback
- [ ] Notify stakeholders
- [ ] Verify NEW architecture is still running
- [ ] Reconcile any data written to OLD during switchover (if dual-write was off)
- [ ] Capture current state

### 5.2 Rollback Steps
```bash
# 1. Enable maintenance mode (if needed)
# ...

# 2. Drain traffic from OLD
# (wait ~30-60s)

# 3. Switch load balancer/DNS back to NEW
# ...

# 4. Verify NEW is handling traffic
# Check logs, metrics

# 5. Disable maintenance mode
# ...
```

### 5.3 Post-Rollback Verification
- [ ] Traffic is flowing to NEW
- [ ] Error rate < 1%
- [ ] All functionality works
- [ ] Data is consistent and up-to-date

---

## 6. Incident Response

### 6.1 Severity Levels
| Severity | Description | Response Time |
|----------|-------------|---------------|
| P0 | System down, all users affected | 15 min |
| P1 | Major functionality broken, many users affected | 1 hour |
| P2 | Minor issues, few users affected | 4 hours |
| P3 | Cosmetic / low impact | Next business day |

### 6.2 Common Incidents & Fixes

#### Incident: High error rate (>5%)
1. Check logs for errors
2. Check database connections
3. Check Redis health
4. If NEW architecture: consider switching to OLD (see [Switchover](#4-switchover-procedure))

#### Incident: Slow performance (latency > 1s)
1. Check database query performance
2. Check Redis cache hit ratio
3. Check resource usage (CPU, memory, disk)
4. Scale horizontally/vertically if needed

#### Incident: Data inconsistency
1. Stop writes if possible
2. Check dual-write status
3. Restore from last good backup if needed
4. Run reconciliation process

#### Incident: Security breach suspected
1. Isolate affected systems
2. Change passwords/secrets
3. Preserve logs for forensics
4. Notify security team immediately

---

## 7. Monitoring & Alerts

### Key Metrics to Monitor
| Metric | Threshold | Alert |
|--------|-----------|-------|
| Error rate | > 1% | P1 |
| Latency (p95) | > 500ms | P2 |
| Throughput | < 50 ops/sec | P2 |
| CPU usage | > 80% for 5 min | P2 |
| Memory usage | > 80% for 5 min | P2 |
| Disk usage | > 90% | P1 |

### Logs to Check
- Backend logs: `/path/to/logs/carbon-point.log`
- Access logs: `/path/to/logs/access.log`
- Error logs: `/path/to/logs/error.log`

---

## 8. Backup & Restore

### 8.1 Backup Schedule
- **Database:** Daily full backup, hourly incremental
- **Configuration:** Version controlled (Git)
- **Logs:** Rotated daily, retained for 30 days

### 8.2 Restore Procedure
```bash
# Restore database
mysql -u [USER] -p [DB_NAME] < backup-YYYYMMDD-HHMMSS.sql

# Verify restore
# ...
```

---

## 9. Contact Information

| Role | Name | Contact |
|------|------|---------|
| Lead Engineer | - | - |
| DevOps Lead | - | - |
| QA Lead | - | - |
| Product Manager | - | - |

---

## Appendices

- [Final Verification Report](./docs/reports/FINAL_VERIFICATION_REPORT.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Architecture Decisions](./openspec/changes/carbon-point-platform/design.md)
