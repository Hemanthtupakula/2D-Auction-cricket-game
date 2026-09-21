package com.auctionxi.auth;

import java.time.Instant;

/** Optional player account — email + password + security question. Guests never need this. */
public class AuthAccount {
    private String accountId;      // stable memberId across devices
    private String email;
    private String displayName;
    private String passwordHash;
    private String salt;
    private String securityQuestion;
    private String securityAnswerHash;
    private Instant createdAt;

    public AuthAccount() {}

    public String getAccountId() { return accountId; }
    public void setAccountId(String v) { this.accountId = v; }
    public String getEmail() { return email; }
    public void setEmail(String v) { this.email = v; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String v) { this.displayName = v; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String v) { this.passwordHash = v; }
    public String getSalt() { return salt; }
    public void setSalt(String v) { this.salt = v; }
    public String getSecurityQuestion() { return securityQuestion; }
    public void setSecurityQuestion(String v) { this.securityQuestion = v; }
    public String getSecurityAnswerHash() { return securityAnswerHash; }
    public void setSecurityAnswerHash(String v) { this.securityAnswerHash = v; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant v) { this.createdAt = v; }
}
