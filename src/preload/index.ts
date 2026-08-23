import { contextBridge, ipcRenderer } from 'electron'
import type { PokerNotesAPI } from '../shared/types'
const invoke = (channel:string,...args:unknown[]) => ipcRenderer.invoke(channel,...args)
const api: PokerNotesAPI = {
  getVersion:()=>invoke('version:get'),
  getPlayers:(query,page)=>invoke('players:get',query,page),
  searchPlayers:q=>invoke('search',q), getPlayer:id=>invoke('player:get',id), createPlayer:name=>invoke('player:create',name), updateNotes:(id,n)=>invoke('notes:update',id,n), commitStats:(id,s)=>invoke('stats:commit',id,s), getStatHistory:id=>invoke('stats:history',id), setPrimaryClassification:(id,v)=>invoke('primary:set',id,v), toggleExploitTag:(id,t)=>invoke('tag:toggle',id,t), getExploitTags:()=>invoke('tags:get'), createExploitTag:(name,description,color)=>invoke('tag:create',name,description,color), updateExploitTag:(id,name,description,color)=>invoke('tag:update',id,name,description,color), deleteExploitTag:id=>invoke('tag:delete',id), getPrimaryTags:()=>invoke('primary-tags:get'), createPrimaryTag:(name,description,color)=>invoke('primary-tag:create',name,description,color), updatePrimaryTag:(key,name,description,color)=>invoke('primary-tag:update',key,name,description,color), deletePrimaryTag:key=>invoke('primary-tag:delete',key), getSettings:()=>invoke('settings:get'), setSettings:settings=>invoke('settings:set',settings), backupNow:()=>invoke('backup'), hide:()=>invoke('hide'), minimize:()=>invoke('minimize'), quit:()=>invoke('quit'),
  onFocusSearch: callback => { const listener=()=>callback(); ipcRenderer.on('focus-search',listener); return ()=>ipcRenderer.removeListener('focus-search',listener) },
  onBeforeHide: callback => { const listener=()=>callback(); ipcRenderer.on('before-hide',listener); return ()=>ipcRenderer.removeListener('before-hide',listener) },
  onRequestQuit: callback => { const listener=()=>callback(); ipcRenderer.on('request-quit',listener); return ()=>ipcRenderer.removeListener('request-quit',listener) }
}
contextBridge.exposeInMainWorld('pokerNotes',api)
