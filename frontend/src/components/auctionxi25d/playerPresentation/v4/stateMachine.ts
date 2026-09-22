import type {AuthoritativeBallPresentation,PlayerArchetype,PlayerRole,PresentationState} from './types';

const releaseMap:Record<AuthoritativeBallPresentation['deliveryKind'],PresentationState>={PACE:'RELEASE_PACE',SWING:'RELEASE_SWING',CUTTER:'RELEASE_CUTTER',SLOWER:'RELEASE_SLOWER',YORKER:'RELEASE_YORKER',BOUNCER:'RELEASE_BOUNCER'};
export const releaseState=(k:AuthoritativeBallPresentation['deliveryKind'])=>releaseMap[k];

export function stateFor(role:PlayerRole,e:AuthoritativeBallPresentation,phase:string,a:PlayerArchetype):PresentationState{
 if(phase==='RESET')return role==='KEEPER'?'CROUCH':role==='BOWLER'?'IDLE':'READY';
 if(phase==='DELIVERY'&&role==='BOWLER')return releaseState(e.deliveryKind);
 if((phase==='PRE_BALL'||phase==='DELIVERY')&&(role==='BATTER'||role==='NON_STRIKER'))return role==='BATTER'?'READ':'READY';
 if(phase==='CONTACT'&&role==='BATTER'){
  if(e.batterIntent==='LEAVE')return 'LEAVE';
  if(e.outcome==='WICKET')return e.wicketType?.toLowerCase().includes('edge')?'EDGE':'DISMISS';
  if(e.batterIntent==='DEFENSIVE')return 'DEFENSIVE';
  if(e.batterIntent==='LOFT')return 'LOFT';
  const d=e.direction??0; return d<-.35?'CUT':d>.35?'PULL':'DRIVE';
 }
 if(phase==='FIELDING'&&role==='FIELDER')return e.outcome==='WICKET'?(a==='ATHLETIC_FIELDER'?'DIVE':'REACT'):(e.outcome==='FOUR'||e.outcome==='SIX'?'SPRINT':'REACT');
 if(phase==='FIELDING'&&role==='KEEPER')return e.outcome==='WICKET'?(e.wicketType?.toLowerCase().includes('catch')?'CATCH':'APPEAL'):'COLLECT';
 if(phase==='RESULT'&&e.outcome==='WICKET')return role==='BATTER'?'DISMISS':(role==='BOWLER'||role==='FIELDER'||role==='KEEPER')?'CELEBRATE':'READY';
 if(phase==='RESULT'&&(e.outcome==='FOUR'||e.outcome==='SIX')&&role==='BATTER')return 'CELEBRATE';
 return role==='BOWLER'?'FOLLOW_THROUGH':role==='KEEPER'?'CROUCH':'READY';
}

export const stateDuration=(state:PresentationState)=>{
 if(state.startsWith('RELEASE_'))return .36;
 if(['DRIVE','CUT','PULL','FLICK','SWEEP','LOFT','DEFENSIVE'].includes(state))return .55;
 if(['DIVE','CATCH','THROW','PICKUP'].includes(state))return .48;
 if(state==='CELEBRATE')return 1.4;
 return .35;
};
