// Animation never chooses the reward. It waits for the server receipt before stopping.
export function createForgeReel({paint,finish,tick=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,reducedMotion=()=>false}){
  let active=false,timer=null,receipt=null,requestId=null,step=0,max=5,shown=0;
  function stop(){if(timer!==null)clearTimer(timer);timer=null;active=false;}
  function frame(){
    if(!active)return;
    if(receipt&&(reducedMotion()||step>=28)){const result=receipt;stop();paint(result.to,false);finish(result);return;}
    shown=(shown+1+(step%3===0?1:0))%(max+1);step++;paint(shown,true);if(step%2===0)tick();
    timer=setTimer(frame,reducedMotion()?180:step<16?55:step<23?110:200);
  }
  return {
    start(id,from,maximum=5){if(active)return false;active=true;receipt=null;requestId=id;step=0;max=maximum;shown=from;frame();return true;},
    receive(result){if(!active||result.id!==requestId)return false;receipt=result;return true;},
    fail(){stop();receipt=null;paint(shown,false);},
    get active(){return active;}
  };
}
