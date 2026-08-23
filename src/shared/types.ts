export const PRIMARY_CLASSIFICATIONS = {
  REC: 'Recreational player, but not enough information yet to classify further.',
  FISH: 'Clearly weak player with significant exploitable mistakes.',
  WHALE: 'Extremely weak, high-action player willing to put lots of money in badly.',
  STATION: 'Calls too wide and too often, especially postflop.',
  MANIAC: 'Extremely aggressive player betting and raising far too wide.',
  NIT: 'Plays very tight and generally gives action with strong ranges.',
  REG: 'Competent regular who generally understands solid poker strategy.',
  GOOD_REG: 'Strong regular who is likely thinking strategically and adjusting to opponents.'
} as const
export type PrimaryClassification = string
export interface PrimaryTag { key: string; name: string; description: string; color: string; isBuiltin: boolean }
export interface ExploitTag { id: number; key: string; name: string; description: string; color: string; isBuiltin: boolean; selectedAt?: string }
export interface StatSnapshot { id: number; playerId: number; hands: number | null; vpip: number | null; pfr: number | null; recordedAt: string }
export interface PlayerProfile { id: number; username: string; notes: string; primaryClassification: PrimaryClassification | null; exploitTags: ExploitTag[]; latestStats: StatSnapshot | null; createdAt: string; updatedAt: string; lastViewedAt: string | null }
export interface PlayerSearchResult { id: number; username: string; hands: number | null; vpip: number | null; pfr: number | null; primaryClassification: string | null; primaryClassificationName?: string | null; exploitTags: ExploitTag[] }
export interface PlayerSummary { id: number; username: string }
export interface PlayerPage { players: PlayerSummary[]; total: number }
export interface Settings { shortcut: string; launchAtLogin: boolean }
export interface PokerNotesAPI {
  searchPlayers(query: string): Promise<PlayerSearchResult[]>; getPlayers(query: string, page: number): Promise<PlayerPage>; getPlayer(id: number): Promise<PlayerProfile>; createPlayer(username: string): Promise<PlayerProfile>
  updateNotes(id: number, notes: string): Promise<void>; commitStats(id: number, stats: Pick<StatSnapshot, 'hands' | 'vpip' | 'pfr'>): Promise<StatSnapshot>
  getStatHistory(id: number): Promise<StatSnapshot[]>; setPrimaryClassification(id: number, value: PrimaryClassification | null): Promise<void>
  toggleExploitTag(id: number, tagId: number): Promise<void>; getExploitTags(): Promise<ExploitTag[]>; createExploitTag(name: string, description: string, color?: string): Promise<ExploitTag>; updateExploitTag(id:number,name:string,description:string,color:string):Promise<void>; deleteExploitTag(id:number):Promise<void>
  getPrimaryTags():Promise<PrimaryTag[]>; createPrimaryTag(name:string,description:string,color:string):Promise<PrimaryTag>; updatePrimaryTag(key:string,name:string,description:string,color:string):Promise<void>; deletePrimaryTag(key:string):Promise<void>
  getSettings(): Promise<Settings>; setSettings(settings: Settings): Promise<Settings>; backupNow(): Promise<string>; hide(): Promise<void>; minimize(): Promise<void>; quit(): Promise<void>; onFocusSearch(callback: () => void): () => void; onBeforeHide(callback: () => void): () => void; onRequestQuit(callback: () => void): () => void
}
