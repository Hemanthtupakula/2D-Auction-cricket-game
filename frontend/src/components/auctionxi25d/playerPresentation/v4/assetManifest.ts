import type {PlayerAssetManifestEntry} from './types';

/**
 * Production asset contract. Put licensed GLB files under /public/assets/players/
 * and point entries at those URLs. The runtime falls back to procedural players
 * until a matching GLB has been preloaded.
 */
export const AUCTION_XI_PLAYER_ASSETS:PlayerAssetManifestEntry[]=[
 {id:'batter',url:'/assets/players/batter.glb',role:'BATTER',animationSet:'batter',scale:1},
 {id:'bowler',url:'/assets/players/bowler.glb',role:'BOWLER',animationSet:'bowler',scale:1},
 {id:'fielder',url:'/assets/players/fielder.glb',role:'FIELDER',animationSet:'fielder',scale:1},
 {id:'keeper',url:'/assets/players/keeper.glb',role:'KEEPER',animationSet:'keeper',scale:1}
];
