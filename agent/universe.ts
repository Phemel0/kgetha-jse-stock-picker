/**
 * Which JSE shares the agent screens.
 *
 * This is a starter list of large, liquid JSE shares — roughly the Top 40 by size, but not an official
 * index list. Edit it freely: add mid-caps you follow, remove sectors you don't want.
 * Each share costs 4 API requests, so on the free plan (5 requests/minute) 40 shares take ~32 minutes.
 *
 * Set UNIVERSE=exchange to screen every listed share on the JSE instead (slow on the free plan —
 * combine with MAX_STOCKS to cap it).
 */
export const STARTER_UNIVERSE = [
  // Tech, media & telecoms
  "NPN", "PRX", "MTN", "VOD", "MCG",
  // Banks & financials
  "FSR", "SBK", "ABG", "NED", "CPI", "OMU", "SLM", "DSY", "INP", "OUT", "REM",
  // Miners
  "AGL", "BHG", "GLN", "ANG", "GFI", "HAR", "IMP", "NPH", "AMS", "SSW", "EXX", "KIO", "ARI",
  // Consumer & retail
  "BTI", "CFR", "SHP", "WHL", "MRP", "TFG", "CLS", "PIK", "AVI", "TBS",
  // Industrials, energy, property
  "SOL", "BID", "BVT", "MNP", "NRP", "GRT",
];
