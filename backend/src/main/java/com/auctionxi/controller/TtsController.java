package com.auctionxi.controller;

import com.auctionxi.service.AzureTtsService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/tts")
public class TtsController {

    private final AzureTtsService azureTtsService;

    public TtsController(AzureTtsService azureTtsService) {
        this.azureTtsService = azureTtsService;
    }

    /**
     * Synthesizes text to MP3 audio stream using female Indian-English voice (en-IN-NeerjaNeural).
     * Supports both GET and POST requests.
     */
    @GetMapping(value = "/speak", produces = "audio/mpeg")
    public ResponseEntity<byte[]> speakGet(
            @RequestParam String text,
            @RequestParam(required = false) String voice) {
        return handleSpeak(text, voice);
    }

    @PostMapping(value = "/speak", produces = "audio/mpeg")
    public ResponseEntity<byte[]> speakPost(@RequestBody Map<String, String> body) {
        String text = body != null ? body.get("text") : null;
        String voice = body != null ? body.get("voice") : null;
        return handleSpeak(text, voice);
    }

    private ResponseEntity<byte[]> handleSpeak(String text, String voice) {
        if (!azureTtsService.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .header("X-TTS-Status", "NotConfigured")
                    .build();
        }

        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Optional<byte[]> audioOpt = azureTtsService.synthesize(text, voice);
        if (audioOpt.isPresent()) {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.valueOf("audio/mpeg"));
            headers.setContentLength(audioOpt.get().length);
            headers.setCacheControl("public, max-age=86400");
            headers.set("X-TTS-Voice", voice != null ? voice : "en-IN-NeerjaNeural");

            return new ResponseEntity<>(audioOpt.get(), headers, HttpStatus.OK);
        } else {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .header("X-TTS-Status", "UnavailableOrQuotaReached")
                    .build();
        }
    }

    /**
     * Returns Azure Speech F0 usage report and safety status.
     */
    @GetMapping("/usage")
    public ResponseEntity<Map<String, Object>> getUsage() {
        return ResponseEntity.ok(azureTtsService.getUsageReport());
    }
}
