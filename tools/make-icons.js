/* 手順帳 アプリアイコン生成（依存なし・Node内蔵zlibのみ）。
   「重なったステップカード」マークを幾何形状で描画し、PNGを書き出す。
   実行: node tools/make-icons.js  → icons/ に各サイズを出力。
   ※外部ライブラリ・オンライン変換・フォント不使用（完全オフライン・再現可能）。 */
const fs=require("fs"), zlib=require("zlib"), path=require("path");

const INDIGO=[44,74,120], INDIGO_DEEP=[30,54,90], WHITE=[255,255,255], PAPER=[250,247,241];
const SS=4; // スーパーサンプリング（アンチエイリアス）

function render(size,{maskable=false}={}){
  const N=size*SS, buf=new Uint8Array(N*N*4);
  const put=(x,y,c)=>{const i=(y*N+x)*4;buf[i]=c[0];buf[i+1]=c[1];buf[i+2]=c[2];buf[i+3]=255;};
  const inRound=(px,py,x,y,w,h,r)=>{
    if(px<x||py<y||px>=x+w||py>=y+h)return false;
    const cx=Math.min(Math.max(px,x+r),x+w-r), cy=Math.min(Math.max(py,y+r),y+h-r);
    const dx=px-cx,dy=py-cy; return dx*dx+dy*dy<=r*r;
  };
  const fillRound=(x,y,w,h,r,c)=>{
    const x0=Math.max(0,Math.floor(x)),x1=Math.min(N,Math.ceil(x+w));
    const y0=Math.max(0,Math.floor(y)),y1=Math.min(N,Math.ceil(y+h));
    for(let py=y0;py<y1;py++)for(let px=x0;px<x1;px++) if(inRound(px+0.5,py+0.5,x,y,w,h,r)) put(px,py,c);
  };
  // 背景：maskableは全面ベタ（マスクで角が削られても透明が出ない）、anyは角丸
  if(maskable) fillRound(0,0,N,N,0,INDIGO);
  else fillRound(0,0,N,N,0.20*N,INDIGO);

  const pad=(maskable?0.24:0.16)*N;          // maskableは安全領域確保で内側に
  const inner=N-2*pad;
  const cw=inner*0.64, ch=inner*0.80, rr=0.085*N, d=0.058*N;
  const fx=pad+(inner-cw)/2 + d, fy=pad+(inner-ch)/2 + d;
  // 後ろ2枚（白＋わずかに沈ませた縁）
  fillRound(fx-2*d,fy-2*d,cw,ch,rr,WHITE);
  fillRound(fx-1*d,fy-1*d,cw,ch,rr,WHITE);
  // 前面カード
  fillRound(fx,fy,cw,ch,rr,WHITE);
  // 前面カード上部のインディゴ帯（カテゴリタブ＝アプリのcattabを想起）
  fillRound(fx+0.14*cw, fy+0.12*ch, 0.52*cw, 0.11*ch, 0.04*N, INDIGO);
  // 手順を示す2本の細い線（インディゴ薄め＝deep）
  fillRound(fx+0.16*cw, fy+0.42*ch, 0.62*cw, 0.055*ch, 0.02*N, INDIGO_DEEP);
  fillRound(fx+0.16*cw, fy+0.62*ch, 0.46*cw, 0.055*ch, 0.02*N, INDIGO_DEEP);

  // ダウンサンプル（SS×SS平均）→ size×size RGBA
  const out=Buffer.alloc(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let r=0,g=0,b=0,a=0;
    for(let sy=0;sy<SS;sy++)for(let sx=0;sx<SS;sx++){
      const i=((y*SS+sy)*N+(x*SS+sx))*4; r+=buf[i];g+=buf[i+1];b+=buf[i+2];a+=buf[i+3];
    }
    const n=SS*SS, o=(y*size+x)*4;
    out[o]=r/n; out[o+1]=g/n; out[o+2]=b/n; out[o+3]=a/n;
  }
  return out;
}

// ---- 最小PNGエンコーダ（colortype6 RGBA） ----
const CRC=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function chunk(type,data){
  const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);
  const t=Buffer.from(type,"ascii");
  const crcBuf=Buffer.alloc(4);crcBuf.writeUInt32BE(crc32(Buffer.concat([t,data])),0);
  return Buffer.concat([len,t,data,crcBuf]);
}
function png(size,rgba){
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
  const raw=Buffer.alloc(size*(size*4+1));
  for(let y=0;y<size;y++){ raw[y*(size*4+1)]=0; rgba.copy(raw,y*(size*4+1)+1,y*size*4,(y+1)*size*4); }
  const idat=zlib.deflateSync(raw,{level:9});
  return Buffer.concat([sig,chunk("IHDR",ihdr),chunk("IDAT",idat),chunk("IEND",Buffer.alloc(0))]);
}

const dir=path.join(__dirname,"..","icons");
fs.mkdirSync(dir,{recursive:true});
const targets=[
  ["icon-192.png",192,{}],
  ["icon-512.png",512,{}],
  ["icon-maskable-512.png",512,{maskable:true}],
  ["apple-touch-icon-180.png",180,{}],
];
for(const [name,size,opt] of targets){
  fs.writeFileSync(path.join(dir,name),png(size,render(size,opt)));
  console.log("wrote",name,size+"x"+size);
}
