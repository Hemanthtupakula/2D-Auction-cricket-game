# Backend Contract Starter

These are implementation contracts, not generated Java classes.

POST /api/minimatch/proposals
- creatorOwnerId
- opponentOwnerId
- franchiseA
- franchiseB
- overs

POST /api/minimatch/proposals/{id}/accept
POST /api/minimatch/proposals/{id}/decline
POST /api/minimatch/proposals/{id}/cancel

POST /api/minimatch/{id}/xi
POST /api/minimatch/{id}/toss/call
POST /api/minimatch/{id}/toss/choose
POST /api/minimatch/{id}/ready

POST /api/minimatch/{id}/pause
POST /api/minimatch/{id}/resume
POST /api/minimatch/{id}/exit

GET /api/minimatch/{id}
GET /api/minimatch/{id}/scorecard

WebSocket /ws/auction
Suggested destinations:
/app/minimatch/{matchId}/action
/topic/minimatch/{matchId}/state

The existing Auction XI backend should adapt these contracts to its established auth, room, franchise and player identifiers.
