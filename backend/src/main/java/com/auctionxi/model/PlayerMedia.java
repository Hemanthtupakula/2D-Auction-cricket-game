package com.auctionxi.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PlayerMedia {
    private String id;
    private String playerId;
    private String mediaType = "PORTRAIT";
    private String storageProvider = "IMAGEKIT";
    private String storageFileId;
    private String storagePath;
    private String deliveryUrl;
    private String sourceUrl;
    private String sourcePageUrl;
    private String sourceName;
    private String status = "MISSING"; // PENDING, UPLOADING, VERIFIED_IMAGEKIT, SOURCE_FALLBACK, MISSING, FAILED, REVIEW_REQUIRED
    private String rightsStatus = "REVIEW_REQUIRED";
    private Integer width;
    private Integer height;
    private String mimeType;
    private String checksum;
    private Boolean isPrimary = true;
    private Integer sortOrder = 0;
    private String retrievedAt;
    private String updatedAt;
    private String errorMessage;

    // Legacy fields for backward compatibility
    private String cloudflareImageId;
    private String cloudflareDeliveryUrl;

    public PlayerMedia() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public String getMediaType() { return mediaType; }
    public void setMediaType(String mediaType) { this.mediaType = mediaType; }

    public String getStorageProvider() { return storageProvider; }
    public void setStorageProvider(String storageProvider) { this.storageProvider = storageProvider; }

    public String getStorageFileId() { return storageFileId; }
    public void setStorageFileId(String storageFileId) { this.storageFileId = storageFileId; }

    public String getStoragePath() { return storagePath; }
    public void setStoragePath(String storagePath) { this.storagePath = storagePath; }

    public String getDeliveryUrl() { return deliveryUrl; }
    public void setDeliveryUrl(String deliveryUrl) { this.deliveryUrl = deliveryUrl; }

    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }

    public String getSourcePageUrl() { return sourcePageUrl; }
    public void setSourcePageUrl(String sourcePageUrl) { this.sourcePageUrl = sourcePageUrl; }

    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRightsStatus() { return rightsStatus; }
    public void setRightsStatus(String rightsStatus) { this.rightsStatus = rightsStatus; }

    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }

    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public String getChecksum() { return checksum; }
    public void setChecksum(String checksum) { this.checksum = checksum; }

    public Boolean getIsPrimary() { return isPrimary; }
    public void setIsPrimary(Boolean isPrimary) { this.isPrimary = isPrimary; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public String getRetrievedAt() { return retrievedAt; }
    public void setRetrievedAt(String retrievedAt) { this.retrievedAt = retrievedAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public String getCloudflareImageId() { return cloudflareImageId; }
    public void setCloudflareImageId(String cloudflareImageId) { this.cloudflareImageId = cloudflareImageId; }

    public String getCloudflareDeliveryUrl() { return cloudflareDeliveryUrl; }
    public void setCloudflareDeliveryUrl(String cloudflareDeliveryUrl) { this.cloudflareDeliveryUrl = cloudflareDeliveryUrl; }
}
