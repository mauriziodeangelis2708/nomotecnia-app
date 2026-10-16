/** Independent synthetic checks against Avviso G12616, artt. 1, 4–7,
 * Appendix 4 and the supplied official Excel grid. No network or database I/O.
 * Node 24 strips the application's TypeScript; the hook resolves its extensionless imports.
 */
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { writeFile } from 'node:fs/promises';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try { return nextResolve(specifier + '.ts', context); } catch {}
  }
  return nextResolve(specifier, context);
}});
const { evaluate, classOf, scoreValueAdded, scoreEmployees, submissionInWindow, calendarMonths, isoDay } = await import('../src/lib/engine.ts');
const { OFFICIAL_RULES } = await import('../src/lib/bando.ts');
const { geCoConsistency } = await import('../src/lib/lazio-dossier.ts');
const { micro, small, medium, cloud, workplace, commerce, cyber, docs } = await import('../src/test/lazio-fixtures.ts');
const results = [];
function test(id, reference, run) {
  try { const details = run(); results.push({id, reference, status:'PASS', ...(details || {})}); }
  catch (e) { results.push({id, reference, status:'FAIL', message:e.message}); }
}
const check = (a, checklist=docs, evidence=[]) => evaluate(a, OFFICIAL_RULES, evidence, checklist);
const base = (size='micro') => ({...({micro, piccola:small, media:medium})[size],
  ragione_sociale:'IMPRESA INVENTATA COLLAUDO LAZIO',
  addetti_inps_luglio_2026: size==='micro'?5:size==='piccola'?20:60,
  iva_ve50_2025:size==='micro'?250000:size==='piccola'?1000000:3000000,
  iva_vf25_2025:0, cert_genere_valida:'no',impresa_giovanile:'no',cert_ambiente_valida:'no'});
