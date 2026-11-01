import React,{useEffect,useMemo,useReducer,useRef,useState} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {filtered,initialRows,initialWorkflow,label,replace,reverse,splice,update,workflow} from './domain';

function Button({children,onPress,disabled=false,id,buttonRef}:{children:string;onPress:()=>void;disabled?:boolean;id?:string;buttonRef?:React.Ref<View>}) {
 return <Pressable ref={buttonRef} testID={id} accessibilityRole="button" accessibilityLabel={children} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,disabled&&s.disabled,pressed&&s.pressed]}><Text style={s.buttonText}>{children}</Text></Pressable>;
}
function Workbench({back}:{back:()=>void}) {
 const [state,set]=useState(initialRows);const [hz,setHz]=useState(0);
 const visible=useMemo(()=>filtered(state),[state]);
 useEffect(()=>{
  if(!hz)return;const started=performance.now();
  const timer=setInterval(()=>{if(performance.now()-started>=2000){setHz(0);return;}set(update);},1000/hz);
  return()=>clearInterval(timer);
 },[hz]);
 return <View style={s.work}>
  <Text accessibilityRole="header" style={s.heading}>List and filter workbench</Text>
  <Text style={s.copy}>Deterministic synthetic rows. No files, network, cryptography or native commands.</Text>
  <Text style={s.ready}>Workbench ready</Text>
  <View style={s.toolbar}>
   <Button onPress={back}>Back to main screen</Button>
   <Button onPress={()=>{setHz(0);set(old=>replace(old,1000));}}>1,000 rows</Button>
   <Button onPress={()=>{setHz(0);set(old=>replace(old,10000));}}>10,000 rows</Button>
   <Button onPress={()=>set(reverse)}>Reverse</Button><Button onPress={()=>set(splice)}>Splice 10</Button>
   <Button onPress={()=>set(update)}>Update 10%</Button>
   {([10,30,60] as const).map(rate=><Button key={rate} onPress={()=>setHz(rate)}>{`${rate} Hz / 2 s`}</Button>)}
   <Button onPress={()=>setHz(0)} disabled={!hz}>Stop</Button>
   <Button onPress={()=>{setHz(0);set(initialRows());}}>Remount workload</Button>
  </View>
  <Text style={s.label}>Filter synthetic rows</Text>
  <TextInput testID="workload-query" accessibilityLabel="Filter synthetic rows" value={state.query} onChangeText={query=>set(old=>({...old,query}))} style={s.filter}/>
  <Text testID="workload-summary" style={s.copy}>{visible.length} rows; tick {state.tick}</Text>
  <ScrollView style={s.list} testID="workload-rows" accessibilityLabel="Synthetic rows" removeClippedSubviews={false}>
   {visible.map(row=><Text key={row.id} style={s.row}>{label(row)}: {row.value}</Text>)}
  </ScrollView>
 </View>;
}
export default function App() {
 const [state,dispatch]=useReducer(workflow,undefined,initialWorkflow);
 const [work,setWork]=useState(false);const [about,setAbout]=useState(false);const [ready,setReady]=useState(false);
 const trigger=useRef<View>(null);const close=useRef<View>(null);const open=useRef<View>(null);const wasWork=useRef(false);
 const [message,setMessage]=useState('Zodiac GUI benchmark — שלום — 🌠');const {width}=useWindowDimensions();
 useEffect(()=>{const id=requestAnimationFrame(()=>requestAnimationFrame(()=>setReady(true)));return()=>cancelAnimationFrame(id);},[]);
 useEffect(()=>{if(!work&&wasWork.current)requestAnimationFrame(()=>open.current?.focus());wasWork.current=work;},[work]);
 useEffect(()=>{
  if(state.phase!=='running')return;const generation=state.generation,started=performance.now();
  const timer=setInterval(()=>dispatch({type:'advance',generation,elapsed:performance.now()-started}),100);
  return()=>clearInterval(timer);
 },[state.phase,state.generation]);
 const dismiss=()=>{setAbout(false);requestAnimationFrame(()=>trigger.current?.focus());};
 const running=state.phase==='running';
 const status=!ready?'Loading…':state.phase==='ready'?'Ready':running?'Simulation running…':state.phase==='success'?'Simulation complete. No file was changed.':'Simulation canceled.';
 if(work)return <Workbench back={()=>setWork(false)}/>;
 return <View style={s.root}><ScrollView contentContainerStyle={s.main}>
  <Text accessibilityRole="header" style={s.title}>NeutronStar GUI Bench</Text>
  <Text style={s.copy}>A UI-only simulation for comparing desktop frontends.</Text>
  <Text style={s.disclosure}>SIMULATION · NO FILES OR CRYPTOGRAPHY.</Text>
  <View style={[s.cards,width<640&&s.stacked]}>
   <View style={s.card}><Text style={s.heading}>Decrypt</Text><Text style={s.label}>Synthetic input</Text><Text style={s.copy}>Synthetic sample: starlight.nsx</Text><Text style={s.copy}>No disk file is opened.</Text><Button id="decrypt" disabled={running||!ready} onPress={()=>dispatch({type:'start'})}>Simulate decryption</Button></View>
   <View style={s.card}><Text style={s.heading}>Encrypt</Text><Text style={s.label}>Message</Text><TextInput accessibilityLabel="Message" multiline value={message} onChangeText={setMessage} style={s.message}/><Button id="encrypt" disabled={running||!ready} onPress={()=>dispatch({type:'start'})}>Simulate encryption</Button></View>
  </View>
  <Text accessibilityLiveRegion="polite" style={s.ready}>{status}</Text>
  <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:state.progress}} style={s.track}><View style={[s.progress,{width:`${state.progress}%`}]}/></View>
  <View style={s.toolbar}>
   {running&&<Button onPress={()=>dispatch({type:'cancel'})}>Cancel</Button>}
   <Button onPress={()=>dispatch({type:'reset'})}>Reset</Button><Button buttonRef={open} disabled={running||!ready} onPress={()=>setWork(true)}>Open workbench</Button>
   <Button buttonRef={trigger} onPress={()=>setAbout(true)}>About this test</Button>
  </View>
 </ScrollView>
 <Modal visible={about} transparent animationType="none" onRequestClose={dismiss} onShow={()=>close.current?.focus()}>
  <View style={s.overlay}><View style={s.dialog} accessibilityViewIsModal>
   <Text style={s.heading}>About this test</Text><Text style={s.copy}>Actions are UI-only simulations. No files, cryptography, Go CLI, network or native bridge are involved.</Text>
   <Button id="about-close" buttonRef={close} onPress={dismiss}>Close</Button>
  </View></View>
 </Modal></View>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:'#fafafa'},main:{padding:24,gap:16},title:{fontFamily:'Inter',fontSize:30,fontWeight:'600',color:'#18181b'},heading:{fontFamily:'Inter',fontSize:22,fontWeight:'600',color:'#18181b'},
 copy:{fontFamily:'Inter',fontSize:14,color:'#52525b'},label:{fontFamily:'Inter',fontSize:13,fontWeight:'600',color:'#27272a'},disclosure:{fontFamily:'Inter',fontSize:12,fontWeight:'600',color:'#047857'},
 cards:{flexDirection:'row',gap:16},stacked:{flexDirection:'column'},card:{flex:1,padding:20,gap:14,borderWidth:1,borderColor:'#d4d4d8',borderRadius:12,backgroundColor:'white'},
 button:{backgroundColor:'#047857',borderRadius:6,paddingVertical:10,paddingHorizontal:14,alignItems:'center',justifyContent:'center',minHeight:38,borderWidth:1,borderColor:'#065f46'},buttonText:{fontFamily:'Inter',color:'white',fontWeight:'500',fontSize:14},disabled:{opacity:0.45},pressed:{backgroundColor:'#064e3b'},
 message:{height:72,borderColor:'#a1a1aa',borderWidth:1,padding:8,color:'#18181b',fontFamily:'Inter',backgroundColor:'#fafafa'},ready:{fontFamily:'Inter',fontSize:14,fontWeight:'600',color:'#18181b'},
 toolbar:{flexDirection:'row',flexWrap:'wrap',gap:8},track:{height:8,backgroundColor:'#e4e4e7',borderRadius:4,overflow:'hidden'},progress:{height:8,backgroundColor:'#059669'},
 overlay:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#00000055',padding:24},dialog:{backgroundColor:'white',padding:24,borderRadius:12,gap:20,maxWidth:460},
 work:{flex:1,padding:20,gap:12,backgroundColor:'#fafafa'},filter:{borderWidth:1,borderColor:'#a1a1aa',backgroundColor:'white',padding:8,minHeight:38,fontFamily:'Inter',color:'#18181b'},list:{flex:1,backgroundColor:'white',borderWidth:1,borderColor:'#d4d4d8'},row:{fontFamily:'Inter',fontSize:14,lineHeight:28,paddingHorizontal:12,color:'#18181b',borderBottomWidth:1,borderColor:'#e4e4e7'}
});
