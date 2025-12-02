# CLOUD FUNCTIONS - QUICK REFERENCE TABLE

## All 16 Exported Functions

| # | Function Name | Type | Trigger | Line | Input | Output |
|---|---|---|---|---|---|---|
| 1 | `onStatusChange` | Firestore Trigger | fahrzeuge_* update | 155 | Vehicle doc | email_logs, emailRetryQueue |
| 2 | `onNewPartnerAnfrage` | Firestore Trigger | partnerAnfragen_* create | 357 | Anfrage doc | email_logs, emailRetryQueue |
| 3 | `onUserApproved` | Firestore Trigger | users update | 501 | User doc | email_logs, emailRetryQueue |
| 4 | `sendEntwurfEmail` | HTTP Callable | Manual (UI) | 4294 | Email data | email_logs, emailRetryQueue |
| 5 | `sendEntwurfBestaetigtNotification` | HTTP Callable | Manual (UI) | 4586 | Anfrage ID | email_logs, emailRetryQueue |
| 6 | `sendEntwurfAbgelehntNotification` | HTTP Callable | Manual (UI) | 4662 | Anfrage ID | email_logs, emailRetryQueue |
| 7 | `createPartnerAutoLoginToken` | HTTP Callable | Manual (annahme.html) | 3280 | Partner info | partnerAutoLoginTokens |
| 8 | `validatePartnerAutoLoginToken` | HTTP Callable | Manual (auto-login.html) | 3367 | Token string | Custom token + metadata |
| 9 | `ensurePartnerAccount` | HTTP Callable | Manual (registration) | ? | Partner data | Firebase Auth account |
| 10 | `generateAngebotPDF` | HTTP Callable | Manual (kva-erstellen.html) | 4736 | KVA data | Base64 PDF |
| 11 | `parseDATPDF` | HTTP Callable | Manual (annahme.html) | 4022 | Image array | Vehicle/parts data (JSON) |
| 12 | `monthlyBonusReset` | Scheduled | Every month (1st, 00:00) | 3503 | Auto | bonusAuszahlungen_* |
| 13 | `cleanupStaleSessions` | Scheduled | Every 15 minutes | 3733 | Auto | activeSessions_* |
| 14 | `processEmailRetryQueue` | Scheduled | Every 5 minutes | 3827 | Auto | emailRetryQueue |
| 15 | `getActiveWerkstaetten()` | Helper | Called by #12, #13 | 134 | Auto | werkstattIds array |
| 16 | `getAWSSESClient()` | Helper | Called by email functions | 35 | Auto | SES client |

---

## Email Retry System (Bug #3 Fix)

### Email Retry Queue Status Flow

```
NEW EMAIL ERROR
     ↓
ADD TO emailRetryQueue (status: pending_retry, retryCount: 0)
     ↓
[Wait 5 minutes]
     ↓
processEmailRetryQueue RUNS (Every 5 minutes)
     ↓
Retry Attempt #1 (Delay: 5 min) → Success? → LOG (sent)
                              ↘ Fail? → Update (retryCount: 1, nextRetryAt: +10min)
     ↓
[Wait 10 minutes]
     ↓
Retry Attempt #2 (Delay: 10 min) → Success? → LOG (sent)
                               ↘ Fail? → Update (retryCount: 2, nextRetryAt: +20min)
     ↓
[Wait 20 minutes]
     ↓
Retry Attempt #3 (Delay: 20 min) → Success? → LOG (sent), status: sent
                               ↘ Fail? → status: failed_permanent, LOG (failed_permanent)
```

**Max Retries:** 3 attempts total  
**Backoff Formula:** 2^retryCount * 5 minutes  
**Processing Batch:** Max 20 emails per 5-min run  
**Rate Limiting:** 100ms between email sends

---

## Secrets Required (Firebase Secret Manager)

| Secret | Value | Used By | Setup |
|--------|-------|---------|-------|
| `OPENAI_API_KEY` | sk-... (OpenAI) | parseDATPDF | `firebase functions:secrets:set OPENAI_API_KEY` |
| `AWS_ACCESS_KEY_ID` | AWS IAM key | onStatusChange, onNewPartnerAnfrage, sendEntwurfEmail, etc. | `firebase functions:secrets:set AWS_ACCESS_KEY_ID` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret | Same as above | `firebase functions:secrets:set AWS_SECRET_ACCESS_KEY` |

---

## Collections Used (Read/Write)

### Multi-Tenant Collections (werkstattId suffix)
- `fahrzeuge_{id}` - READ/WRITE (trigger source)
- `partnerAnfragen_{id}` - READ/WRITE (trigger source)
- `partners_{id}` - READ (query admins)
- `einstellungen_{id}` - READ (load settings)
- `activeSessions_{id}` - READ/DELETE (cleanup)
- `bonusAuszahlungen_{id}` - WRITE (reset bonus)

### Global Collections (No suffix)
- `email_logs` - WRITE (audit trail)
- `emailRetryQueue` - READ/WRITE (retry queue)
- `systemLogs` - WRITE (monitoring)
- `users` - READ/WRITE (auth, admin queries)
- `partnerAutoLoginTokens` - READ/WRITE (QR tokens)

---

## Deployment & Monitoring

### Deploy Functions
```bash
cd functions/
npm install
firebase deploy --only functions
```

### View Logs
```bash
firebase functions:log                    # All functions
firebase functions:log --only onStatusChange  # Specific function
firebase functions:log --limit 100        # Last 100 entries
firebase functions:log --follow          # Real-time follow
```

### View in Console
```
https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/functions/logs
```

---

## Common Error Patterns

| Error | Cause | Fix |
|-------|-------|-----|
| "Composite index required" | emailRetryQueue query needs index | Create index: status, retryCount |
| "MessageRejected" | Sender email not verified in AWS SES | Verify domain in AWS SES Console |
| "AccessDenied" | AWS credentials invalid | Check Secret Manager values |
| "InvalidParameterValue" | Invalid email address | Validate email format before sending |
| "Resource exhausted" | PDF Vision daily limit | Wait until next day OR increase budget |
| "Timeout" | Function took > 60s | Increase memory/timeout OR optimize code |
| "UNAUTHENTICATED" | User not logged in | Add auth check before calling function |
| "PERMISSION_DENIED" | User role not allowed | Check role in custom claims |

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| onStatusChange latency | < 5s | ~2-3s |
| Email send latency | < 2s | ~1s |
| parseDATPDF latency | < 30s | ~15-20s |
| processEmailRetryQueue run time | < 30s | ~10-15s |
| cleanupStaleSessions run time | < 30s | ~5-10s |
| monthlyBonusReset run time | < 120s | ~20-30s |

---

## Known Issues & TODOs

- [ ] No rate limiting on email triggers (can spam if status updated rapidly)
- [ ] Missing composite index for emailRetryQueue (query will fail!)
- [ ] Hardcoded SENDER_EMAIL (should be per-werkstatt)
- [ ] No daily budget/quota enforcement for parseDATPDF
- [ ] No duplicate email prevention at trigger level
- [ ] Email templates stored as files (not in Firestore)
- [ ] No monitoring dashboard for email delivery
- [ ] No daily digest option for admin notifications

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-02  
**Status:** Ready for Review