const iv = (r,k) => r.interventions.find(i=>i.key===k);
const snapshot = r => ({size:r.size, projectStatus:r.projectStatus, gross:r.totals.potential, contribution:r.totals.potentialCapped, score:r.score.total, criteria:r.score.criteria});
test('L01_micro_ammessa_cloud_web','Art. 1, 5; App.4.D',()=>{
  const r=check({...base(),...cloud(['web'])}); assert.equal(r.projectStatus,'confermato');
  assert.equal(r.totals.confirmedCapped,14076); assert.deepEqual(r.score.criteria,[35,5,5,0,0,0]);
  return snapshot(r);
});
test('L02_micro_sotto_minimo','Art. 1, 5',()=>{
  const r=check({...base(),...cloud(['backup'])});assert.equal(r.totals.potentialCapped,5593.2);
  assert.equal(r.projectStatus,'non_ammissibile');return snapshot(r);
});
test('L03_micro_massimale','Art.5',()=>{
  const r=check({...base(),...cloud(['application','database','web','backup'])});
  assert.equal(r.totals.confirmed,65008.8);assert.equal(r.totals.confirmedCapped,50000);assert.equal(r.projectStatus,'confermato');return snapshot(r);
});
test('L04_piccola_massimale','Art.5',()=>{
  const r=check({...base('piccola'),...cloud(['application','database','web','backup']),...workplace,...commerce,...cyber,workplace_postazioni:20});
  assert.equal(r.totals.confirmed,141361.2);assert.equal(r.totals.confirmedCapped,100000);assert.equal(r.projectStatus,'confermato');return snapshot(r);
});
test('L05_media_massimale','Art.5',()=>{
  const r=check({...base('media'),...cloud(['application','database','web','backup']),...workplace,...commerce,...cyber,addetti_inps_luglio_2026:60,workplace_postazioni:60});
  assert.equal(r.totals.confirmed,283450.8);assert.equal(r.totals.confirmedCapped,150000);assert.equal(r.projectStatus,'confermato');return snapshot(r);
});
test('L06_minimo_esatto','Artt.1,5 de minimis',()=>{
  const r=check({...base(),...cloud(['database']),de_minimis_impresa_unica:286000});
  assert.equal(r.totals.confirmedCapped,14000);assert.equal(r.projectStatus,'confermato');return snapshot(r);
});
test('L07_un_centesimo_sotto_minimo','Artt.1,5',()=>{
  const r=check({...base(),...cloud(['database']),de_minimis_impresa_unica:286000.01});
  assert.equal(r.totals.potentialCapped,13999.99);assert.equal(r.projectStatus,'non_ammissibile');return snapshot(r);
});
test('L08_de_minimis_esaurito','Art.5',()=>{const r=check({...base(),...cloud(),de_minimis_impresa_unica:300000});assert.equal(r.projectStatus,'non_ammissibile');assert.equal(r.totals.potentialCapped,0);});
test('L09_de_minimis_ignoto','Art.5',()=>{const r=check({...base(),...cloud(),de_minimis_impresa_unica:undefined});assert.equal(r.projectStatus,'ignoto');assert.equal(r.totals.potentialCapped,null);});
test('L10_sola_diagnosi_media','Art.1',()=>{const r=check(base('media'));assert.equal(r.totals.potentialCapped,21427.2);assert.equal(r.projectStatus,'non_ammissibile');});
test('L11_micro_diagnosi_vietata','Art.1',()=>{const r=check({...base(),...cloud(),diagnosi_contributo_micro:'si'});assert.equal(r.projectStatus,'non_ammissibile');assert.equal(iv(r,'diagnosi').theoretical,0);});
test('L12_micro_cyber_vietata','Art.1; App.4.E',()=>{const r=check({...base(),...cloud(),...cyber});assert.equal(r.projectStatus,'non_ammissibile');assert.equal(iv(r,'cyber').theoretical,0);});
test('L13_piccola_senza_diagnosi','Art.1',()=>{const r=check({...base('piccola'),...cloud(),diagnosi_prevista:'no'});assert.equal(r.projectStatus,'non_ammissibile');});
test('L14_grande_esclusa','Art.4; App.1 PMI',()=>{const r=check({...base(),...cloud(),ula_2024:250,ula_2025:250});assert.equal(r.size,'grande');assert.equal(r.projectStatus,'non_ammissibile');});
test('L15_gruppo_senza_aggregati','App.1 PMI',()=>{const r=check({...base(),...cloud(),ha_associate_collegate:'si',dati_aggregati_disponibili:'no'});assert.equal(r.sizeStatus,'ignoto');assert.equal(r.totals.potentialCapped,null);});
test('L16_gruppo_diventa_media','App.1 PMI',()=>{const a={...base(),...cloud(),ha_associate_collegate:'si',dati_aggregati_disponibili:'si',diagnosi_prevista:'si',diagnosi_manager:'si',diagnosi_tempi:'si'};for(const y of [2024,2025])Object.assign(a,{['ula_agg_'+y]:60,['fatturato_agg_'+y]:12000000,['attivo_agg_'+y]:8000000});const r=check(a);assert.equal(r.size,'media');assert.equal(r.totals.cap,150000);});
test('L17_sede_legale_non_sufficiente','Art.4',()=>{const r=check({...base(),...cloud(),sede_legale_lazio:'si',sede_operativa_lazio:'no'});assert.equal(r.projectStatus,'non_ammissibile');});
test('L18_sede_futura_documentata','Art.4',()=>{const r=check({...base(),...cloud(),sede_operativa_lazio:'no',sede_lazio_entro_termine:'si',apertura_sede_documentata:'si'});assert.equal(r.projectStatus,'potenziale');});
test('L19_attivita_esclusa','Art.4; App.1',()=>{const r=check({...base(),...cloud(),ateco_escluso:'si'});assert.equal(r.projectStatus,'non_ammissibile');});
test('L20_voucher_precedente_saldo_non_richiesto','Art.4',()=>{const r=check({...base(),...cloud(),precedenti_voucher_lazio:'si',precedenti_erogazione_presentata:'no',precedenti_tipologie_complete:'si'});assert.equal(r.projectStatus,'non_ammissibile');});
test('L21_stessa_tipologia_gia_finanziata','Artt.4,5',()=>{const r=check({...base(),...cloud(),precedenti_voucher_lazio:'si',precedenti_erogazione_presentata:'si',precedenti_tipologie_complete:'si',precedenti_tipologie:['cloud_database']});assert.equal(iv(r,'cloud_database').status,'non_ammissibile');});
test('L22_tipologia_diversa_ammessa','Artt.4,5',()=>{const r=check({...base(),...cloud(),precedenti_voucher_lazio:'si',precedenti_erogazione_presentata:'si',precedenti_tipologie_complete:'si',precedenti_tipologie:['cloud_web']});assert.equal(r.projectStatus,'confermato');});
test('L23_cumulo_stessi_costi','Art.5; App.4 premessa',()=>{assert.equal(check({...base(),...cloud(),doppio_finanziamento_assente:'no'}).projectStatus,'non_ammissibile');});
test('L24_workplace_sei_sotto_minimo','Artt.1,5',()=>{const r=check({...base(),...workplace,workplace_postazioni:6,addetti_inps_luglio_2026:6});assert.equal(r.totals.potentialCapped,13622.4);assert.equal(r.projectStatus,'non_ammissibile');return snapshot(r);});
test('L25_workplace_sette_ammessa','Artt.1,5',()=>{const r=check({...base(),...workplace,workplace_postazioni:7,addetti_inps_luglio_2026:7});assert.equal(r.totals.confirmedCapped,15892.8);assert.equal(r.projectStatus,'confermato');return snapshot(r);});
test('L26_postazioni_oltre_addetti','Art.5; App.4.B',()=>{const r=check({...base(),...workplace,workplace_postazioni:8,addetti_inps_luglio_2026:7});assert.equal(iv(r,'workplace').status,'non_ammissibile');});
test('L27_limite_addetti_Lazio_accentrati','App.4.B',()=>{const r=check({...base(),...workplace,workplace_postazioni:7,addetti_inps_luglio_2026:20,inps_accentrato:'si',addetti_lazio_verificati:'si',addetti_lazio_documentati:6});assert.equal(iv(r,'workplace').status,'non_ammissibile');});
test('L28_categorie_distinte_obbligatorie','App.4.B',()=>{const r=check({...base(),...workplace,workplace_categorie:['c1','c1','c2','c3','c4']});assert.equal(iv(r,'workplace').status,'non_ammissibile');});
test('L29_workplace_upgrade_escluso','App.4.B',()=>{const r=check({...base(),...workplace,workplace_nuova_adozione:'no'});assert.equal(iv(r,'workplace').status,'non_ammissibile');});
test('L30_durata_35_mesi','App.4.B',()=>{const r=check({...base(),...workplace,workplace_durata_mesi:35});assert.equal(iv(r,'workplace').status,'non_ammissibile');});
test('L31_commerce_saas_escluso','App.4.C',()=>{const r=check({...base('piccola'),...commerce,commerce_tipo:'saas'});assert.equal(iv(r,'commerce').status,'non_ammissibile');});
test('L32_commerce_sostituzione_esattamente_3_anni','App.4.C',()=>{const r=check({...base('piccola'),...commerce,commerce_sostituzione:'si',commerce_precedente_data:'2023-10-16',domanda_timestamp:'2026-10-16T12:00:00+02:00'});assert.equal(iv(r,'commerce').status,'non_ammissibile');});
test('L33_commerce_sostituzione_oltre_3_anni','App.4.C',()=>{const r=check({...base('piccola'),...commerce,commerce_sostituzione:'si',commerce_precedente_data:'2023-10-15',domanda_timestamp:'2026-10-16T12:00:00+02:00'});assert.equal(iv(r,'commerce').status,'confermato');});
test('L34_cloud_gia_cloud_escluso','App.4.D',()=>{const r=check({...base(),...cloud(),cloud_database_server_locale:'no'});assert.equal(iv(r,'cloud_database').status,'non_ammissibile');});
test('L35_VM_duplicata_non_moltiplica','Art.5',()=>{const r=check({...base(),...cloud(['database','database'])});assert.equal(r.totals.confirmedCapped,27656.4);assert.equal(r.interventions.length,1);});
test('L36_componente_cloud_obbligatoria_assente','App.4.D',()=>{const r=check({...base(),...cloud(),cloud_database_sei_servizi:'no'});assert.equal(iv(r,'cloud_database').status,'non_ammissibile');});
test('L37_esperto_cyber_non_idoneo','App.4.A,E',()=>{const r=check({...base('piccola'),...cyber,cyber_esperto:'no'});assert.equal(iv(r,'cyber').status,'non_ammissibile');});
test('L38_preventivo_non_modifica_forfait','Art.5',()=>{const a={...base(),...cloud(['web'])};const low=check(a,docs,[{intervention:'cloud_web',amount:1}]);const high=check(a,docs,[{intervention:'cloud_web',amount:999999}]);assert.equal(low.totals.confirmedCapped,14076);assert.equal(high.totals.confirmedCapped,14076);});
test('L39_documento_mancante_non_conferma','Art.6',()=>{const r=check({...base(),...cloud()},{...docs,polizza_o_modello3:{status:'ricevuto'}});assert.equal(r.projectStatus,'ignoto');});
test('L40_IVA_mancante_azzera_solo_C1','Art.6',()=>{const a={...base(),...cloud(['web'])};const r=check(a,{...docs,iva_modello_2026:{status:'mancante'}});assert.equal(r.score.total,45);assert.equal(r.score.supportedTotal,10);});
test('L41_INPS_mancante_azzera_C1_C2','Art.6',()=>{const r=check({...base(),...cloud(['web'])},{...docs,inps_attestazione_luglio_2026:{status:'mancante'}});assert.equal(r.score.supportedTotal,5);});
test('L42_certificazioni_senza_prove','Art.6',()=>{const a={...base('piccola'),...cloud(['application','database','web','backup']),cert_genere_valida:'si',impresa_giovanile:'si',cert_ambiente_valida:'si'};const cl={...docs,cert_genere:{status:'ricevuto'},impresa_giovanile:{status:'mancante'},cert_ambiente:{status:'mancante'}};const r=check(a,cl);assert.equal(r.score.total,100);assert.equal(r.score.supportedTotal,70);return snapshot(r);});
test('L43_punteggio_100_documentato','Art.6; Griglia G9,G27,G34,G45,G50,G55',()=>{const r=check({...base('piccola'),...cloud(['application','database','web','backup']),cert_genere_valida:'si',impresa_giovanile:'si',cert_ambiente_valida:'si'});assert.equal(r.score.total,100);assert.equal(r.score.supportedTotal,100);});
test('L44_forfettario','Art.6; Griglia C23',()=>{const r=check({...base(),...cloud(['web']),regime_fiscale:'forfettario',reddito_forfettario_2025:250000,iva_ve50_2025:999999,iva_vf25_2025:999999});assert.equal(r.score.criteria[0],35);});
test('L45_OSS_editoria','Art.6 note',()=>{const r=check({...base(),...cloud(['web']),iva_ve50_2025:200000,iva_vf25_2025:50000,vendite_oss:'si',iva_oss_2025:50000,integrazione_editoria:'si',editoria_vendite_2025:100000,editoria_acquisti_2025:50000});assert.equal(r.score.inputs.numerator,250000);assert.equal(r.score.criteria[0],35);});
test('L46_finestra_ora_italiana','Art.6',()=>{assert.equal(submissionInWindow('2026-09-30T11:59:59+02:00'),false);assert.equal(submissionInWindow('2026-09-30T12:00:00+02:00'),true);assert.equal(submissionInWindow('2026-10-29T17:00:00+01:00'),true);assert.equal(submissionInWindow('2026-10-29T17:00:01+01:00'),false);});
test('L47_sei_mesi_calendario','Artt.5,7',()=>{assert.equal(new Date(calendarMonths(isoDay('2026-08-31'),6)).toISOString().slice(0,10),'2027-02-28');});
test('L48_importi_base_GeCoWEB_senza_doppio20','Art.5 nota2; guida GeCoWEB',()=>{const r=check({...base(),...cloud(['web']),gecoweb_costo_cloud_web:11730});assert.equal(r.totals.confirmedCapped,14076);assert.equal(r.dossier.stages[0].issues.some(s=>s.includes('cloud_web')&&s.includes('20%')),false);});
test('L49_GeCoWEB_20percento_duplicato_segnalato','Art.5 nota2',()=>{const a={...base(),...cloud(['web']),gecoweb_costo_cloud_web:14076};const r=check(a);assert.ok(geCoConsistency(a,r).some(s=>s.includes('cloud_web')&&s.includes('senza 20%')));});
test('L50_zero_addetti_denominatore_uno','Art.6; Griglia E9',()=>{const r=check({...base(),...cloud(['web']),addetti_inps_luglio_2026:0,iva_ve50_2025:50000});assert.equal(r.score.criteria[0],35);assert.equal(r.score.criteria[1],0);});
test('L51_dati_importo_incompleti','Art.5',()=>{const r=check({...base(),...cloud(),cloud_sistemi:[]});assert.equal(r.totals.potentialCapped,null);assert.notEqual(r.projectStatus,'confermato');});
test('L52_regola_divergente_bloccata','Art.5',()=>{const rules={...OFFICIAL_RULES,cloud_web:{...OFFICIAL_RULES.cloud_web,value:99999}};const r=evaluate({...base(),...cloud(['web'])},rules,[],docs);assert.equal(r.totals.potentialCapped,null);assert.equal(r.projectStatus,'ignoto');});
test('L53_durata_frazionaria_non_confermata','App.4.B',()=>{const r=check({...base(),...workplace,workplace_durata_mesi:36.5});assert.notEqual(iv(r,'workplace').status,'confermato');});
test('L54_postazioni_negative_non_confermate','Art.5',()=>{const r=check({...base(),...workplace,workplace_postazioni:-1});assert.notEqual(iv(r,'workplace').status,'confermato');assert.equal(r.totals.potentialCapped,null);});
const completed = () => ({...base('piccola'),...cloud(['web']),progetto_realizzato:'si',
  data_concessione:'2026-11-16',data_conclusione:'2026-12-01',data_richiesta_saldo:'2026-12-02',contributo_concesso:22238.4,
  domanda_timestamp:'2026-10-16T12:00:00+02:00',data_diagnosi_exante:'2026-10-17',cloud_web_data_avvio:'2026-10-18',firme_expost_verificate:'si'});
