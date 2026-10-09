import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import SectionTitle from '../components/ui/SectionTitle';
import TableCard from '../components/ui/TableCard';
import { saveBlobResponse } from '../utils/fileDownload';

const inputClass='w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm';
const buttonClass='rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50';
const money=(v,c='USD')=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:c}).format(Number(v || 0));
function today(offset=0){const d=new Date();d.setUTCDate(d.getUTCDate()+offset);return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lubumbashi',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
const newItem=()=>({product_id:'',quantity:1,unit_price:''});
const newSale=()=>({label:'',items:[newItem()],currency:'USD',fee_usd:'',fee_cdf:''});
const newForm=()=>({customer_id:'',warehouse_id:'',delivery_date:today(),courier_name:'Adolphe',split_basis:'sales',fees_recipient:'courier',
  sales:[newSale()],expenses:[],notes:'',apply_stock:true,status:'recorded',review_acknowledged:false});
const statusLabel={recorded:'Enregistré',needs_review:'À vérifier',cancelled:'Annulé'};

export default function HomeDeliveriesPage(){
  const [searchParams]=useSearchParams();
  const [accounts,setAccounts]=useState([]),[products,setProducts]=useState([]),[days,setDays]=useState([]),[summary,setSummary]=useState(null);
  const [filters,setFilters]=useState({customer_id:'',from:'',to:'',status:''});
  const [form,setForm]=useState(newForm),[editing,setEditing]=useState(null),[detail,setDetail]=useState(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  const [page,setPage]=useState(1);
  const latestLoad=useRef(0);
  const historical=!!editing?.source_key;
  async function load(){const request=++latestLoad.current;try{setLoading(true);setError('');const r=await api.get('/home-deliveries',{params:filters});if(request!==latestLoad.current)return;setDays(r.data.data.rows);setSummary(r.data.data.summary);}
    catch(e){if(request===latestLoad.current)setError(e.response?.data?.message || 'Impossible de charger les livraisons.');}finally{if(request===latestLoad.current)setLoading(false);}}
  useEffect(()=>{let active=true;Promise.all([api.get('/customers'),api.get('/products')]).then(([c,p])=>{if(!active)return;
    const a=c.data.data.filter(x=>/LIVRAISON.*DOMICILE/i.test(x.business_name)&&x.is_active);setAccounts(a);
    setProducts(p.data.data.filter(x=>x.product_role==='finished_product').sort((a,b)=>a.name.localeCompare(b.name,'fr')));
    const kin=a.find(x=>String(x.id)===searchParams.get('customerId')) || a.find(x=>/KINSHASA/i.test(x.business_name));if(kin){setForm(f=>({...f,customer_id:kin.id,warehouse_id:kin.warehouse_id}));setFilters(f=>({...f,customer_id:kin.id}));}
  }).catch(e=>{if(active)setError(e.response?.data?.message || 'Impossible de charger les comptes et produits.');});return ()=>{active=false;};},[]);
  useEffect(()=>{load();},[filters.customer_id,filters.from,filters.to,filters.status]);
  useEffect(()=>{setPage(1);},[filters.customer_id,filters.from,filters.to,filters.status]);
  function showDetail(day){setDetail(day);requestAnimationFrame(()=>document.getElementById('delivery-detail')?.scrollIntoView({behavior:'smooth'}));}
  function setField(key,value){setForm(f=>({...f,[key]:value}));}
  function updateSale(index,patch){setForm(f=>({...f,sales:f.sales.map((s,i)=>i===index?{...s,...patch}:s)}));}
  function updateItem(si,ii,key,value){setForm(f=>({...f,sales:f.sales.map((s,i)=>i!==si?s:{...s,items:s.items.map((it,j)=>{
    if(j!==ii)return it;const next={...it,[key]:value};if(key==='product_id'){const p=products.find(p=>Number(p.id)===Number(value));next.description=p?.name || '';next.unit_price=p?.selling_price || '';}
    return next;})})}));}
  function reset(){const a=accounts.find(a=>String(a.id)===String(form.customer_id));setForm({...newForm(),customer_id:a?.id || '',warehouse_id:a?.warehouse_id || ''});setEditing(null);}
  function edit(day){setEditing(day);setDetail(day);setForm({...day,apply_stock:day.stock_applied,review_acknowledged:false,
    sales:day.sales.map(s=>({...s,fee_usd:s.fee_usd??'',fee_cdf:s.fee_cdf??'',items:s.items.map(i=>({...i,quantity:i.quantity??'',unit_price:i.unit_price??''}))})),expenses:day.expenses || []});
    document.getElementById('delivery-form')?.scrollIntoView({behavior:'smooth'});}
  async function submit(e){e.preventDefault();setBusy(true);setError('');setSuccess('');try{
    const r=editing?await api.put(`/home-deliveries/${editing.id}`,form):await api.post('/home-deliveries',form);
    setSuccess('Journée de livraison enregistrée.');setDetail(r.data.data);reset();await load();
  }catch(e){setError(e.response?.data?.message || 'Enregistrement impossible.');}finally{setBusy(false);}}
  async function cancel(day){if(!window.confirm(`Annuler les livraisons du ${day.delivery_date} ? Les sorties de stock de cette journée seront rétablies.`))return;
    setBusy(true);setError('');try{await api.post(`/home-deliveries/${day.id}/cancel`,{version:day.version});setDetail(null);await load();}
    catch(e){setError(e.response?.data?.message || 'Annulation impossible.');}finally{setBusy(false);}}
  async function exportPdf(){setBusy(true);try{const r=await api.get('/home-deliveries/export/pdf',{params:filters,responseType:'blob'});saveBlobResponse(r,'livraisons-a-domicile.pdf');}
    catch(e){setError('Export PDF impossible.');}finally{setBusy(false);}}
  const usd=summary?.currencies?.USD || {},cdf=summary?.currencies?.CDF || {};
  return <div className="space-y-6">
    <SectionTitle title="Livraison à domicile" subtitle="Ventes quotidiennes, frais et dépenses — KIVU AGRO BIO 85 % / livreur 15 %." />
    <button type="button" disabled={busy || loading} onClick={exportPdf} className={buttonClass}>Exporter l’état en PDF</button>
    {error?<div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</div>:null}
    {success?<div role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{success}</div>:null}
    <div className="grid gap-3 md:grid-cols-4">
      <label>Compte<select aria-label="Filtrer par compte" className={inputClass} value={filters.customer_id} onChange={e=>setFilters(f=>({...f,customer_id:e.target.value}))}>
        <option value="">Tous les comptes</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.business_name}</option>)}</select></label>
      <label>Du<input aria-label="Début de période" type="date" className={inputClass} value={filters.from} onInput={e=>setFilters(f=>({...f,from:e.target.value}))}/></label>
      <label>Au<input aria-label="Fin de période" type="date" className={inputClass} value={filters.to} onInput={e=>setFilters(f=>({...f,to:e.target.value}))}/></label>
      <label>État<select aria-label="Filtrer par état" className={inputClass} value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}>
        <option value="">Tous les états</option>{Object.entries(statusLabel).map(([s,l])=><option key={s} value={s}>{l}</option>)}</select></label>
    </div>
    <div className="grid gap-4 md:grid-cols-4">{[['Ventes enregistrées',money(usd.sales)],['Part KAB',money(usd.kab)],['Part livreur avec frais',money(usd.courier)],['Dépenses',money(usd.expenses)]].map(([l,v])=>
      <div key={l} className="rounded-2xl bg-white p-5 shadow-soft"><div className="text-sm text-slate-500">{l}</div><div className="mt-2 text-2xl font-semibold">{v}</div></div>)}</div>
    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
      {summary?.deliveries || 0} livraison(s) identifiée(s) · {summary?.needs_review || 0} journée(s) à vérifier : {money(usd.review_sales)} et {money(cdf.review_sales,'CDF')} de ventes hors totaux enregistrés.
      {Number(cdf.sales)>0?<div>Ventes en FC : {money(cdf.sales,'CDF')} · Part KAB : {money(cdf.kab,'CDF')} · Livreur : {money(cdf.courier,'CDF')}</div>:null}
      <div>Les frais inconnus restent non renseignés. Les FC et USD sont suivis séparément. Les parts indiquent la répartition, pas une preuve de versement.</div>
    </div>
    <form id="delivery-form" onSubmit={submit} className="space-y-5 rounded-3xl bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{editing?'Modifier la journée':'Ajouter les ventes du jour ou d’une date passée'}</h2>
        {editing?<button type="button" className={buttonClass} onClick={reset}>Nouvelle saisie</button>:null}</div>
      <div className="grid gap-4 md:grid-cols-3">
        <label>Compte de livraison *<select aria-label="Compte de livraison" required className={inputClass} value={form.customer_id} onChange={e=>{
          const a=accounts.find(a=>String(a.id)===e.target.value);setForm(f=>({...f,customer_id:e.target.value,warehouse_id:a?.warehouse_id || ''}));}}>
          <option value="">Sélectionner</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.business_name}</option>)}</select></label>
        <label>Date de vente *<input aria-label="Date de vente" required type="date" max={today()} className={inputClass} value={form.delivery_date} onInput={e=>setField('delivery_date',e.target.value)}/>
          <div className="mt-2 flex gap-2"><button type="button" className={buttonClass} onClick={()=>setField('delivery_date',today())}>Aujourd’hui</button><button type="button" className={buttonClass} onClick={()=>setField('delivery_date',today(-1))}>Hier</button></div></label>
        <label>Livreur *<input aria-label="Livreur" required maxLength={160} className={inputClass} value={form.courier_name} onChange={e=>setField('courier_name',e.target.value)}/></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label>Répartition 85 % / 15 %<select className={inputClass} aria-label="Base de répartition" value={form.split_basis} onChange={e=>setField('split_basis',e.target.value)}>
          <option value="sales">15 % des ventes ; dépenses déduites de KAB</option><option value="net_result">85 % / 15 % du résultat après dépenses</option></select></label>
        <label>Frais de livraison payés par le client<select className={inputClass} aria-label="Bénéficiaire des frais" value={form.fees_recipient} onChange={e=>setField('fees_recipient',e.target.value)}>
          <option value="courier">Au livreur, en plus de sa part</option><option value="kab">À KAB</option><option value="shared">À partager à 85 % / 15 %</option></select></label>
      </div>
      {form.sales.map((sale,si)=><fieldset key={si} className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <legend className="px-2 font-semibold">Livraison {si+1}</legend>
        <div className="flex gap-3"><input aria-label={`Destinataire livraison ${si+1}`} className={inputClass} placeholder="Destinataire / point de livraison (facultatif)" value={sale.label} onChange={e=>updateSale(si,{label:e.target.value})}/>
          <button type="button" disabled={form.sales.length===1} className={buttonClass} onClick={()=>setField('sales',form.sales.filter((_,i)=>i!==si))}>Retirer</button></div>
        {sale.items.map((item,ii)=><div key={ii} className="grid items-end gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
          <label>Produit<select aria-label={`Produit ${si+1}.${ii+1}`} required={!historical} className={inputClass} value={item.product_id || ''} onChange={e=>updateItem(si,ii,'product_id',e.target.value)}>
            <option value="">{item.description || 'Sélectionner un produit'}</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>Quantité<input aria-label={`Quantité ${si+1}.${ii+1}`} required={!historical} className={inputClass} type="number" min="0.01" step="0.01" value={item.quantity??''} onChange={e=>updateItem(si,ii,'quantity',e.target.value)}/></label>
          <label>Prix unitaire<input aria-label={`Prix ${si+1}.${ii+1}`} required={!historical} className={inputClass} type="number" min="0" step="0.01" value={item.unit_price??''} onChange={e=>updateItem(si,ii,'unit_price',e.target.value)}/></label>
          <button type="button" className={buttonClass} aria-label={`Retirer le produit ${si+1}.${ii+1}`} onClick={()=>updateSale(si,{items:sale.items.filter((_,i)=>i!==ii)})}>×</button>
        </div>)}
        <button type="button" className={buttonClass} onClick={()=>updateSale(si,{items:[...sale.items,newItem()]})}>Ajouter un produit</button>
        <div className="grid gap-3 md:grid-cols-4">
          <label>Devise de vente<select aria-label={`Devise ${si+1}`} className={inputClass} value={sale.currency || 'USD'} onChange={e=>updateSale(si,{currency:e.target.value})}><option>USD</option><option>CDF</option></select></label>
          <label>Vente {historical?'historique':'calculée'}{historical?<input aria-label={`Montant historique ${si+1}`} className={inputClass} type="number" min="0" step="0.01" value={sale.amount??''} onChange={e=>updateSale(si,{amount:e.target.value})}/>:
            <div className="py-2 font-semibold">{money(sale.items.reduce((a,i)=>a+Number(i.quantity || 0)*Number(i.unit_price || 0),0),sale.currency || 'USD')}</div>}</label>
          <label>Frais USD<input aria-label={`Frais USD ${si+1}`} className={inputClass} type="number" min="0" step="0.01" placeholder="Non renseignés" value={sale.fee_usd??''} onChange={e=>updateSale(si,{fee_usd:e.target.value})}/></label>
          <label>Frais FC<input aria-label={`Frais FC ${si+1}`} className={inputClass} type="number" min="0" step="0.01" placeholder="Non renseignés" value={sale.fee_cdf??''} onChange={e=>updateSale(si,{fee_cdf:e.target.value})}/></label>
        </div>
        {historical && sale.extra_amount_cdf!=null?<label className="block">Complément de vente en FC (à distinguer des frais)<input aria-label={`Complément FC ${si+1}`} type="number" min="0" step="0.01" className={inputClass} value={sale.extra_amount_cdf || ''} onChange={e=>updateSale(si,{extra_amount_cdf:e.target.value})}/></label>:null}
        {sale.product_match_note?<div className="text-sm text-amber-800">{sale.product_match_note}</div>:null}
        {historical?<div className="text-xs text-slate-500">Le montant réellement livré prime sur le prix d’une commande. Complétez les produits uniquement lorsqu’ils sont identifiés dans la source.</div>:null}
      </fieldset>)}
      <button type="button" className={buttonClass} onClick={()=>setField('sales',[...form.sales,newSale()])}>Ajouter une livraison</button>
      <fieldset className="space-y-3"><legend className="mb-3 font-semibold">Transport et autres dépenses</legend>
        {form.expenses.map((e,i)=><div key={i} className="grid gap-3 md:grid-cols-5">
          <select aria-label={`Type dépense ${i+1}`} className={inputClass} value={e.category} onChange={v=>setField('expenses',form.expenses.map((x,j)=>j===i?{...x,category:v.target.value}:x))}><option value="transport">Transport</option><option value="other">Autre dépense</option></select>
          <input aria-label={`Libellé dépense ${i+1}`} className={inputClass} placeholder="Libellé" value={e.label} onChange={v=>setField('expenses',form.expenses.map((x,j)=>j===i?{...x,label:v.target.value}:x))}/>
          <input aria-label={`Montant dépense ${i+1}`} required className={inputClass} type="number" min="0" step="0.01" value={e.amount} onChange={v=>setField('expenses',form.expenses.map((x,j)=>j===i?{...x,amount:v.target.value}:x))}/>
          <select aria-label={`Devise dépense ${i+1}`} className={inputClass} value={e.currency || 'USD'} onChange={v=>setField('expenses',form.expenses.map((x,j)=>j===i?{...x,currency:v.target.value}:x))}><option>USD</option><option>CDF</option></select>
          <button type="button" className={buttonClass} onClick={()=>setField('expenses',form.expenses.filter((_,j)=>j!==i))}>Retirer</button>
        </div>)}
        <button type="button" className={buttonClass} onClick={()=>setField('expenses',[...form.expenses,{category:'transport',label:'Transport',amount:'',currency:'USD'}])}>Ajouter une dépense</button>
      </fieldset>
      <label className="block">Notes<textarea aria-label="Notes de livraison" maxLength={4000} className={inputClass} value={form.notes || ''} onChange={e=>setField('notes',e.target.value)}/></label>
      {historical?<div className="space-y-2 rounded-xl bg-amber-50 p-4 text-sm">
        <div>L’historique importé conserve ses extraits et ses montants annoncés. Son stock n’est pas déduit rétroactivement.</div>
        <label>État de la journée<select aria-label="État de la journée" className={inputClass} value={form.status} onChange={e=>setField('status',e.target.value)}><option value="needs_review">À vérifier</option><option value="recorded">Enregistré / vérifié</option></select></label>
        {editing.status==='needs_review' && form.status==='recorded'?<label className="flex gap-2"><input type="checkbox" required checked={form.review_acknowledged} onChange={e=>setField('review_acknowledged',e.target.checked)}/>J’ai vérifié les réserves et corrigé les montants nécessaires.</label>:null}
      </div>:<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.apply_stock} onChange={e=>setField('apply_stock',e.target.checked)}/>Déduire les produits ou leurs composants du stock du dépôt</label>}
      <button disabled={busy} className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?'Enregistrement…':'Enregistrer la journée'}</button>
    </form>
    {detail?<div id="delivery-detail" className="space-y-3 rounded-3xl bg-white p-6 shadow-soft">
      <div className="flex justify-between"><h2 className="text-lg font-semibold">Détail du {detail.delivery_date} — {detail.courier_name}</h2><button className={buttonClass} onClick={()=>setDetail(null)}>Fermer</button></div>
      <div>{detail.customer_name} · {statusLabel[detail.status]} · {detail.delivery_count} livraison(s)</div>
      {['USD','CDF'].map(c=><p key={c}>Ventes {money(detail.totals[c].sales,c)} · Dépenses {money(detail.totals[c].expenses,c)} · KAB {money(detail.totals[c].kab,c)} · Livreur {money(detail.totals[c].courier,c)}</p>)}
      {detail.source_key?<div className="rounded-xl bg-slate-50 p-3 text-sm">Annoncé par le livreur : commission {detail.reported.commission_usd==null?'non renseignée':money(detail.reported.commission_usd)} ; reste {detail.reported.remittance_usd==null?'non renseigné':money(detail.reported.remittance_usd)}.
        <div>Écart commission : {detail.commission_difference==null?'—':money(detail.commission_difference)} · Écart du reste : {detail.remittance_difference==null?'—':money(detail.remittance_difference)}</div></div>:null}
      {detail.review_reasons?.length?<ul className="list-disc pl-5 text-sm text-amber-800">{detail.review_reasons.map((r,i)=><li key={i}>{r}</li>)}</ul>:null}
      <TableCard title="Livraisons effectuées" rows={detail.sales} columns={[{key:'label',label:'Destinataire / référence'},{key:'items',label:'Produits',render:s=><div>{s.items.map(i=>`${i.quantity??'?'} × ${i.description || products.find(p=>p.id===i.product_id)?.name || 'Produit non identifié'}`).join(', ') || 'Produits non identifiés'}{s.product_match_note?<div className="text-xs text-amber-700">{s.product_match_note}</div>:null}</div>},
        {key:'amount',label:'Vente',render:s=>s.amount==null?'Montant à compléter':money(s.amount,s.currency || 'USD')},{key:'fee_cdf',label:'Frais FC',render:s=>s.fee_cdf==null?'Non renseignés':money(s.fee_cdf,'CDF')}]} />
      {detail.source_evidence?.length?<details><summary className="cursor-pointer font-semibold">Extraits WhatsApp et provenance</summary><div className="mt-3 space-y-3">{detail.source_evidence.map((s,i)=><div key={i} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="font-semibold">{s.date} {s.time} · ligne {s.line} · {s.author}</div><p className="whitespace-pre-wrap">{s.text}</p></div>)}</div></details>:null}
    </div>:null}
    {loading?<p>Chargement des livraisons…</p>:<TableCard title={`Journal des livraisons (${days.length} journées)`} rows={days.slice((page-1)*25,page*25)} emptyText="Aucune livraison pour cette période" columns={[
      {key:'delivery_date',label:'Date'},{key:'customer_name',label:'Compte'},{key:'delivery_count',label:'Livraisons'},
      {key:'status',label:'État',render:d=><span className={d.status==='needs_review'?'text-amber-700':'text-slate-700'}>{statusLabel[d.status]}</span>},
      {key:'sales',label:'Ventes USD / FC',render:d=><div>{money(d.totals.USD.sales)}{d.totals.CDF.sales>0?<div>{money(d.totals.CDF.sales,'CDF')}</div>:null}</div>},
      {key:'kab',label:'Part KAB USD',render:d=>money(d.totals.USD.kab)},
      {key:'actions',label:'Actions',render:d=><div className="flex flex-wrap gap-2"><button className={buttonClass} onClick={()=>showDetail(d)}>Voir</button>
        {d.status!=='cancelled'?<><button className={buttonClass} disabled={busy} onClick={()=>edit(d)}>Modifier</button><button className={buttonClass} disabled={busy} onClick={()=>cancel(d)}>Annuler</button></>:null}</div>}
    ]}/>}
    {!loading && days.length>25?<div className="flex items-center justify-between"><button className={buttonClass} disabled={page===1} onClick={()=>setPage(p=>p-1)}>Précédent</button><span>Page {page} / {Math.ceil(days.length/25)}</span><button className={buttonClass} disabled={page>=Math.ceil(days.length/25)} onClick={()=>setPage(p=>p+1)}>Suivant</button></div>:null}
  </div>;
}
