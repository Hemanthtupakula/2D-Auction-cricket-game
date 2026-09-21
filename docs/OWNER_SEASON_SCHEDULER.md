# Owner-Only Season Scheduling

A season is franchise-based, but match availability is owner-based.

## Rules
1. Every scheduled match has two franchises and two owning players.
2. A match is runnable only when both owners are present/eligible.
3. An owner can participate in only one active match at a time.
4. If several legal matches do not share an owner, they can start concurrently.
5. Owners do not wait for unrelated matches to finish.
6. When a match completes, its owners become available for the next scheduled match.
7. The scheduler recomputes available matches after every completion/forfeit.
8. There is no CPU/system substitute for a missing owner.
9. If a match cannot start because an owner is unavailable, it remains pending rather than being simulated.
10. Tournament overs are fixed at tournament creation (5 or 20).

## Example
Owners A, B, C, D:
- Match A vs B starts.
- Match C vs D can start at the same time.
- A and B cannot start another match until their match ends.
- C and D cannot start another match until their match ends.
- Once A/B finish, their next legal fixture can begin even if C/D are still playing.

This maximizes owner play without ever assigning a CPU.
