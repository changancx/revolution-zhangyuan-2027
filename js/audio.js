'use strict';
/* ══════════════════════════════════════════════════════════
   声音：全部用 WebAudio 现场合成，不加载任何音频文件
   - Sfx.play('click' | 'ok' | 'bad' | 'stamp' | 'paper' | 'type' | 'crowd' | 'bolt' | 'alarm' | 'win')
   - Music.setMode('calm' | 'tense' | 'off')
   ══════════════════════════════════════════════════════════ */
const Sound = (function(){
  let ctx=null, master=null, mGain=null, timer=null, mode='calm';
  let on=true;
  try{ const o=JSON.parse(localStorage.getItem('ty.audio')||'{}'); if(o.on===false) on=false; }catch(e){}

  function save(){
    try{ localStorage.setItem('ty.audio', JSON.stringify({on:on})); }catch(e){}
  }
  function ensure(){
    if(ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    try{ ctx=new AC(); }catch(e){ return null; }
    master=ctx.createGain(); master.gain.value = on?0.55:0;
    master.connect(ctx.destination);
    mGain=ctx.createGain(); mGain.gain.value=0.18; mGain.connect(master);
    return ctx;
  }
  function resume(){
    const c=ensure(); if(!c) return;
    if(c.state==='suspended') c.resume();
  }

  /* 一个音：方波/锯齿，短包络 */
  function tone(freq,dur,type,vol,when,gainNode){
    const c=ensure(); if(!c||!on) return;
    const t=when||c.currentTime;
    const o=c.createOscillator(), g=c.createGain();
    o.type=type||'square';
    o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol||0.12,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(gainNode||master);
    o.start(t); o.stop(t+dur+0.03);
  }
  /* 噪声：纸声、人群、电流 */
  function noise(dur,vol,center,q,gainNode){
    const c=ensure(); if(!c||!on) return;
    const n=Math.max(1,Math.floor(c.sampleRate*dur));
    const buf=c.createBuffer(1,n,c.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,1.6);
    const s=c.createBufferSource(); s.buffer=buf;
    let node=s;
    if(center){
      const f=c.createBiquadFilter();
      f.type='bandpass'; f.frequency.value=center; f.Q.value=q||1.1;
      s.connect(f); node=f;
    }
    const g=c.createGain(); g.gain.value=vol||0.09;
    node.connect(g); g.connect(gainNode||master);
    s.start();
  }

  const S={
    click(){ tone(240,0.05,'square',0.09); },
    ok(){ tone(523,0.05,'square',0.10); tone(784,0.07,'square',0.07); },
    bad(){ tone(150,0.16,'sawtooth',0.11); tone(110,0.2,'sawtooth',0.07); },
    stamp(){ tone(90,0.08,'square',0.16); noise(0.07,0.10,900,1.4); },
    paper(){ noise(0.2,0.07,2400,0.9); },
    type(){ noise(0.035,0.05,1500,1.6); },
    crowd(){ noise(0.55,0.06,620,0.8); },
    bolt(){ tone(70,0.28,'sawtooth',0.15); noise(0.22,0.09,320,0.9); },
    alarm(){ tone(660,0.11,'square',0.11); tone(440,0.13,'square',0.09); },
    pips(){ tone(880,0.04,'square',0.07); tone(1174,0.05,'square',0.06); },
    win(){ const c=ensure(); if(!c) return; [523,659,784,1046].forEach((f,i)=>tone(f,0.3,'square',0.10, c.currentTime+i*0.13)); },
    lose(){ const c=ensure(); if(!c) return; [392,330,262,196].forEach((f,i)=>tone(f,0.45,'sawtooth',0.09, c.currentTime+i*0.19)); }
  };

  /* 背景乐：两个音阶循环 + 低音持续音，慢速推进 */
  const CALM=[196,220,262,294,262,220];
  const TENSE=[147,147,175,147,131,147];
  function beat(){
    const c=ensure(); if(!c||!on||mode==='off') return;
    const t=c.currentTime, tense=(mode==='tense');
    const scale=tense?TENSE:CALM;
    const step=tense?0.55:1.5;
    const f=scale[Math.floor(Math.random()*scale.length)];
    // 低音持续
    tone(tense?73:98, step*1.6, 'sine', tense?0.13:0.10, t, mGain);
    // 主音
    tone(f, step*1.1, tense?'square':'triangle', 0.045, t+0.02, mGain);
    if(tense) tone(73, 0.18, 'square', 0.06, t, mGain);
    if(!tense && Math.random()<0.45) tone(f*2, 0.5, 'triangle', 0.022, t+0.25, mGain);
  }

  function startMusic(){
    const c=ensure(); if(!c||mode==='off') return;
    if(timer) return;
    beat();
    timer=setInterval(beat, mode==='tense'?560:1500);
  }
  function stopMusic(){
    if(timer){ clearInterval(timer); timer=null; }
  }

  return {
    get on(){ return on; },
    toggle(){
      on=!on;
      save();
      if(on){ resume(); if(mode!=='off') startMusic(); }
      else { stopMusic(); }
      if(master) master.gain.value = on?0.55:0;
      return on;
    },
    play(n){ if(!on) return; resume(); (S[n]||S.click)(); },
    setMode(m){
      mode=m;
      stopMusic();
      if(m!=='off' && on){ resume(); startMusic(); }
    },
    /* 浏览器要求先有用户手势，第一次点击时调用 */
    unlock(){ resume(); if(on && mode!=='off') startMusic(); }
  };
})();
