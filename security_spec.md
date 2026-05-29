# Security Specification (TDD) for copy-of-nk-3d-customizer

## 1. Data Invariants
- **User profiles (`/users/{userId}`)**: 
  - A user profile can only be created or written to by the authenticated user whose `request.auth.uid` matches `{userId}`.
  - The email verified status must be true (`request.auth.token.email_verified == true`).
  - Immutability: `createdAt` must be fixed to the server time and cannot be modified on updates.
  - The client cannot assign their own roles or promote themselves to Admin.
- **Admin configurations (`/admins/{adminId}`)**:
  - Only existing admins can read/write the list of administrators.
  - The initial bootstrapped admin is `kitoruyasiru@gmail.com`.

## 2. The "Dirty Dozen" Payloads
These payloads attempt to breach the boundaries of Identity, Integrity, and State:

1. **Self-Creation of profile for another UID**: Auth uid is "userA", creating "users/userB" (Identity Breach).
2. **Profile creation with unverified email**: Auth has `email_verified: false` but writes a profile (Integrity Breach).
3. **Admin field injection in User profile**: Injecting `"role": "admin"` inside user profile (Privilege Escalation).
4. **Altering immortal field `createdAt`**: Updating `createdAt` long after creation (Integrity Breach).
5. **Junk String Document ID in Users**: Trying to create `users/SOME_HUGE_JUNK_ID_SPAM_SPAM` with 1KB string (Resource Poisoning).
6. **Bypassing update keys check**: Attempting to update `email` and other fields that should be read-only (Action/Update Gap).
7. **Read other user private emails**: User "A" reading user "B"'s profile (PII Leak).
8. **Modifying `/admins/{adminId}` directly**: Non-admin attempting to register themselves as an admin (Self-Assignment).
9. **Fake Client Timestamp**: Setting a client-side date string on `lastActive` instead of `request.time` (Temporal Integrity Breach).
10. **Admin list enumeration**: Anonymous/non-admin user querying `/admins` collection (PII Leak).
11. **Spoofed User profile verification**: Spoofing email of target owner with name edit (Identity Spoofing).
12. **Clearing required fields on update**: Attempting to update profile by sending empty or incorrect data types to bypass schema validations (Value Poisoning).

## 3. Test Runner
Below is the draft structure of testing that these payloads return `PERMISSION_DENIED`:
```typescript
// Verified via automatic Firebase Rules compiler
// Expects: PERMISSION_DENIED for all malicious attempts
```
