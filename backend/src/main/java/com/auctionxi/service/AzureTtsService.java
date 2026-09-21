package com.auctionxi.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.YearMonth;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Server-authoritative Azure AI Speech (F0 Free Tier) Dynamic TTS Service.
 *
 * Guarantees:
 * 1. Female Indian-English Voice standard: en-IN-NeerjaNeural
 * 2. 500,000 char/month F0 quota enforcement with circuit breaker at 95% (475,000 chars)
 * 3. In-memory MD5 cache to prevent duplicate character consumption
 * 4. Azure API key is strictly kept on the server and never sent to clients
 * 5. Fast watchdog timeout (2500ms) with clean fallback when offline or unconfigured
 */
@Service
public class AzureTtsService {

    private static final Logger log = LoggerFactory.getLogger(AzureTtsService.class);

    private static final long MONTHLY_QUOTA_LIMIT = 500_000L;
    private static final long THRESHOLD_70_PCT = (long) (MONTHLY_QUOTA_LIMIT * 0.70); // 350,000
    private static final long THRESHOLD_80_PCT = (long) (MONTHLY_QUOTA_LIMIT * 0.80); // 400,000
    private static final long THRESHOLD_90_PCT = (long) (MONTHLY_QUOTA_LIMIT * 0.90); // 450,000
    private static final long THRESHOLD_CIRCUIT_BREAKER = (long) (MONTHLY_QUOTA_LIMIT * 0.95); // 475,000

    private final String speechKey;
    private final String speechRegion;
    private final String defaultVoice;
    private final HttpClient httpClient;

    // Cache: MD5(voice + ":" + text) -> byte[] audio (MP3)
    private final Map<String, byte[]> audioCache = new ConcurrentHashMap<>();

    // Character consumption tracking
    private final AtomicLong charsUsed = new AtomicLong(0);
    private volatile YearMonth currentTrackingMonth = YearMonth.now();

    public AzureTtsService(
            @Value("${azure.speech.key:${AZURE_SPEECH_KEY:}}") String speechKey,
            @Value("${azure.speech.region:${AZURE_SPEECH_REGION:centralindia}}") String speechRegion,
            @Value("${azure.speech.voice:${AZURE_SPEECH_VOICE:en-IN-NeerjaNeural}}") String defaultVoice) {
        this.speechKey = speechKey != null ? speechKey.trim() : "";
        this.speechRegion = speechRegion != null && !speechRegion.isBlank() ? speechRegion.trim() : "centralindia";
        this.defaultVoice = defaultVoice != null && !defaultVoice.isBlank() ? defaultVoice.trim() : "en-IN-NeerjaNeural";

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(2500))
                .build();

