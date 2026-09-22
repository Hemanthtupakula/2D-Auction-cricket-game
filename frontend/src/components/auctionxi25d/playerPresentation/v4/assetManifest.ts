import type {FriendLikenessProfile,PlayerAssetManifestEntry} from './types';

export const AUCTION_XI_PLAYER_ASSETS:PlayerAssetManifestEntry[]=[
 {id:'batter',url:'/assets/players/batter.glb',role:'BATTER',animationSet:'batter',scale:1},
 {id:'bowler',url:'/assets/players/bowler.glb',role:'BOWLER',animationSet:'bowler',scale:1},
 {id:'fielder',url:'/assets/players/fielder.glb',role:'FIELDER',animationSet:'fielder',scale:1},
 {id:'keeper',url:'/assets/players/keeper.glb',role:'KEEPER',animationSet:'keeper',scale:1}
];

/** In-game identities. Reference-photo metadata is kept separate from UI identity. */
export const AUCTION_XI_FRIEND_PROFILES:FriendLikenessProfile[]=[
 {likenessId:'ajay-07',displayName:'AJAY',jerseyNumber:7,role:'BATTER',archetype:'TECHNICAL_BATTER',referencePhotoUrl:'/assets/players/friends/references/ajay_07_reference.jpg',glbUrl:'/assets/players/friends/ajay_07.glb',faceTextureUrl:'/assets/players/friends/ajay_07_face_uv.png',animationSet:'batter',kitPrimary:0x071321,kitSecondary:0x10b9d6,heightScale:1},
 {likenessId:'akshay-18',displayName:'AKSHAY',jerseyNumber:18,role:'BOWLER',archetype:'FAST_BOWLER',referencePhotoUrl:'/assets/players/friends/references/akshay_18_reference.jpg',glbUrl:'/assets/players/friends/akshay_18.glb',faceTextureUrl:'/assets/players/friends/akshay_18_face_uv.png',animationSet:'bowler',kitPrimary:0x071321,kitSecondary:0x10b9d6,heightScale:1},
 {likenessId:'gokul-11',displayName:'GOKUL',jerseyNumber:11,role:'BATTER',archetype:'AGGRESSIVE_BATTER',referencePhotoUrl:'/assets/players/friends/references/gokul_11_reference.jpg',glbUrl:'/assets/players/friends/gokul_11.glb',faceTextureUrl:'/assets/players/friends/gokul_11_face_uv.png',animationSet:'allrounder',kitPrimary:0x071321,kitSecondary:0x10b9d6,heightScale:1},
 {likenessId:'hemanth-naidu-27',displayName:'HEMANTH NAIDU',jerseyNumber:27,role:'BOWLER',archetype:'SWING_BOWLER',referencePhotoUrl:'/assets/players/friends/references/hemanth_naidu_27_reference.jpg',glbUrl:'/assets/players/friends/hemanth_naidu_27.glb',faceTextureUrl:'/assets/players/friends/hemanth_naidu_27_face_uv.png',animationSet:'bowler',kitPrimary:0x071321,kitSecondary:0x10b9d6,heightScale:1},
 {likenessId:'hkt-17',displayName:'HKT',jerseyNumber:17,role:'KEEPER',archetype:'KEEPER',referencePhotoUrl:'/assets/players/friends/references/hkt_17_reference.jpg',glbUrl:'/assets/players/friends/hkt_17.glb',faceTextureUrl:'/assets/players/friends/hkt_17_face_uv.png',animationSet:'keeper',kitPrimary:0x071321,kitSecondary:0x10b9d6,heightScale:1}
];
