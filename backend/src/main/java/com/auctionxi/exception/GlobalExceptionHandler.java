package com.auctionxi.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AllocationException.class)
    public ResponseEntity<Map<String, Object>> handleAllocationException(AllocationException ex) {
        HttpStatus status = switch (ex.getErrorCode()) {
            case ROOM_NOT_FOUND, MEMBER_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case FRANCHISE_ALREADY_TAKEN, REBALANCE_REQUIRED, AUCTION_ALREADY_STARTED -> HttpStatus.CONFLICT;
            case NOT_ROOM_HOST -> HttpStatus.FORBIDDEN;
            case QUOTA_EXCEEDED, NOT_FRANCHISE_OWNER, INVALID_REBALANCE_SELECTION, UNOWNED_FRANCHISES_REMAIN,
                 QUOTA_INCOMPLETE, INVALID_REQUEST, ROOM_NOT_MUTABLE -> HttpStatus.BAD_REQUEST;
            default -> HttpStatus.BAD_REQUEST;
        };

        return ResponseEntity.status(status).body(Map.of(
                "errorCode", ex.getErrorCode().name(),
                "message", ex.getMessage(),
                "timestamp", System.currentTimeMillis()
        ));
    }
}
