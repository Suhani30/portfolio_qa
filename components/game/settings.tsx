"use client";

import { createContext, useContext } from "react";
import { DEFAULT_GAME, type GameSettings } from "@/lib/types";

const GameSettingsContext = createContext<GameSettings>(DEFAULT_GAME);

/** Admin-controlled game settings, available to every game component. */
export function GameSettingsProvider({ value, children }: { value: GameSettings; children: React.ReactNode }) {
  return <GameSettingsContext.Provider value={value}>{children}</GameSettingsContext.Provider>;
}

export function useGameSettings() {
  return useContext(GameSettingsContext);
}
