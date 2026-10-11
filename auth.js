// Valida initData de Telegram (firma HMAC con el token del bot)
const crypto=require('crypto');
module.exports=function verifyInit(initData,token){
 if(typeof initData!=='string'||!initData||initData.length>4096)return null;
 const p=new URLSearchParams(initData),hash=p.get('hash');if(!hash)return null;p.delete('hash');
 const str=[...p.entries()].sort((a,b)=>a[0]<b[0]?-1:1).map(([k,v])=>k+'='+v).join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update(token).digest();
 const A=Buffer.from(crypto.createHmac('sha256',key).update(str).digest('hex')),B=Buffer.from(hash);
 if(A.length!==B.length||!crypto.timingSafeEqual(A,B))return null;
 if(Date.now()/1000-Number(p.get('auth_date')||0)>172800)return null;
 try{const u=JSON.parse(p.get('user'));return u&&u.id?{id:String(u.id),start:p.get('start_param')||''}:null}catch{return null}};
