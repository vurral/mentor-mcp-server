# Writing Feedback Tool Example

## Request
```json
{
  "text": "# Rate Limiting Implementation Guide\n\nThis document describes the implementation of rate limiting in our API service. Rate limiting prevents abuse and ensures fair resource allocation.\n\nRate limits are enforced using a token bucket algorithm. Each client gets a bucket that fills at a fixed rate. When the bucket is empty, requests are rejected.\n\nTo implement rate limiting:\n1. Configure bucket size and refill rate\n2. Store bucket state in Redis\n3. Check token availability before processing requests\n4. Update bucket state after processing\n\nExample:\n```js\nconst rateLimit = {\n  bucketSize: 100,\n  refillRate: 10 // tokens per second\n}\n```\n\nWhen rate limit is exceeded, return 429 Too Many Requests with retry-after header.",
  "writing_type": "documentation"
}
```

## Response
```markdown
Here's my comprehensive feedback on your Rate Limiting Implementation Guide:

**1. Overall Assessment**  
The document provides a functional foundation but lacks depth required for production-grade implementation guidance. While core concepts are present, critical technical details and API documentation standards are underdeveloped.

**2. Strengths**  
✓ Clear purpose statement in opening paragraph  
✓ Logical progression from concept to implementation steps  
✓ Appropriate use of code fencing for example  
✓ Correct identification of HTTP 429 response  
✓ Concise explanation of token bucket algorithm basics

**3. Areas for Improvement**  
• Insufficient technical details for distributed systems implementation  
• Missing error handling and edge case considerations  
• No versioning or maintenance guidance  
• Lack of complete API response examples  
• Omission of monitoring and troubleshooting recommendations

**4. Specific Recommendations**

**Clarity & Coherence**  
→ Add visual diagram of token bucket mechanism  
→ Clarify time window interpretation ("10 per second" vs sliding window)  
→ Define "client" precisely (IP? API key? User session?)  
→ Explain Redis storage schema and expiration policies

**Grammar & Style**  
→ Use active voice: "Each client receives" instead of "Each client gets"  
→ Maintain parallel structure in implementation steps:  
  - Current: "Configure... Store... Check... Update"  
  - Improved: "Configure... Implement... Validate... Maintain"  
→ Fix markdown escaping in code block (extra backslashes)

**Structure & Organization**  
Add these sections:  
1. Prerequisites  
2. Error Handling Specifications  
3. Monitoring Metrics (e.g., X-RateLimit headers)  
4. Version History  
5. Common Configuration Patterns  
6. Troubleshooting Checklist

**Content & Accuracy**  
Critical technical additions needed:  
• Distributed system coordination (Redis transactions/Lua scripting)  
• Burst handling and warmup strategies  
• Concurrent request race conditions  
• Redis persistence and backup considerations  
• Client identification methodology  
• Grace period implementation for near-limit cases

**5. Key Action Items**  

**Priority Updates**  
1. Add complete API response example:
```js
// 429 Response Example
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Maximum 100 requests per minute",
    "retry_after": 5.2 // seconds
  }
}
Headers: 
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1689876543
Retry-After: 5.2
```

2. Expand code example with Redis operations:
```js
// Token consumption logic
async function checkRateLimit(clientId) {
  const now = Date.now();
  const key = `rate_limit:${clientId}`;
  
  const result = await redis.multi()
    .hgetall(key)
    .hmset(key, {
      tokens: Math.min(
        (current.tokens || bucketSize) + 
        Math.floor((now - (current.lastRefill || now)) / 1000 * refillRate),
        bucketSize
      ),
      lastRefill: now
    })
    .expire(key, 3600)
    .exec();
  
  if(result.tokens < 1) throw new RateLimitError();
}
```

3. Add troubleshooting table:

| Symptom               | Potential Cause          | Verification Method       |
|-----------------------|--------------------------|---------------------------|
| Consistent 429 errors | Misconfigured bucket size | Check Redis config stores |
| Redis connection fails| Network ACL restrictions | Test telnet to Redis port |

**Recommended Additions**  
• Versioning: "Rate limit configurations are versioned with API releases. Always specify limit parameters in your API contract using semantic versioning."  
• Monitoring: "Track these metrics:  
  - Rejection rate by client segment  
  - 90th percentile token consumption  
  - Redis latency percentiles"  
• Maintenance: "Review rate limits quarterly using historical traffic analysis. Implement canary deployments for limit changes."

**Summary**  
The guide effectively introduces core concepts but requires deeper technical specification and operational documentation. Focus on adding implementation details for distributed systems, comprehensive error handling examples, and maintenance procedures to make this production-ready. Maintain the current concise style while expanding technical completeness.