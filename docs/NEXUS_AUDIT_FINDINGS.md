# NEXUS Audit Findings Report

## Findings

### NEXUS-001
**Severity:** CRITICAL  
**Location:** agents/orchestrator/src/services/onchainos-wallet.ts:15  
**Title:** Hardcoded Private Key Fallback  
**Impact:** Private key exposure in source code, potential fund theft  
**Repro:** Check source code for pk fallback  
**Fix:** Remove fallback, require TEE_PRIVATE_KEY env var (already applied)

### NEXUS-002
**Severity:** HIGH  
**Location:** agents/pay-relay/src/middleware.ts:4  
**Title:** Hardcoded JWT Secret  
**Impact:** Authentication bypass if env missing  
**Repro:** Set JWT_SECRET env to empty, attempt auth  
**Fix:** Remove fallback, require JWT_SECRET env var

### NEXUS-003
**Severity:** HIGH  
**Location:** agents/orchestrator/src/server.ts:15  
**Title:** CORS Allows All Origins  
**Impact:** CSRF attacks on API endpoints  
**Repro:** Send request from any origin  
**Fix:** Restrict to specific domains: `origin: ['http://localhost:3000', 'https://nexus.ai']`

### NEXUS-004
**Severity:** MEDIUM  
**Location:** agents/orchestrator/src/tools/vault-tools.ts:20  
**Title:** Unhandled RPC Errors in Tools  
**Impact:** Silent failures in agent decisions  
**Repro:** Disconnect RPC, call checkBalance  
**Fix:** Wrap in try/catch, return error message

### NEXUS-005
**Severity:** MEDIUM  
**Location:** agents/pay-relay/src/index.ts:10  
**Title:** No Error Handling in Routes  
**Impact:** Crashes on invalid input  
**Repro:** Send malformed JSON to /verify-payment  
**Fix:** Add try/catch in route handlers

### NEXUS-006
**Severity:** LOW  
**Location:** agents/orchestrator/src/server.ts:50  
**Title:** Console Logging Sensitive Data  
**Impact:** Potential data leakage in logs  
**Repro:** Check logs during streaming  
**Fix:** Remove console.log(chunk), use structured logging

### NEXUS-007
**Severity:** LOW  
**Location:** frontend/src/hooks/useOrchestratorChat.ts:40  
**Title:** No Input Sanitization  
**Impact:** Prompt injection risks  
**Repro:** Send malicious input  
**Fix:** Sanitize userInput: `input.replace(/[<>\"'&]/g, '')`

### NEXUS-008
**Severity:** INFO  
**Location:** infra/docker-compose.yml  
**Title:** Placeholder Infra  
**Impact:** No production deployment  
**Repro:** Check file  
**Fix:** Implement full Docker setup with env vars

### NEXUS-009
**Severity:** INFO  
**Location:** agents/orchestrator/src/agent/orchestrator.ts:35  
**Title:** Tools Commented Out  
**Impact:** Limited functionality  
**Repro:** Check code  
**Fix:** Enable tools (already applied)

### NEXUS-010
**Severity:** INFO  
**Location:** contracts/extract_abis.js  
**Title:** Manual ABI Extraction  
**Impact:** Outdated ABIs  
**Repro:** Modify contract, forget to run script  
**Fix:** Automate in build process