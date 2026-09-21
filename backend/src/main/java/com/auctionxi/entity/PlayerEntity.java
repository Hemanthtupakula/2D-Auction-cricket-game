package com.auctionxi.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;

@Entity
@Table(name = "players")
public class PlayerEntity {

    @Id
    @Column(name = "player_id", length = 64)
    private String playerId;

    @Column(name = "lot_number")
    private Integer lotNumber;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "country", length = 100)
    private String country;

    @Column(name = "nationality", length = 100)
    private String nationality;

    @Column(name = "age")
    private Integer age;

    @Column(name = "role", length = 50)
    private String role;

    @Column(name = "batting_style", length = 50)
    private String battingStyle;

    @Column(name = "bowling_style", length = 50)
    private String bowlingStyle;

    @Column(name = "is_overseas", nullable = false)
    private boolean isOverseas = false;

    @Column(name = "is_capped", nullable = false)
    private boolean isCapped = true;

    @Column(name = "auction_set", length = 30)
    private String auctionSet;

    @Column(name = "base_price_rupees")
    private Long basePriceRupees;

    @Column(name = "source_name", length = 150)
    private String sourceName;

    @Column(name = "source_url", columnDefinition = "text")
    private String sourceUrl;

    @Column(name = "source_checked_at")
    private Instant sourceCheckedAt;

    @Column(name = "photo_url", columnDefinition = "text")
    private String photoUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ipl_stats", columnDefinition = "jsonb")
    private String iplStats;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "international_stats", columnDefinition = "jsonb")
    private String internationalStats;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "recent_stats", columnDefinition = "jsonb")
    private String recentStats;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "domestic_stats", columnDefinition = "jsonb")
    private String domesticStats;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "over_graph", columnDefinition = "jsonb")
    private String overGraph;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "media", columnDefinition = "jsonb")
    private String media;

    @Column(name = "status", length = 40)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public PlayerEntity() {}

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public Integer getLotNumber() { return lotNumber; }
    public void setLotNumber(Integer lotNumber) { this.lotNumber = lotNumber; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getNationality() { return nationality; }
    public void setNationality(String nationality) { this.nationality = nationality; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getBattingStyle() { return battingStyle; }
    public void setBattingStyle(String battingStyle) { this.battingStyle = battingStyle; }

    public String getBowlingStyle() { return bowlingStyle; }
    public void setBowlingStyle(String bowlingStyle) { this.bowlingStyle = bowlingStyle; }

    public boolean isOverseas() { return isOverseas; }
    public void setOverseas(boolean overseas) { isOverseas = overseas; }

    public boolean isCapped() { return isCapped; }
    public void setCapped(boolean capped) { isCapped = capped; }

    public String getAuctionSet() { return auctionSet; }
    public void setAuctionSet(String auctionSet) { this.auctionSet = auctionSet; }

    public Long getBasePriceRupees() { return basePriceRupees; }
    public void setBasePriceRupees(Long basePriceRupees) { this.basePriceRupees = basePriceRupees; }

    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }

    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }

    public Instant getSourceCheckedAt() { return sourceCheckedAt; }
    public void setSourceCheckedAt(Instant sourceCheckedAt) { this.sourceCheckedAt = sourceCheckedAt; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getIplStats() { return iplStats; }
    public void setIplStats(String iplStats) { this.iplStats = iplStats; }

    public String getInternationalStats() { return internationalStats; }
    public void setInternationalStats(String internationalStats) { this.internationalStats = internationalStats; }

    public String getRecentStats() { return recentStats; }
    public void setRecentStats(String recentStats) { this.recentStats = recentStats; }

    public String getDomesticStats() { return domesticStats; }
    public void setDomesticStats(String domesticStats) { this.domesticStats = domesticStats; }

    public String getOverGraph() { return overGraph; }
    public void setOverGraph(String overGraph) { this.overGraph = overGraph; }

    public String getMedia() { return media; }
    public void setMedia(String media) { this.media = media; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
