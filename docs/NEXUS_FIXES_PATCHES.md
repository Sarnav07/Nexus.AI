# NEXUS Fixes & Patches

## CRITICAL & HIGH Severity Fixes

### NEXUS-001 (CRITICAL) - Hardcoded Private Key
**Status:** FIXED  
**Patch Applied:**
```typescript
// agents/orchestrator/src/services/onchainos-wallet.ts
constructor(apiKey: string) {
  if (!apiKey) throw new Error('ONCHAINOS_TEE_API_KEY is required');
  
  const pk = process.env.TEE_PRIVATE_KEY;
  if (!pk) throw new Error('TEE_PRIVATE_KEY environment variable is required');
  this.account = privateKeyToAccount(pk as Hex);
}
```

### NEXUS-002 (HIGH) - Hardcoded JWT Secret
**Status:** OPEN  
**Recommended Fix:**
```typescript
// agents/pay-relay/src/middleware.ts
const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) throw new Error('JWT_SECRET environment variable is required');
```

### NEXUS-003 (HIGH) - CORS All Origins
**Status:** OPEN  
**Recommended Fix:**
```typescript
// agents/orchestrator/src/server.ts
app.use('/*', cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://nexus.ai', 'https://app.nexus.ai'] 
    : ['http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
```

## MEDIUM Severity Fixes

### NEXUS-004 (MEDIUM) - Unhandled RPC Errors
**Status:** OPEN  
**Recommended Fix:**
```typescript
// agents/orchestrator/src/tools/vault-tools.ts
export const checkBalance = tool({
  // ...
  execute: async ({ userAddress }) => {
    try {
      const client = getPublicClient();
      const balance = (await client.readContract({ /* ... */ })) as bigint;
      // ...
    } catch (error) {
      return { error: `RPC Error: ${error.message}` };
    }
  },
});
```

### NEXUS-005 (MEDIUM) - No Error Handling in Routes
**Status:** OPEN  
**Recommended Fix:**
```typescript
// agents/pay-relay/src/index.ts
app.get('/verify-payment/:txHash', (req, res) => {
  try {
    const txHash = req.params.txHash;
    const token = pendingInvoices.get(txHash);
    if (!token) {
      return res.status(404).json({ status: "pending or invalid" });
    }
    res.json({ token, status: "verified" });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## LOW & INFO Severity Recommendations

### NEXUS-006 (LOW) - Console Logging Sensitive Data
**Recommendation:** Replace console.log with structured logging library (e.g., winston). Remove chunk logging.

### NEXUS-007 (LOW) - No Input Sanitization
**Recommendation:** Add input sanitization in frontend hooks:
```typescript
const sanitized = userInput.replace(/[<>\"'&]/g, '');
```

### NEXUS-008 (INFO) - Placeholder Infra
**Recommendation:** Implement production Docker Compose with environment variables and health checks.

### NEXUS-009 (INFO) - Tools Commented Out
**Status:** FIXED - Tools enabled in orchestrator.ts

### NEXUS-010 (INFO) - Manual ABI Extraction
**Recommendation:** Add ABI extraction to Foundry build process or CI pipeline.