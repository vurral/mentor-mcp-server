# Second Opinion Tool Example

## Request
```json
{
  "user_request": "Build a secure authentication system with OAuth2 and JWT tokens"
}
```

## Response
```markdown
**Critical Considerations for Building a Secure OAuth2/JWT Authentication System:**

- **Flow Selection Complexity:** Choosing the correct OAuth2 flow (e.g., Authorization Code + PKCE for SPAs/mobile, Client Credentials for machine-to-machine) is critical to avoid security vulnerabilities like token leakage or misuse.  
- **JWT Security Hardening:** Risks of unsigned/misconfigured tokens (e.g., using `none` algorithm), insecure secret storage for signing keys, and exposure of sensitive data in claims require strict validation, asymmetric signing (RS256), and payload minimization.  
- **Token Lifetime & Refresh Strategy:** Short-lived JWTs with secure refresh token rotation (server-side tracking, binding to client/IP) to mitigate replay attacks and long-term exposure risks.  
- **Revocation Challenges:** Stateless JWTs lack built-in invalidation—implement hybrid checks (e.g., short expiration, distributed deny lists, or token introspection endpoints) for compromised tokens.  
- **Key Management:** Secure rotation of cryptographic keys (HS256/RS256) without downtime, avoiding hardcoded secrets, and using HSMs/KMS solutions for enterprise-grade systems.  
- **Client-Side Storage Risks:** Mitigate XSS/CSRF vulnerabilities via HTTP-only cookies for web apps, secure mobile keystores, and avoiding local storage for tokens.  
- **Compliance Overheads:** GDPR, CCPA, or industry-specific regulations (HIPAA, PCI-DSS) may mandate audit logging, consent management, or encryption-at-rest for user data.  
- **Federated Identity Risks:** If integrating third-party IdPs (Google, Facebook), validate issuer claims, enforce email verification, and plan for IdP outage scenarios.  
- **Scale & Performance:** Stateless JWTs enable horizontal scaling but risk oversized tokens; monitor header size impacts on network performance and API latency.  
- **Observability Gaps:** Centralized logging for token issuance/errors, anomaly detection (e.g., spike in failed auth attempts), and monitoring token misuse patterns.  
- **Dependency Risks:** Audit third-party OAuth libraries (e.g., `passport-oauth2`, `jsonwebtoken`) for vulnerabilities and maintain update cycles to address CVEs.  
- **Edge Case Blast Radius:** Plan for token leakage (auto-revocation triggers), brute-force protection on auth endpoints, and OAuth2 error handling to avoid information leaks.  
- **Build vs. Buy Tradeoffs:** Evaluate cost/effort of self-hosted solutions (Keycloak) vs. managed services (Auth0, AWS Cognito), especially for teams lacking security expertise.  

**Advanced Value Adds:**  
- OAuth2 dynamic client registration  
- OpenID Connect integration for user profile data  
- Step-up authentication with MFA hooks  
- Mutual TLS for client authentication in high-risk scenarios