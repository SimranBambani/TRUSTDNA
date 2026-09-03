# Security Audit Index

The prior audit documents contained stale claims and should not be used as evidence of production readiness.

- [Phase 9 independent findings and remediation status](SECURITY_AUDIT_PHASE9.md)
- [Deployment and production checklist](DEPLOYMENT.md)
- [Security architecture and limitations](SECURITY.md)

The Phase 9 audit was primarily static source inspection supplemented by local typecheck, lint, unit tests, and a production build using placeholder configuration. It was not a penetration test, live provider test, or production-topology assessment. Integration and E2E tests were skipped without a configured runtime environment. Remaining risks are documented in the Phase 9 report.
