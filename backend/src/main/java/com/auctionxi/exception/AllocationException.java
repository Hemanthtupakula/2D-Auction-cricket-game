package com.auctionxi.exception;

public class AllocationException extends RuntimeException {
    private final AllocationErrorCode errorCode;

    public AllocationException(AllocationErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public AllocationErrorCode getErrorCode() {
        return errorCode;
    }
}
