import { type CCEvent, type CCLaneType } from "../lib/automationTypes.js";
import { type BeatNote } from "../lib/player.js";
import { LANE_DEFS } from "../lib/piano.js";
import { useTracks } from "../context/TracksContext.js";
import { AutomationLane } from "./AutomationLane.js";

interface AutomationLanesProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function AutomationLanes({ scrollRef }: AutomationLanesProps) {
  const {
    editingNotes,
    editingTrackCCEvents,
    editingTrackIndex,
    updateNotesWithHistory,
    updateCCEventsWithHistory,
    updateNotes,
    updateCCEvents,
  } = useTracks();

  const typedNotes = editingNotes as (BeatNote & { id: string })[];

  function handleVelocityChange(noteId: string, velocity: number, commit: boolean) {
    const updated = typedNotes.map((n) =>
      n.id === noteId ? { ...n, velocity } : n,
    );
    if (commit) {
      updateNotesWithHistory(editingTrackIndex, updated, "velocity");
    } else {
      updateNotes(editingTrackIndex, updated);
    }
  }

  function handleCCChange(
    lane: CCLaneType,
    events: CCEvent[],
    label: string,
    commit: boolean,
  ) {
    if (commit) {
      updateCCEventsWithHistory(editingTrackIndex, lane, events, label);
    } else {
      updateCCEvents(editingTrackIndex, lane, events);
    }
  }

  return (
    <div className="auto-lanes">
      {LANE_DEFS.map((meta) => (
        <AutomationLane
          key={meta.type}
          meta={meta}
          notes={typedNotes}
          ccEvents={
            meta.type !== "velocity"
              ? editingTrackCCEvents[meta.type as CCLaneType]
              : []
          }
          scrollRef={scrollRef}
          onVelocityChange={handleVelocityChange}
          onCCChange={(events, label, commit) =>
            handleCCChange(meta.type as CCLaneType, events, label, commit)
          }
        />
      ))}
    </div>
  );
}
