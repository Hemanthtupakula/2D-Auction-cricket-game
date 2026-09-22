/**
 * Auction XI Phase V1 replacement facade.
 * No canvas-drawn geometric player bodies are used here.
 */
import React from "react";
import MiniMatch25DStage, { type MiniMatch25DProps } from "./auctionxi25d/MiniMatch25DStage";

export type MiniMatch3DCanvasProps = MiniMatch25DProps & Record<string, unknown>;

export const MiniMatch3DCanvas: React.FC<MiniMatch3DCanvasProps> = (props) => (
  <MiniMatch25DStage {...props} />
);

export default MiniMatch3DCanvas;
