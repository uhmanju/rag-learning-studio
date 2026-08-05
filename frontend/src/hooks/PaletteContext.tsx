import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const PALETTES = [
  { id: "vibrant", label: "Vibrant", description: "Purple gradients — the current locked baseline" },
  { id: "bold", label: "Bold Mono", description: "Flat, high-contrast, near-black" },
  { id: "warm", label: "Warm Paper", description: "Cream/parchment, muted warm accent" },
  { id: "slate", label: "Slate", description: "Cool blue-gray, restrained steel-blue accent" },
  { id: "forest", label: "Forest", description: "Muted sage/moss on warm-white" },
  { id: "coral", label: "Coral", description: "Warm peach/coral gradient accent" },
  { id: "midnight", label: "Midnight", description: "The one dark option" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

interface PaletteContextValue {
  palette: PaletteId;
  setPalette: (id: PaletteId) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [palette, setPalette] = useState<PaletteId>("vibrant");

  // Setting an attribute on <body> (rather than passing a className down
  // through every page) is what lets a palette switch apply everywhere
  // instantly — every color in tokens.css is a CSS custom property, so
  // nothing needs to re-render for the new colors to take effect, only
  // this one attribute needs to change.
  useEffect(() => {
    if (palette === "vibrant") {
      document.body.removeAttribute("data-palette");
    } else {
      document.body.setAttribute("data-palette", palette);
    }
  }, [palette]);

  return <PaletteContext.Provider value={{ palette, setPalette }}>{children}</PaletteContext.Provider>;
}

export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used within a PaletteProvider");
  return ctx;
}
