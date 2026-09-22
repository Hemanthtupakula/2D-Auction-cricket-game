// Example only. Do not copy this file into the existing app blindly.
// At the existing authoritative ball event boundary:
//
// const [presentationEvent,setPresentationEvent] = useState<AuthoritativeBallEvent>();
//
// <DreamStageAdapter event={presentationEvent} />
//
// When the server sends BALL_RESULT / equivalent authoritative delivery event,
// normalize it once and setPresentationEvent(normalizedEvent).
// The presentation layer must never calculate the score or mutate match state.
