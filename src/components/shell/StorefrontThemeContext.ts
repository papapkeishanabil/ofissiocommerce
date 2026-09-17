"use client";

import { createContext } from "react";

// React context crosses portals, unlike CSS inheritance. Shared dialogs use
// this to retain storefront typography without changing admin dialogs.
export const StorefrontThemeContext = createContext(false);
