package com.auctionxi.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Player {
    private String id;
    private int lotNumber;
    private String fullName;
    private String shortName;
    private String country;
    private String nationality;
    private String dateOfBirth;
    private Integer age;
    private String role;
    private String battingStyle;
    private String bowlingStyle;

    @JsonProperty("isCapped")
    private boolean isCapped;

    @JsonProperty("isOverseas")
    private boolean isOverseas;

    private List<String> knownTeams;
    private String auctionSet;
    private long basePrice;
    private String source;
    private String sourceUrl;
    private String sourceCheckedAt;
    private String photoUrl;
    private Map<String, Object> ipl;
    private Map<String, Object> international;
    private Map<String, Object> recent;
    private Map<String, Object> domestic;
    private Map<String, Object> overGraph;
    private Map<String, Object> media;
    private String status = "REMAINING"; // REMAINING, ON_BLOCK, SOLD, UNSOLD
    private String soldToFranchise;
    private Long soldPrice;

    public Player() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public int getLotNumber() { return lotNumber; }
    public void setLotNumber(int lotNumber) { this.lotNumber = lotNumber; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getShortName() { return shortName; }
    public void setShortName(String shortName) { this.shortName = shortName; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getNationality() { return nationality; }
    public void setNationality(String nationality) { this.nationality = nationality; }

    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getBattingStyle() { return battingStyle; }
    public void setBattingStyle(String battingStyle) { this.battingStyle = battingStyle; }

    public String getBowlingStyle() { return bowlingStyle; }
    public void setBowlingStyle(String bowlingStyle) { this.bowlingStyle = bowlingStyle; }

    @JsonProperty("isCapped")
    public boolean isCapped() { return isCapped; }
    @JsonProperty("isCapped")
    public void setCapped(boolean capped) { isCapped = capped; }

    @JsonProperty("isOverseas")
    public boolean isOverseas() { return isOverseas; }
    @JsonProperty("isOverseas")
    public void setOverseas(boolean overseas) { isOverseas = overseas; }

    public List<String> getKnownTeams() { return knownTeams; }
    public void setKnownTeams(List<String> knownTeams) { this.knownTeams = knownTeams; }

    public String getAuctionSet() { return auctionSet; }
    public void setAuctionSet(String auctionSet) { this.auctionSet = auctionSet; }

    public long getBasePrice() { return basePrice; }
    public void setBasePrice(long basePrice) { this.basePrice = basePrice; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }

    public String getSourceCheckedAt() { return sourceCheckedAt; }
    public void setSourceCheckedAt(String sourceCheckedAt) { this.sourceCheckedAt = sourceCheckedAt; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public Map<String, Object> getIpl() { return ipl; }
    public void setIpl(Map<String, Object> ipl) { this.ipl = ipl; }

    public Map<String, Object> getInternational() { return international; }
    public void setInternational(Map<String, Object> international) { this.international = international; }

    public Map<String, Object> getRecent() { return recent; }
    public void setRecent(Map<String, Object> recent) { this.recent = recent; }

    public Map<String, Object> getDomestic() { return domestic; }
    public void setDomestic(Map<String, Object> domestic) { this.domestic = domestic; }

    public Map<String, Object> getOverGraph() { return overGraph; }
    public void setOverGraph(Map<String, Object> overGraph) { this.overGraph = overGraph; }

    public Map<String, Object> getMedia() { return media; }
    public void setMedia(Map<String, Object> media) { this.media = media; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSoldToFranchise() { return soldToFranchise; }
    public void setSoldToFranchise(String soldToFranchise) { this.soldToFranchise = soldToFranchise; }

    public Long getSoldPrice() { return soldPrice; }
    public void setSoldPrice(Long soldPrice) { this.soldPrice = soldPrice; }
}