test('L55_date_realizzate_coerenti','Artt.5,7; App.4.A',()=>{const r=check(completed());assert.equal(r.projectStatus,'confermato');assert.equal(r.totals.confirmedCapped,22238.4);});
test('L56_avvio_prima_diagnosi_escluso','Art.5; App.4.A',()=>{const r=check({...completed(),cloud_web_data_avvio:'2026-10-16'});assert.equal(iv(r,'cloud_web').status,'non_ammissibile');});
test('L57_diagnosi_obsoleta_esclusa','Art.7; App.4.A',()=>{const r=check({...completed(),data_diagnosi_exante:'2026-07-15'});assert.equal(iv(r,'diagnosi').status,'non_ammissibile');});
test('L58_conclusione_oltre_sei_mesi_esclusa','Artt.5,7',()=>{const r=check({...completed(),data_conclusione:'2027-05-17',data_richiesta_saldo:'2027-05-18'});assert.equal(r.projectStatus,'non_ammissibile');});
test('L59_saldo_tardivo_richiede_verifica_non_proroga','Art.7',()=>{const r=check({...completed(),data_richiesta_saldo:'2027-05-17'});assert.equal(r.gates.find(g=>g.key==='saldo_date').status,'ignoto');});
test('L60_rideterminazione_non_aumenta_concesso','Art.5',()=>{const r=check({...completed(),contributo_concesso:15000});assert.equal(r.totals.confirmedCapped,15000);});
for (const [va,expected] of [[0,0],[35000,0],[42500,17.5],[50000,35],[150000,17.5],[249999,0.000175],[250000,0],[300000,0]]) {
  test('S1_valore_aggiunto_'+va,'Griglia G9/K9',()=>{assert.ok(Math.abs(scoreValueAdded(va)-expected)<1e-8);});
}
for (const [n,expected] of [[0,0],[1,1],[10,10],[20,20],[21,19.75],[60,10],[99,0.25],[100,0],[150,0]]) {
  test('S2_addetti_'+n,'Griglia G27/K27',()=>{assert.equal(scoreEmployees(n),expected);});
}
for (const size of ['micro','piccola','media']) for (let n=1;n<=4;n++) {
  test('S3_articolazione_'+size+'_'+n,'Griglia G34',()=>{const r=check({...base(size),...cloud(['application','database','web','backup'].slice(0,n))});assert.equal(r.score.criteria[2],size==='micro'?Math.min(n*5,15):Math.min((n-1)*5,15));});
}
for (const [ula,fatt,attivo,size] of [[9,2000000,3000000,'micro'],[10,2000000,2000000,'piccola'],[49,10000000,11000000,'piccola'],[50,10000000,10000000,'media'],[249,50000000,50000000,'media'],[249,60000000,43000000,'media'],[250,1,1,'grande']]) {
  test('P_dimensione_'+ula+'_'+fatt,'App.1 PMI',()=>assert.equal(classOf(ula,fatt,attivo),size));
}
const report={reference:'Avviso G12616 del 18/09/2026, BUR 77 del 24/09/2026; griglia ufficiale 7 settembre 2026',scope:'Pure application engine with synthetic inputs. No database, production writes or GeCoWEB submission.',passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,cases:results};
if(process.env.LAZIO_AUDIT_OUTPUT) await writeFile(process.env.LAZIO_AUDIT_OUTPUT,JSON.stringify(report,null,2)+'\n');
for (const r of results) console.log(r.status+': '+r.id+(r.message?' — '+r.message:''));
console.log(`TOTAL: ${report.passed} passed; ${report.failed} failed`);
if(report.failed)process.exitCode=1;
