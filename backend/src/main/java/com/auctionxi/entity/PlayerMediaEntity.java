package com.auctionxi.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "player_media")
public class PlayerMediaEntity {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "player_id", nullable = false, length = 64)
    private String playerId;

    @Column(name = "media_type", nullable = false, length = 30)
    private String mediaType = "PORTRAIT";

    @Column(name = "storage_provider", nullable = false, length = 50)
    private String storageProvider = "IMAGEKIT";

    @Column(name = "storage_file_id", length = 100)
    private String storageFileId;

    @Column(name = "storage_path", columnDefinition = "text")
    private String storagePath;

    @Column(name = "delivery_url", columnDefinition = "text")
    private String deliveryUrl;

    @Column(name = "source_url", columnDefinition = "text")
    private String sourceUrl;

    @Column(name = "source_page_url", columnDefinition = "text")
    private String sourcePageUrl;

    @Column(name = "source_name", length = 150)
    private String sourceName;

    @Column(name = "status", nullable = false, length = 50)
    private String status = "MISSING";

    @Column(name = "rights_status", nullable = false, length = 50)
    private String rightsStatus = "REVIEW_REQUIRED";

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Column(name = "mime_type", length = 50)
    private String mimeType;

    @Column(name = "checksum", length = 64)
    private String checksum;

    @Column(name = "is_primary", nullable = false)
    private boolean isPrimary = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "retrieved_at")
    private Instant retrievedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    public PlayerMediaEntity() {}

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

    public boolean isPrimary() { return isPrimary; }
    public void setPrimary(boolean primary) { isPrimary = primary; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public Instant getRetrievedAt() { return retrievedAt; }
    public void setRetrievedAt(Instant retrievedAt) { this.retrievedAt = retrievedAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
}
