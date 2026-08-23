import Database from 'better-sqlite3'
import initialSql from './001_initial.sql?raw'
import customTagsSql from './002_custom_tags.sql?raw'
import type { ExploitTag, PlayerProfile, PlayerSearchResult, PlayerSummary, PrimaryClassification, PrimaryTag, StatSnapshot } from '../../shared/types'

const builtins = [
  ['no_river_bluffs','NO RIVER BLUFFS','River aggression has been overwhelmingly value-heavy, so fold bluff-catchers more often.'], ['river_bluffy','RIVER BLUFFY','Has shown excessive river bluffs, so bluff-catch more aggressively against river action.'], ['calls_down_light','CALLS DOWN LIGHT','Will call multiple streets with marginal made hands and weak bluff-catchers.'], ['overfolds','OVERFOLDS','Gives up too frequently when facing meaningful aggression.'], ['overvalues_pairs','OVERVALUES PAIRS','Commits too much money with one-pair and other medium-strength hands.'], ['3b_light','3B LIGHT','Has shown a willingness to 3-bet substantially wider than a value-heavy range.'], ['calls_3b_wide','CALLS 3B WIDE','Continues against 3-bets with hands that should usually be folded.'], ['folds_to_3b','FOLDS TO 3B','Gives up to 3-bets frequently enough to target with additional bluff 3-bets.'], ['traps','TRAPS','Frequently slowplays strong hands instead of betting or raising immediately.'], ['sizing_tells','SIZING TELLS','Bet sizing appears correlated with hand strength; consult the written notes for details.']
]
export class Store {
  constructor(readonly db: Database.Database) { db.pragma('foreign_keys = ON'); db.pragma('journal_mode = WAL'); this.migrate() }
  static open(path: string) { return new Store(new Database(path)) }
  private migrate() {
    this.db.exec('CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY)')
    if (!this.db.prepare('SELECT 1 FROM migrations WHERE version=1').get()) this.db.transaction(() => {
      this.db.exec(initialSql)
      const insert = this.db.prepare('INSERT OR IGNORE INTO exploit_tags(key,name,description,sort_order) VALUES(?,?,?,?)')
      builtins.forEach((tag, i) => insert.run(...tag, i))
      this.db.prepare('INSERT INTO migrations VALUES(1)').run()
    })()
    if (!this.db.prepare('SELECT 1 FROM migrations WHERE version=2').get()) this.db.transaction(() => { this.db.exec(customTagsSql);this.db.prepare('INSERT INTO migrations VALUES(2)').run() })()
  }
  private tags(id: number): ExploitTag[] { return this.db.prepare(`SELECT t.id,t.key,t.name,t.description,t.color,t.is_builtin isBuiltin,pt.selected_at selectedAt FROM exploit_tags t JOIN player_exploit_tags pt ON pt.exploit_tag_id=t.id WHERE pt.player_id=? ORDER BY pt.selected_at DESC`).all(id) as ExploitTag[] }
  private snapshot(row: any): StatSnapshot | null { return row?.stat_id ? { id: row.stat_id, playerId: row.id, hands: row.hands, vpip: row.vpip, pfr: row.pfr, recordedAt: row.recorded_at } : null }
  getPlayer(id: number): PlayerProfile {
    const row: any = this.db.prepare(`SELECT p.*,s.id stat_id,s.hands,s.vpip,s.pfr,s.recorded_at FROM players p LEFT JOIN stat_snapshots s ON s.id=(SELECT id FROM stat_snapshots WHERE player_id=p.id ORDER BY recorded_at DESC,id DESC LIMIT 1) WHERE p.id=?`).get(id)
    if (!row) throw new Error('Player not found')
    this.db.prepare('UPDATE players SET last_viewed_at=? WHERE id=?').run(new Date().toISOString(), id)
    return { id: row.id, username: row.username, notes: row.notes, primaryClassification: row.primary_classification, exploitTags: this.tags(id), latestStats: this.snapshot(row), createdAt: row.created_at, updatedAt: row.updated_at, lastViewedAt: row.last_viewed_at }
  }
  createPlayer(username: string) { const now = new Date().toISOString(); const result = this.db.prepare('INSERT INTO players(username,created_at,updated_at) VALUES(?,?,?)').run(username,now,now); return this.getPlayer(Number(result.lastInsertRowid)) }
  allPlayers(query:string,page:number){const match=`%${query}%`,total=(this.db.prepare('SELECT COUNT(*) total FROM players WHERE username LIKE ? COLLATE NOCASE').get(match) as {total:number}).total;return {players:this.db.prepare('SELECT id,username FROM players WHERE username LIKE ? COLLATE NOCASE ORDER BY username COLLATE NOCASE LIMIT 100 OFFSET ?').all(match,page*100) as PlayerSummary[],total}}
  search(query: string): PlayerSearchResult[] {
    const q = query.toLocaleLowerCase(); const rows: any[] = this.db.prepare(`SELECT p.*,pt.name primary_name,s.hands,s.vpip,s.pfr FROM players p LEFT JOIN primary_tags pt ON pt.key=p.primary_classification LEFT JOIN stat_snapshots s ON s.id=(SELECT id FROM stat_snapshots WHERE player_id=p.id ORDER BY recorded_at DESC,id DESC LIMIT 1) WHERE username LIKE ? COLLATE NOCASE LIMIT 200`).all(`%${query}%`)
    const distance = (a: string, b: string) => { const d = Array.from({length:a.length+1},(_,i)=>[i]); for(let j=1;j<=b.length;j++)d[0][j]=j; for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return d[a.length][b.length] }
    if (rows.length < 30) for (const row of this.db.prepare('SELECT * FROM players LIMIT 1000').all() as any[]) if (!rows.some(r=>r.id===row.id) && distance(row.username.toLowerCase(),q)<=Math.max(3,Math.floor(q.length/4))) rows.push(row)
    const rank = (name: string) => { const n=name.toLowerCase(); return n===q?0:n.startsWith(q)?1:n.includes(q)?2:3 }
    return rows.sort((a,b)=>rank(a.username)-rank(b.username)||distance(a.username.toLowerCase(),q)-distance(b.username.toLowerCase(),q)).map(r=>({id:r.id,username:r.username,hands:r.hands??null,vpip:r.vpip??null,pfr:r.pfr??null,primaryClassification:r.primary_name??r.primary_classification,exploitTags:this.tags(r.id)}))
  }
  updateNotes(id:number,notes:string){this.db.prepare('UPDATE players SET notes=?,updated_at=? WHERE id=?').run(notes,new Date().toISOString(),id)}
  commitStats(id:number,stats:{hands:number|null;vpip:number|null;pfr:number|null}){const now=new Date().toISOString();const result=this.db.prepare('INSERT INTO stat_snapshots(player_id,hands,vpip,pfr,recorded_at) VALUES(?,?,?,?,?)').run(id,stats.hands,stats.vpip,stats.pfr,now);return {id:Number(result.lastInsertRowid),playerId:id,...stats,recordedAt:now}}
  history(id:number){return this.db.prepare('SELECT id,player_id playerId,hands,vpip,pfr,recorded_at recordedAt FROM stat_snapshots WHERE player_id=? ORDER BY recorded_at DESC,id DESC LIMIT 10').all(id) as StatSnapshot[]}
  setPrimary(id:number,value:PrimaryClassification|null){this.db.prepare('UPDATE players SET primary_classification=?,updated_at=? WHERE id=?').run(value,new Date().toISOString(),id)}
  toggleTag(id:number,tagId:number){const found=this.db.prepare('SELECT 1 FROM player_exploit_tags WHERE player_id=? AND exploit_tag_id=?').get(id,tagId); (found?this.db.prepare('DELETE FROM player_exploit_tags WHERE player_id=? AND exploit_tag_id=?'):this.db.prepare('INSERT INTO player_exploit_tags VALUES(?,?,?)')).run(id,tagId,...(found?[]:[new Date().toISOString()]))}
  allTags(){return this.db.prepare('SELECT id,key,name,description,color,is_builtin isBuiltin FROM exploit_tags ORDER BY sort_order,id').all() as ExploitTag[]}
  createTag(name:string,description:string,color='#3a6c90'){const key=`custom_${name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}`;const result=this.db.prepare('INSERT INTO exploit_tags(key,name,description,color,is_builtin,sort_order) VALUES(?,?,?,?,0,999)').run(key,name.toUpperCase(),description,color);return {id:Number(result.lastInsertRowid),key,name:name.toUpperCase(),description,color,isBuiltin:false}}
  updateTag(id:number,name:string,description:string,color:string){this.db.prepare('UPDATE exploit_tags SET name=?,description=?,color=? WHERE id=?').run(name.toUpperCase(),description,color,id)}
  deleteTag(id:number){this.db.prepare('DELETE FROM exploit_tags WHERE id=?').run(id)}
  allPrimaryTags(){return this.db.prepare('SELECT key,name,description,color,is_builtin isBuiltin FROM primary_tags ORDER BY sort_order,rowid').all() as PrimaryTag[]}
  createPrimaryTag(name:string,description:string,color:string){const key=`CUSTOM_${name.toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'')}`;this.db.prepare('INSERT INTO primary_tags(key,name,description,color,sort_order) VALUES(?,?,?,?,999)').run(key,name.toUpperCase(),description,color);return {key,name:name.toUpperCase(),description,color,isBuiltin:false}}
  updatePrimaryTag(key:string,name:string,description:string,color:string){this.db.prepare('UPDATE primary_tags SET name=?,description=?,color=? WHERE key=?').run(name.toUpperCase(),description,color,key)}
  deletePrimaryTag(key:string){this.db.transaction(()=>{this.db.prepare('UPDATE players SET primary_classification=NULL WHERE primary_classification=?').run(key);this.db.prepare('DELETE FROM primary_tags WHERE key=?').run(key)})()}
  backup(path:string){return this.db.backup(path)}
  close(){this.db.pragma('wal_checkpoint(TRUNCATE)');this.db.close()}
}
