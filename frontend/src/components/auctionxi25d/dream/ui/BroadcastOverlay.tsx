import './broadcastOverlay.css';
import {AuthoritativeBallEvent} from '../core/types';
export function BroadcastOverlay({event}: {event?:AuthoritativeBallEvent}){if(!event)return null;return <div className="axi-broadcast-overlay">
 <div className="axi-score-strip"><span>AUCTION XI</span><b>{event.over}.{event.ball}</b><span>{event.deliveryKind}</span><span>{event.speed} km/h</span></div>
 <div className="axi-ball-card"><strong>{event.outcome}</strong><small>{event.batterIntent} · {String(event.timingBand).replace(/_/g,' ')}</small></div>
 </div>}
