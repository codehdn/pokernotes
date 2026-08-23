import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { Store } from './database'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('Store', () => {
  it('returns players in pages of at most 100', () => {
    const store = new Store(new Database(':memory:'))
    for(let i=0;i<101;i++)store.createPlayer(`Player${String(i).padStart(3,'0')}`)
    expect(store.allPlayers('',0)).toMatchObject({total:101,players:{length:100}})
    expect(store.allPlayers('',1).players).toHaveLength(1)
  })

  it('covers player search, immutable stats, classifications, and tags', () => {
    const store = new Store(new Database(':memory:'))
    const slayer = store.createPlayer('PokerSlayer92')
    expect(() => store.createPlayer('pokerslayer92')).toThrow()
    store.createPlayer('PokerSlayer77')
    store.createPlayer('xSlayerx')
    expect(store.allPlayers('',0).players.map(x=>x.username)).toEqual(['PokerSlayer77','PokerSlayer92','xSlayerx'])
    expect(store.search('PokerSlayer').map(x => x.username)).toEqual(['PokerSlayer92', 'PokerSlayer77'])
    expect(store.search('Slayer').map(x => x.username)).toEqual(expect.arrayContaining(['PokerSlayer92', 'PokerSlayer77', 'xSlayerx']))
    expect(store.search('PokerSlayer92')[0].username).toBe('PokerSlayer92')
    expect(store.search('PokerSlayr').map(x => x.username)).toContain('PokerSlayer92')

    store.commitStats(slayer.id, { hands: 100, vpip: 30, pfr: 20 })
    store.commitStats(slayer.id, { hands: 200, vpip: 25, pfr: 18 })
    expect(store.getPlayer(slayer.id).latestStats?.hands).toBe(200)
    expect(store.history(slayer.id).map(x => x.hands)).toEqual([200, 100])

    store.setPrimary(slayer.id, 'STATION')
    expect(store.getPlayer(slayer.id).primaryClassification).toBe('STATION')
    store.setPrimary(slayer.id, null)
    expect(store.getPlayer(slayer.id).primaryClassification).toBeNull()
    const tag = store.allTags()[0]
    store.toggleTag(slayer.id, tag.id)
    expect(store.getPlayer(slayer.id).exploitTags[0].id).toBe(tag.id)
    store.toggleTag(slayer.id, tag.id)
    expect(store.getPlayer(slayer.id).exploitTags).toHaveLength(0)
    expect(store.createTag('River Hero', 'Calls river too light').name).toBe('RIVER HERO')
    expect(store.allTags().at(-1)?.key).toBe('custom_river_hero')
    const primary=store.createPrimaryTag('Unknown Reg','Needs classification','#123456')
    store.setPrimary(slayer.id,primary.key)
    store.deletePrimaryTag(primary.key)
    expect(store.getPlayer(slayer.id).primaryClassification).toBeNull()
  })
})

it('persists the complete profile and customized tags after close and reopen', () => {
  const dir=mkdtempSync(join(tmpdir(),'poker-notes-')),path=join(dir,'notes.db')
  try {
    let store=Store.open(path),player=store.createPlayer('DurablePlayer')
    store.updateNotes(player.id,'Never lose this read')
    store.commitStats(player.id,{hands:321,vpip:27,pfr:19})
    const primary=store.createPrimaryTag('Crusher','Strong player','#112233'),exploit=store.createTag('Overbets','Overbets too often','#445566')
    store.setPrimary(player.id,primary.key);store.toggleTag(player.id,exploit.id);store.close()
    store=Store.open(path);player=store.getPlayer(player.id)
    expect(player).toMatchObject({notes:'Never lose this read',primaryClassification:primary.key,latestStats:{hands:321,vpip:27,pfr:19}})
    expect(player.exploitTags[0]).toMatchObject({name:'OVERBETS',color:'#445566'})
    expect(store.allPrimaryTags().find(tag=>tag.key===primary.key)?.color).toBe('#112233')
    store.close()
  } finally { rmSync(dir,{recursive:true,force:true}) }
})
