declare module "@/components/AeroShards" {
  import type { ComponentType } from "react";

  type AeroShardsProps = {
    backgroundColor?: string;
    shardColor?: string;
    accentColor?: string;
    placement?: "right" | "left" | "center" | "full";
    flow?: "stream" | "vortex" | "ribbon";
    material?: "pearl" | "chrome" | "satin";
    detail?: "bold" | "balanced" | "fine";
    effect?: "none" | "dither" | "ascii";
    scale?: number;
    spread?: number;
    depth?: number;
    speed?: number;
    spin?: number;
    interaction?: "none" | "repel" | "attract";
    density?: number;
    shardSize?: number;
    stretch?: number;
    turbulence?: number;
    glow?: number;
    edgeSoftness?: number;
    bloom?: number;
    grain?: number;
    chromaticAberration?: number;
    transitionDuration?: number;
    interactionRadius?: number;
    interactionStrength?: number;
    rippleIntensity?: number;
    holdToGather?: boolean;
    paused?: boolean;
    className?: string;
    onError?: (error: Error) => void;
  };

  const AeroShards: ComponentType<AeroShardsProps>;
  export default AeroShards;
}
