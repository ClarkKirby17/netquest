"use client";

import type { GameSlug, Difficulty } from "@/db/schema";
import DoorChallenge from "@/components/arcade/DoorChallenge";
import PacketRun from "@/components/arcade/PacketRun";
import NetCli from "@/components/arcade/NetCli";
import { loadDoorQuestions, loadCliMission, recordRun } from "../actions";

/* Client boundary: the games are interactive, the scoring is not.
   Both handlers are server actions, so a run can't be faked from
   the console without going through the same rules. */
export default function GameFrame({
  slug,
  best,
  scoringLeft,
}: {
  slug: GameSlug;
  best: number;
  scoringLeft: number;
}) {
  const submit = (d: Difficulty, score: number) => recordRun(slug, d, score);

  if (slug === "door") {
    return (
      <DoorChallenge
        best={best}
        scoringLeft={scoringLeft}
        fetchQuestions={(d) => loadDoorQuestions(d)}
        submit={submit}
      />
    );
  }
  if (slug === "packet-run") {
    return <PacketRun best={best} scoringLeft={scoringLeft} submit={submit} />;
  }
  return (
    <NetCli
      best={best}
      scoringLeft={scoringLeft}
      descriptions={{
        easy: "Short mission — get in and name the device.",
        medium: "Bring an interface up with an address.",
        hard: "Full bring-up: addressing, security, banner." }}
      fetchMission={(d) => loadCliMission(d)}
      submit={submit}
    />
  );
}