        if (isConfigured()) {
            log.info("[AzureTtsService] Azure AI Speech enabled. Region: {}, Voice: {}", this.speechRegion, this.defaultVoice);
        } else {
            log.info("[AzureTtsService] Azure AI Speech key not provided. Running in pre-generated & client fallback mode.");
        }
    }

    public boolean isConfigured() {
        return !speechKey.isEmpty();
    }

    /**
     * Synthesizes text into an MP3 byte array using en-IN-NeerjaNeural female voice.
     * Returns Optional.empty() if not configured, quota exceeded, or upstream error.
     */
    public Optional<byte[]> synthesize(String text) {
        return synthesize(text, this.defaultVoice);
    }

    public Optional<byte[]> synthesize(String text, String voiceName) {
        if (!isConfigured()) {
            return Optional.empty();
        }

        if (text == null || text.trim().isEmpty()) {
            return Optional.empty();
        }

        String cleanText = text.trim();
        String activeVoice = (voiceName != null && !voiceName.isBlank()) ? voiceName.trim() : this.defaultVoice;

        // 1. Check in-memory cache
        String cacheKey = generateCacheKey(activeVoice, cleanText);
        byte[] cached = audioCache.get(cacheKey);
        if (cached != null) {
            log.debug("[AzureTtsService] Cache hit for: '{}'", cleanText);
            return Optional.of(cached);
        }

        // 2. Check and reset monthly quota if month rolled over
        checkMonthRollover();

        // 3. Circuit breaker check (95% safety ceiling)
        int charCount = cleanText.length();
        long currentUsage = charsUsed.get();
        if (currentUsage + charCount >= THRESHOLD_CIRCUIT_BREAKER) {
            log.error("[AzureTtsService] Free F0 circuit breaker TRIPPED! Usage: {} / {} chars. Refusing dynamic request.",
                    currentUsage, MONTHLY_QUOTA_LIMIT);
            return Optional.empty();
        }

        // 4. Build SSML for Azure TTS
        String ssml = buildSsml(cleanText, activeVoice);

        try {
            String endpoint = String.format("https://%s.tts.speech.microsoft.com/cognitiveservices/v1", this.speechRegion);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofMillis(3000))
                    .header("Ocp-Apim-Subscription-Key", this.speechKey)
                    .header("Content-Type", "application/ssml+xml")
                    .header("X-Microsoft-OutputFormat", "audio-16khz-128kbitrate-mono-mp3")
                    .header("User-Agent", "AuctionXI-AudioEngine/1.0")
                    .POST(HttpRequest.BodyPublishers.ofString(ssml, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

            if (response.statusCode() == 200 && response.body() != null && response.body().length > 0) {
                byte[] audioData = response.body();

                // Increment character counter
                long newUsage = charsUsed.addAndGet(charCount);
                checkUsageAlerts(newUsage);

                // Cache audio
                audioCache.put(cacheKey, audioData);

                log.info("[AzureTtsService] Synthesized '{}' ({} chars). Month total: {}/{} ({}%)",
                        cleanText, charCount, newUsage, MONTHLY_QUOTA_LIMIT,
                        String.format("%.2f", (newUsage * 100.0) / MONTHLY_QUOTA_LIMIT));

                return Optional.of(audioData);
            } else {
                log.warn("[AzureTtsService] Azure Speech API returned status {}: {}",
                        response.statusCode(), new String(response.body(), StandardCharsets.UTF_8));
                return Optional.empty();
            }

        } catch (Exception e) {
            log.warn("[AzureTtsService] TTS request failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private String buildSsml(String text, String voice) {
        String escaped = escapeXml(text);
        // Standardize on +15% playback rate for crisp, energetic auction tempo
        return "<speak version='1.0' xml:lang='en-IN'>"
                + "<voice xml:lang='en-IN' xml:gender='Female' name='" + voice + "'>"
                + "<prosody rate='+15.00%'>"
                + escaped
                + "</prosody>"
                + "</voice>"
                + "</speak>";
    }

    private String escapeXml(String input) {
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    private String generateCacheKey(String voice, String text) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest((voice + ":" + text).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            return (voice + ":" + text).hashCode() + "";
        }
    }

    private void checkMonthRollover() {
        YearMonth now = YearMonth.now();
        if (!now.equals(currentTrackingMonth)) {
            synchronized (this) {
                if (!now.equals(currentTrackingMonth)) {
                    log.info("[AzureTtsService] Month rolled over from {} to {}. Resetting quota counter.",
                            currentTrackingMonth, now);
                    charsUsed.set(0);
                    currentTrackingMonth = now;
                    audioCache.clear();
                }
            }
        }
    }

    private void checkUsageAlerts(long usage) {
        if (usage >= THRESHOLD_90_PCT) {
            log.warn("[AzureTtsService] [CRITICAL ALERT] F0 Quota >= 90%! Used: {} / {}", usage, MONTHLY_QUOTA_LIMIT);
        } else if (usage >= THRESHOLD_80_PCT) {
            log.warn("[AzureTtsService] [WARNING] F0 Quota >= 80%! Used: {} / {}", usage, MONTHLY_QUOTA_LIMIT);
        } else if (usage >= THRESHOLD_70_PCT) {
            log.info("[AzureTtsService] [NOTICE] F0 Quota >= 70%. Used: {} / {}", usage, MONTHLY_QUOTA_LIMIT);
        }
    }

    public Map<String, Object> getUsageReport() {
        checkMonthRollover();
        long used = charsUsed.get();
        double pct = (used * 100.0) / MONTHLY_QUOTA_LIMIT;
        boolean circuitBreaker = used >= THRESHOLD_CIRCUIT_BREAKER;

        return Map.of(
                "configured", isConfigured(),
                "region", speechRegion,
                "voice", defaultVoice,
                "month", currentTrackingMonth.toString(),
                "charsUsed", used,
                "monthlyQuota", MONTHLY_QUOTA_LIMIT,
                "percentUsed", Math.round(pct * 100.0) / 100.0,
                "circuitBreakerTripped", circuitBreaker,
                "cachedPhrasesCount", audioCache.size()
        );
    }
}
