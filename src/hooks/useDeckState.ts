// ---------------------------------------------------------------------------
// Deck navigation state — present-mode reducer hook.
// ---------------------------------------------------------------------------

import { useCallback, useReducer } from "react";

interface DeckState {
  slide: number;
  total: number;
  mode: "present" | "scroll";
}

type DeckAction =
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "GOTO"; index: number }
  | { type: "TOGGLE_SCROLL" }
  | { type: "SET_TOTAL"; total: number };

function deckReducer(state: DeckState, action: DeckAction): DeckState {
  switch (action.type) {
    case "NEXT":
      return { ...state, slide: Math.min(state.slide + 1, state.total - 1) };
    case "PREV":
      return { ...state, slide: Math.max(state.slide - 1, 0) };
    case "GOTO":
      return { ...state, slide: Math.max(0, Math.min(action.index, state.total - 1)) };
    case "TOGGLE_SCROLL":
      return { ...state, mode: state.mode === "present" ? "scroll" : "present" };
    case "SET_TOTAL":
      return { ...state, total: action.total, slide: 0 };
    default:
      return state;
  }
}

export function useDeckState(totalSlides: number) {
  const [state, dispatch] = useReducer(deckReducer, {
    slide: 0,
    total: totalSlides,
    mode: "present",
  });

  const next = useCallback(() => dispatch({ type: "NEXT" }), []);
  const prev = useCallback(() => dispatch({ type: "PREV" }), []);
  const goTo = useCallback((i: number) => dispatch({ type: "GOTO", index: i }), []);
  const toggleScroll = useCallback(() => dispatch({ type: "TOGGLE_SCROLL" }), []);

  return { ...state, next, prev, goTo, toggleScroll };
}
