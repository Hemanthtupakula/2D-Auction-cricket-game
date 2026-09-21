package com.auctionxi.match;

import com.auctionxi.match.dto.*;
import com.auctionxi.match.model.MiniMatchProposal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/minimatch")
public class MiniMatchProposalController {

    private final MiniMatchService miniMatchService;

    @Autowired
    public MiniMatchProposalController(MiniMatchService miniMatchService) {
        this.miniMatchService = miniMatchService;
    }

    @PostMapping("/proposals")
    public ResponseEntity<MiniMatchProposal> createProposal(@RequestBody ProposalRequestDto dto) {
        return ResponseEntity.ok(miniMatchService.createProposal(dto));
    }

    @GetMapping("/proposals/room/{roomId}")
    public ResponseEntity<List<MiniMatchProposal>> getProposalsForRoom(@PathVariable String roomId) {
        return ResponseEntity.ok(miniMatchService.getProposalsForRoom(roomId));
    }

    @PostMapping("/proposals/{id}/accept")
    public ResponseEntity<MiniMatch> acceptProposal(
            @PathVariable("id") String proposalId,
            @RequestBody Map<String, String> body
    ) {
        String ownerId = body.get("ownerId");
        return ResponseEntity.ok(miniMatchService.acceptProposal(proposalId, ownerId));
    }

    @PostMapping("/proposals/{id}/decline")
    public ResponseEntity<MiniMatchProposal> declineProposal(
            @PathVariable("id") String proposalId,
            @RequestBody Map<String, String> body
    ) {
        String ownerId = body.get("ownerId");
        return ResponseEntity.ok(miniMatchService.declineProposal(proposalId, ownerId));
    }

    @PostMapping("/proposals/{id}/cancel")
    public ResponseEntity<MiniMatchProposal> cancelProposal(
            @PathVariable("id") String proposalId,
            @RequestBody Map<String, String> body
    ) {
        String ownerId = body.get("ownerId");
        return ResponseEntity.ok(miniMatchService.cancelProposal(proposalId, ownerId));
    }

    @PostMapping("/{id}/xi")
    public ResponseEntity<MiniMatch> submitXi(
            @PathVariable("id") String matchId,
            @RequestBody XiSelectionDto dto
    ) {
        return ResponseEntity.ok(miniMatchService.submitXi(matchId, dto));
    }

    @PostMapping("/{id}/toss/call")
    public ResponseEntity<MiniMatch> callToss(
            @PathVariable("id") String matchId,
            @RequestBody TossCallDto dto
    ) {
        return ResponseEntity.ok(miniMatchService.callToss(matchId, dto));
    }

    @PostMapping("/{id}/toss/choose")
    public ResponseEntity<MiniMatch> chooseToss(
            @PathVariable("id") String matchId,
            @RequestBody TossChoiceDto dto
    ) {
        return ResponseEntity.ok(miniMatchService.chooseToss(matchId, dto));
    }

    @PostMapping("/{id}/ready")
    public ResponseEntity<MiniMatch> ready(
            @PathVariable("id") String matchId,
            @RequestBody Map<String, String> body
    ) {
        String ownerId = body.get("ownerId");
        return ResponseEntity.ok(miniMatchService.setReady(matchId, ownerId));
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<MiniMatch> pauseMatch(
            @PathVariable("id") String matchId,
            @RequestBody MatchPauseDto dto
    ) {
        return ResponseEntity.ok(miniMatchService.pauseMatch(matchId, dto.getOwnerId()));
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<MiniMatch> resumeMatch(
            @PathVariable("id") String matchId,
            @RequestBody Map<String, String> body
    ) {
        String ownerId = body.get("ownerId");
        return ResponseEntity.ok(miniMatchService.resumeMatch(matchId, ownerId));
    }

    @PostMapping("/{id}/exit")
    public ResponseEntity<MiniMatch> exitMatch(
            @PathVariable("id") String matchId,
            @RequestBody MatchExitDto dto
    ) {
        return ResponseEntity.ok(miniMatchService.forfeitMatch(matchId, dto.getOwnerId()));
    }

    @PostMapping("/{id}/openers")
    public ResponseEntity<MiniMatch> selectOpeners(
            @PathVariable("id") String matchId,
            @RequestBody Map<String, String> body
    ) {
        MiniMatch m = miniMatchService.getMatchById(matchId);
        String memberId = body.get("memberId") != null ? body.get("memberId") : body.get("ownerId");
        return ResponseEntity.ok(miniMatchService.selectOpeners(m.getRoomCode(), matchId, memberId, body.get("strikerId"), body.get("nonStrikerId")));
    }

    @PostMapping("/{id}/select-bowler")
    public ResponseEntity<MiniMatch> selectBowler(
            @PathVariable("id") String matchId,
            @RequestBody Map<String, String> body
    ) {
        MiniMatch m = miniMatchService.getMatchById(matchId);
        String memberId = body.get("memberId") != null ? body.get("memberId") : body.get("ownerId");
        String bowlerId = body.get("bowlerId") != null ? body.get("bowlerId") : body.get("playerId");
        return ResponseEntity.ok(miniMatchService.selectBowler(m.getRoomCode(), matchId, memberId, bowlerId));
    }

    @PostMapping("/{id}/action/bat")
    public ResponseEntity<MiniMatch> submitBatGameplay(
            @PathVariable("id") String matchId,
            @RequestBody Map<String, String> body
    ) {
        MiniMatch m = miniMatchService.getMatchById(matchId);
        String memberId = body.get("memberId") != null ? body.get("memberId") : body.get("ownerId");
        return ResponseEntity.ok(miniMatchService.submitBatAction(m.getRoomCode(), matchId, memberId, body.get("action"), body.get("actionId")));
    }

    @PostMapping("/{id}/action/bowl")
    public ResponseEntity<MiniMatch> submitBowlGameplay(
            @PathVariable("id") String matchId,
            @RequestBody Map<String, String> body
    ) {
        MiniMatch m = miniMatchService.getMatchById(matchId);
        String memberId = body.get("memberId") != null ? body.get("memberId") : body.get("ownerId");
        return ResponseEntity.ok(miniMatchService.submitBowlAction(m.getRoomCode(), matchId, memberId, body.get("action"), body.get("actionId")));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MiniMatch> getMatch(@PathVariable("id") String matchId) {
        return ResponseEntity.ok(miniMatchService.getMatchById(matchId));
    }

    @GetMapping("/{id}/scorecard")
    public ResponseEntity<Map<String, Object>> getScorecard(@PathVariable("id") String matchId) {
        return ResponseEntity.ok(miniMatchService.getScorecard(matchId));
    }
}
