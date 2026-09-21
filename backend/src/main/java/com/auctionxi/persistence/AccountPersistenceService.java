package com.auctionxi.persistence;

import com.auctionxi.auth.AuthAccount;
import com.auctionxi.entity.AccountEntity;
import com.auctionxi.repository.AccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
public class AccountPersistenceService {

    private static final Logger log = LoggerFactory.getLogger(AccountPersistenceService.class);

    private final AccountRepository accountRepository;

    public AccountPersistenceService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Transactional
    public AccountEntity saveAccount(AuthAccount account) {
        if (account == null || account.getAccountId() == null) {
            return null;
        }

        try {
            AccountEntity entity = accountRepository.findById(account.getAccountId())
                    .orElseGet(() -> {
                        AccountEntity e = new AccountEntity();
                        e.setAccountId(account.getAccountId());
                        e.setCreatedAt(Instant.now());
                        return e;
                    });

            entity.setNormalizedEmail(account.getEmail() != null ? account.getEmail().toLowerCase() : "");
            entity.setDisplayName(account.getDisplayName());
            entity.setPasswordHash(account.getPasswordHash());
            entity.setSalt(account.getSalt());
            entity.setSecurityQuestion(account.getSecurityQuestion());
            entity.setSecurityAnswerHash(account.getSecurityAnswerHash());
            entity.setUpdatedAt(Instant.now());

            return accountRepository.save(entity);
        } catch (Exception e) {
            log.error("Failed to persist account {}: {}", account.getAccountId(), e.getMessage(), e);
            return null;
        }
    }

    public Optional<AccountEntity> findByNormalizedEmail(String normalizedEmail) {
        return accountRepository.findByNormalizedEmail(normalizedEmail);
    }

    public Optional<AccountEntity> findById(String accountId) {
        return accountRepository.findById(accountId);
    }
}
