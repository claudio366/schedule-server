// Reglas del juego (autoritativas). Sin dependencias.
const RENT=150000;
const P=[{n:'Azulita',c:20,t1:10,t2:8,v:55,u:0},{n:'Neonia',c:90,t1:30,t2:20,v:260,u:600},{n:'Rosita',c:400,t1:90,t2:60,v:1250,u:6000}];
const PW=[22,14,3,16,14,10,8,13],PK=['c1','c2','jk','pt','cl','vp','sh','no'];
const newDt=()=>({ci:0,ad:0,sold:0,sp:0,sa:0,pr:0,c:{}});
const day=t=>new Date(t).toISOString().slice(0,10);
const newState=now=>({co:200,pt:0,sl:2,sg:0,cr:[0,0,0],rd:[0,0,0],jb:[],tot:0,raids:0,ht:0,mp:[1,1,1],rn:now+RENT,cx:0,vp:-1,vu:0,nx:now+70000,t:now,sp:0,bo:0,bc:0,sh:0,dk:'',dt:newDt(),sk:0,lc:'',dn:{},inv:0,ref:''});
const rent=s=>20*s.sl*s.sl,risk=s=>Math.max(.04,Math.min(.7,.08+s.ht/200-.035*s.sg));
const unl=s=>[0,1,2].filter(i=>s.tot>=P[i].u);
const vipm=(s,p,n)=>s.vp===p&&s.vu>n?1.4:1;
const price=(s,p,n)=>P[p].v*s.mp[p]*vipm(s,p,n)*(s.bo>n?2:1);
const fillN=(s,ys)=>s.lc===s.dk?((s.sk-1)%7)+1:(s.lc===ys?s.sk%7:0);
const ucost=(s,k)=>k==='sl'?Math.round(180*Math.pow(2.3,s.sl-2)):Math.round(300*Math.pow(2.6,s.sg));
function evento(s,now,ev){const un=unl(s),r=Math.random(),p=un[Math.floor(Math.random()*un.length)];
 if(r<.3){s.ht=Math.min(100,s.ht+20);ev.push({k:'ev_patrol'})}
 else if(r<.55){s.mp[p]=Math.max(.35,s.mp[p]*.6);ev.push({k:'ev_sat',n:P[p].n})}
 else if(r<.75){s.cx=now+90000;ev.push({k:'ev_cost'})}
 else{s.vp=p;s.vu=now+60000;ev.push({k:'ev_vip',n:P[p].n})}}
function tick(s,now,ev){
 const dk=day(now);if(s.dk!==dk){s.dk=dk;s.dt=newDt()}
 const dt=Math.max(0,Math.min(3600,(now-s.t)/1000));s.t=now;
 s.ht=Math.max(0,s.ht-.28*dt);for(let i=0;i<3;i++)s.mp[i]=Math.min(1,s.mp[i]+.003*dt);
 if(s.rn<now-600000)s.rn=now-600000;
 while(s.rn<=now){s.rn+=RENT;const r=rent(s),pd=Math.min(s.co,r);s.co-=pd;
  if(pd<r){s.ht=Math.min(100,s.ht+12);ev.push({k:'rent_no'})}else ev.push({k:'rent_ok',a:r})}
 if(now>=s.nx){s.nx=now+60000+Math.random()*60000;evento(s,now,ev)}
 if(s.co<30&&!s.jb.length&&!s.cr.some(Boolean)&&!s.rd.some(Boolean)){s.co+=30;ev.push({k:'loan'})}
 for(let i=s.jb.length-1;i>=0;i--){const j=s.jb[i];if(j.end>now)continue;s.jb.splice(i,1);j.st===1?s.cr[j.p]++:s.rd[j.p]++}}
