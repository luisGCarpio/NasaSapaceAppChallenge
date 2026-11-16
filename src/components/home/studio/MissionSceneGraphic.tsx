import type { RefObject } from 'react';
import type { MissionActionId } from './mission-scene-machine';
import { HydrateScene } from './MissionHydrateScene';
import { ExerciseScene } from './MissionExerciseScene';
import { RestScene } from './MissionRestScene';
import { BreatheScene } from './MissionBreatheScene';
import { CommsScene } from './MissionCommsScene';

export function MissionSceneGraphic({ actionId, breathLabel, breatheRingRef, breatheOrbRef }: {
  actionId: MissionActionId;
  breathLabel: string;
  breatheRingRef: RefObject<SVGCircleElement | null>;
  breatheOrbRef: RefObject<SVGGElement | null>;
}) {
  switch (actionId) {
    case 'hydrate': return <HydrateScene />;
    case 'exercise': return <ExerciseScene />;
    case 'rest': return <RestScene />;
    case 'breathe': return <BreatheScene breathLabel={breathLabel} breatheRingRef={breatheRingRef} breatheOrbRef={breatheOrbRef} />;
    case 'comms': return <CommsScene />;
  }
}
