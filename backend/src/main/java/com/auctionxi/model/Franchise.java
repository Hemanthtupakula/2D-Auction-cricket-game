package com.auctionxi.model;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public enum Franchise {
    MI("MI", "Mumbai Indians", "#004BA0", "#D1AB3E", "Mumbai, Maharashtra"),
    CSK("CSK", "Chennai Super Kings", "#FFFF00", "#0081E9", "Chennai, Tamil Nadu"),
    RCB("RCB", "Royal Challengers Bengaluru", "#EC1C24", "#000000", "Bengaluru, Karnataka"),
    KKR("KKR", "Kolkata Knight Riders", "#3A225D", "#D4AF37", "Kolkata, West Bengal"),
    SRH("SRH", "Sunrisers Hyderabad", "#F26522", "#000000", "Hyderabad, Telangana"),
    RR("RR", "Rajasthan Royals", "#EA1A85", "#254AA5", "Jaipur, Rajasthan"),
    DC("DC", "Delhi Capitals", "#004C93", "#E31B23", "New Delhi, Delhi"),
    PBKS("PBKS", "Punjab Kings", "#ED1B24", "#A7A9AC", "Mohali, Punjab"),
    GT("GT", "Gujarat Titans", "#1B2133", "#D2B48C", "Ahmedabad, Gujarat"),
    LSG("LSG", "Lucknow Super Giants", "#A7D5F2", "#E87722", "Lucknow, Uttar Pradesh");

    private final String code;
    private final String fullName;
    private final String primaryColor;
    private final String secondaryColor;
    private final String city;

    Franchise(String code, String fullName, String primaryColor, String secondaryColor, String city) {
        this.code = code;
        this.fullName = fullName;
        this.primaryColor = primaryColor;
        this.secondaryColor = secondaryColor;
        this.city = city;
    }

    public String getCode() {
        return code;
    }

    public String getFullName() {
        return fullName;
    }

    public String getPrimaryColor() {
        return primaryColor;
    }

    public String getSecondaryColor() {
        return secondaryColor;
    }

    public String getCity() {
        return city;
    }

    public static Optional<Franchise> fromCode(String code) {
        if (code == null) return Optional.empty();
        return Arrays.stream(values())
                .filter(f -> f.code.equalsIgnoreCase(code.trim()))
                .findFirst();
    }

    public static List<Franchise> all() {
        return List.of(values());
    }
}