const idx=v=>{const p=Math.floor(Number(v));return p>=0&&p<=2?p:-1};
// ctx: {member:boolean, useAd:()=>boolean}
function act(s,b,now,ctx){const a=b.a;
 if(a==='sync')return{res:{}};
 if(a==='crear'){const p=idx(b.p);if(p<0||s.tot<P[p].u)return{err:'srv_err'};
  const c=Math.round(P[p].c*(s.cx>now?1.5:1));
  if(s.sl-s.jb.length<1)return{err:'e_slots'};if(s.co<c)return{err:'e_coins'};
  s.co-=c;s.jb.push({p,st:1,end:now+P[p].t1*1000});return{res:{k:'crear',c}}}
 if(a==='procesar'){const p=idx(b.p);if(p<0)return{err:'srv_err'};
  if(s.cr[p]<1)return{err:'e_noraw'};if(s.sl-s.jb.length<1)return{err:'e_slots'};
  s.dt.pr++;s.cr[p]--;s.jb.push({p,st:2,end:now+P[p].t2*1000});return{res:{k:'procesar',p}}}
 if(a==='vender'){const p=idx(b.p);if(p<0)return{err:'srv_err'};const h=s.rd[p];if(h<1)return{err:'e_noready'};
  let n=Math.floor(Number(b.n));n=n>=1?Math.min(n,h):h;s.rd[p]=h-n;
  let raid=Math.random()<risk(s),shield=false;s.ht=Math.min(100,s.ht+Math.min(50,10+n*3.5));
  if(raid&&s.sh){s.sh=0;raid=false;shield=true}
  if(raid){s.raids++;const f=Math.round(Math.min(s.co,40+s.tot*.07));s.co-=f;s.rd=[0,0,0];s.ht=Math.max(0,s.ht-30);
   let x=false;if(s.jb.length&&Math.random()<.4){s.jb.splice(Math.floor(Math.random()*s.jb.length),1);x=true}
   return{res:{k:'raid',f,x}}}
  const g=Math.round(n*price(s,p,now)*(.85+Math.random()*.3));
  s.mp[p]=Math.max(.35,s.mp[p]*Math.pow(.92,n));s.co+=g;s.tot+=g;s.pt+=Math.floor(g/10);s.dt.sold+=g;
  return{res:{k:'sold',n,g,shield,vip:vipm(s,p,now)>1}}}
 if(a==='mejora'){const k=b.k;if(k!=='sl'&&k!=='sg')return{err:'srv_err'};
  if((k==='sl'&&s.sl>=8)||(k==='sg'&&s.sg>=5))return{err:'max'};
  const c=ucost(s,k);if(s.co<c)return{err:'e_coins'};s.co-=c;s[k]++;return{res:{k:'upg'}}}
 if(a==='spin'){
  if(b.ad){if(s.dt.sa>=5)return{err:'r_noad'};if(!ctx.useAd())return{err:'ad_none'};s.dt.sa++}
  else{if(now<s.sp)return{err:'wait'};s.sp=now+8*3600*1000}
  let r=Math.random()*100,i=7,acc=0;for(let j=0;j<8;j++){acc+=PW[j];if(r<acc){i=j;break}}
  const k=PK[i],R=rent(s);let vp=-1;
  if(k==='c1')s.co+=Math.round(R*.6);else if(k==='c2')s.co+=Math.round(R*1.6);else if(k==='jk')s.co+=Math.round(R*5);
  else if(k==='pt')s.pt+=30;else if(k==='cl')s.ht=Math.max(0,s.ht-40);
  else if(k==='vp'){const un=unl(s);vp=un[Math.floor(Math.random()*un.length)];s.vp=vp;s.vu=now+90000}
  else if(k==='sh')s.sh=1;
  s.dt.sp++;return{res:{k:'spin',i,vp}}}
 if(a==='boost'){if(s.bo>now||s.bc>now)return{err:'wait'};if(!ctx.useAd())return{err:'ad_none'};
  s.bo=now+120000;s.bc=now+600000;return{res:{k:'boost'}}}
 if(a==='adtask'){if(s.dt.ad>=3)return{err:'wait'};if(!ctx.useAd())return{err:'ad_none'};s.dt.ad++;s.pt+=20;return{res:{k:'give',co:0,pt:20}}}
 if(a==='checkin'){if(s.dt.ci)return{err:'wait'};const ys=day(now-864e5),d=fillN(s,ys)+1;
  s.sk=s.lc===ys?s.sk+1:1;s.lc=s.dk;s.dt.ci=1;if(d===7)s.sp=0;
  const co=Math.round(rent(s)*(.5+.25*d)),pt=10*d+(d===7?40:0);s.co+=co;s.pt+=pt;return{res:{k:'give',co,pt}}}
 if(a==='claim'){const id=String(b.id),d=s.dt;let co=0,pt=0;
  if(id==='sold'){if(d.c.sold||d.sold<400)return{err:'wait'};d.c.sold=1;co=rent(s);pt=25}
  else if(id==='sp'){if(d.c.sp||d.sp<1)return{err:'wait'};d.c.sp=1;pt=15}
  else if(id==='pr'){if(d.c.pr||d.pr<3)return{err:'wait'};d.c.pr=1;pt=20}
  else if(id==='i1'||id==='i3'||id==='i10'){const n=+id.slice(1);if(s.dn[id]||s.inv<n)return{err:'wait'};s.dn[id]=1;pt={1:100,3:400,10:1500}[n]}
  else if(id==='ch'||id==='x'){if(s.dn[id]||(id==='ch'&&!ctx.member))return{err:'wait'};s.dn[id]=1;pt=100}
  else return{err:'srv_err'};
  s.co+=co;s.pt+=pt;return{res:{k:'give',co,pt}}}
 return{err:'srv_err'}}
function pub(s,now){const{nx,t,...o}=s;o.fl=fillN(s,day(now-864e5));return o}
module.exports={newState,tick,act,pub};
