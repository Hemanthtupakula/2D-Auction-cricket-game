import urllib.request
import json

BASE = "http://localhost:8080/api/rooms"

def post(url, payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

print("=== AUCTION XI ZERO-AI & FAIR HUMAN ALLOCATION TEST ===")

# 1. Create Room (Host Hemanth)
create_res = post(BASE, {"roomName": "IPL Mega Auction 2026", "hostDisplayName": "Hemanth"})
room_code = create_res["roomCode"]
host_id = create_res["hostMemberId"]
print(f"1. Room [{room_code}] created by Host [{host_id}]")

# 2. Join Akshay (Member 2) and Rahul (Member 3) -> Total 3 members
join2 = post(f"{BASE}/join", {"roomCode": room_code, "displayName": "Akshay"})
akshay_id = [m["memberId"] for m in join2["members"] if m["displayName"] == "Akshay"][0]

join3 = post(f"{BASE}/join", {"roomCode": room_code, "displayName": "Rahul"})
rahul_id = [m["memberId"] for m in join3["members"] if m["displayName"] == "Rahul"][0]

state3 = get(f"{BASE}/{room_code}/allocation")
host_quota = [m["targetQuota"] for m in state3["members"] if m["memberId"] == host_id][0]
akshay_quota = [m["targetQuota"] for m in state3["members"] if m["memberId"] == akshay_id][0]
rahul_quota = [m["targetQuota"] for m in state3["members"] if m["memberId"] == rahul_id][0]

print(f"2. 3 Members in room -> Quotas: Host={host_quota}, Akshay={akshay_quota}, Rahul={rahul_quota}")
assert host_quota == 4, f"Expected host quota 4, got {host_quota}"
assert akshay_quota == 3, f"Expected Akshay quota 3, got {akshay_quota}"
assert rahul_quota == 3, f"Expected Rahul quota 3, got {rahul_quota}"
assert host_quota + akshay_quota + rahul_quota == 10, "Total quotas must equal 10"

# 3. Early start attempt with unowned franchises must be rejected (ZERO AI RULE)
try:
    post(f"{BASE}/{room_code}/lock-start", {"hostMemberId": host_id})
    raise AssertionError("Auction start should be rejected when unowned franchises exist")
except urllib.error.HTTPError as e:
    assert e.code == 400, f"Expected 400 Bad Request, got {e.code}"
    err = json.loads(e.read().decode('utf-8'))
    assert err["errorCode"] == "QUOTA_INCOMPLETE"
    print(f"3. Premature start safely rejected: {err['message']}")

# 4. Host claims their 4 franchises: MI, CSK, RCB, KKR
post(f"{BASE}/{room_code}/claim", {"memberId": host_id, "franchiseCode": "MI"})
post(f"{BASE}/{room_code}/claim", {"memberId": host_id, "franchiseCode": "CSK"})
post(f"{BASE}/{room_code}/claim", {"memberId": host_id, "franchiseCode": "RCB"})
claim4 = post(f"{BASE}/{room_code}/claim", {"memberId": host_id, "franchiseCode": "KKR"})
host_held = [m["heldCount"] for m in claim4["members"] if m["memberId"] == host_id][0]
print(f"4. Host claimed 4 franchises: MI, CSK, RCB, KKR (Held: {host_held}/4)")

# Host attempting 5th claim must be rejected by quota
try:
    post(f"{BASE}/{room_code}/claim", {"memberId": host_id, "franchiseCode": "SRH"})
    raise AssertionError("Exceeding quota must be rejected")
except urllib.error.HTTPError as e:
    assert e.code == 400
    err = json.loads(e.read().decode('utf-8'))
    assert err["errorCode"] == "QUOTA_EXCEEDED"
    print(f"   Host 5th claim correctly rejected by quota: {err['errorCode']}")

# 5. Akshay claims their 3 franchises: SRH, RR, DC
post(f"{BASE}/{room_code}/claim", {"memberId": akshay_id, "franchiseCode": "SRH"})
post(f"{BASE}/{room_code}/claim", {"memberId": akshay_id, "franchiseCode": "RR"})
post(f"{BASE}/{room_code}/claim", {"memberId": akshay_id, "franchiseCode": "DC"})
print("5. Akshay claimed 3 franchises: SRH, RR, DC (Held: 3/3)")

# 6. Rahul claims their 3 franchises: PBKS, GT, LSG
post(f"{BASE}/{room_code}/claim", {"memberId": rahul_id, "franchiseCode": "PBKS"})
post(f"{BASE}/{room_code}/claim", {"memberId": rahul_id, "franchiseCode": "GT"})
claim_final = post(f"{BASE}/{room_code}/claim", {"memberId": rahul_id, "franchiseCode": "LSG"})
print("6. Rahul claimed 3 franchises: PBKS, GT, LSG (Held: 3/3)")

assert claim_final["claimedTeamCount"] == 10, "All 10 franchises must be claimed"
assert claim_final["openTeamCount"] == 0, "Zero open franchises remain"
assert claim_final["readyToLock"] is True, "Room must be ready to lock"
print("   All 10 Franchises claimed by humans. readyToLock = True")

# 7. Host locks teams and starts auction
locked = post(f"{BASE}/{room_code}/lock-start", {"hostMemberId": host_id})
assert locked["status"] == "AUCTION_ACTIVE", "Status must be AUCTION_ACTIVE"
human_seats = [s for s in locked["seats"] if s["isHuman"]]
assert len(human_seats) == 10, "Exactly 10 seats must be Human"
print("\n7. TEAMS LOCKED & AUCTION STARTED SUCCESSFULLY!")
for s in locked["seats"]:
    print(f"   [{s['code']}] {s['name']:30} -> {s['ownerDisplayName']} (HUMAN)")

# 8. Post-start mutation rejected
try:
    post(f"{BASE}/join", {"roomCode": room_code, "displayName": "Intruder"})
    raise AssertionError("Joining active auction should fail")
except urllib.error.HTTPError as e:
    assert e.code == 409
    print("\n8. Post-start mutation safely rejected with HTTP 409 AUCTION_ALREADY_STARTED")

print("\n>>> ALL ZERO-AI CRITICAL SPECIFICATIONS VERIFIED AND PASSED 100%! <<<")
