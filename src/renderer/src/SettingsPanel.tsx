import { useEffect, useState } from 'react'
import type { PlayerPage, Settings } from '../../shared/types'
import TagManager from './TagManager'

export default function SettingsPanel({close,openPlayer}:{close:()=>void;openPlayer:(id:number)=>void}){
  const [settings,setSettings]=useState<Settings>({shortcut:'Control+Space',launchAtLogin:false}),[message,setMessage]=useState(''),[list,setList]=useState<PlayerPage>({players:[],total:0}),[filter,setFilter]=useState(''),[page,setPage]=useState(0)
  useEffect(()=>{window.pokerNotes.getSettings().then(setSettings)},[])
  useEffect(()=>{window.pokerNotes.getPlayers(filter,page).then(setList)},[filter,page])
  const save=async()=>{try{setSettings(await window.pokerNotes.setSettings(settings));setMessage('Saved')}catch(e){setMessage(String(e))}}
  const backup=async()=>{try{setMessage(`Backup saved: ${await window.pokerNotes.backupNow()}`)}catch(e){setMessage(String(e))}}
  return <section className="settings"><h2>Settings</h2><label>Global shortcut<input value={settings.shortcut} onChange={e=>setSettings({...settings,shortcut:e.target.value})}/></label><label className="check"><input type="checkbox" checked={settings.launchAtLogin} onChange={e=>setSettings({...settings,launchAtLogin:e.target.checked})}/> Launch when Windows starts</label><div><button onClick={save}>Save</button><button onClick={backup}>Back up now</button><button onClick={close}>Done</button></div>{message&&<small>{message}</small>}<section className="player-list"><h3>Players <small>{list.total}</small></h3><input aria-label="Filter players" placeholder="Filter players" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0)}}/>{list.players.map(player=><button key={player.id} onClick={()=>openPlayer(player.id)}>{player.username}</button>)}{list.total>100&&<div><button disabled={page===0} onClick={()=>setPage(page-1)}>Previous</button><small>{page+1} / {Math.ceil(list.total/100)}</small><button disabled={(page+1)*100>=list.total} onClick={()=>setPage(page+1)}>Next</button></div>}</section><TagManager kind="primary"/><TagManager kind="exploit"/></section>
}
