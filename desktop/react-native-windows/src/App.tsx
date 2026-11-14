import React,{useEffect,useMemo,useReducer,useRef,useState} from 'react';
import {Image,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {filtered,initialRows,initialWorkflow,label,replace,reverse,splice,update,workflow} from './domain';
import type {Row} from './domain';

const buttonIcons={info:require('../assets/icons/info.png'),upload:require('../assets/icons/arrow-up-from-line.png'),download:require('../assets/icons/arrow-down-to-line.png')};
const RowView=React.memo(function RowView({row}:{row:Row}) {return <Text style={s.row}>{label(row)}: {row.value}</Text>;});

function Button({children,onPress,disabled=false,id,buttonRef,hint,primary=false,action=false,iconName}:{children:string;onPress:()=>void;disabled?:boolean;id?:string;buttonRef?:React.Ref<View>;hint?:string;primary?:boolean;action?:boolean;iconName?:keyof typeof buttonIcons}) {
 const [focused,setFocused]=useState(false);
 return <Pressable onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} ref={buttonRef} testID={id} accessibilityRole="button" accessibilityLabel={children} accessibilityHint={hint} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,primary&&s.primary,action&&s.action,disabled&&s.disabled,pressed&&s.pressed,focused&&s.focusRing]}><View style={s.buttonContent}>{iconName&&<Image source={buttonIcons[iconName]} style={[s.icon,{tintColor:primary?'white':'#171a18'}]} accessible={false}/>}<Text style={[s.buttonText,primary&&s.primaryText,action&&s.actionText]}>{children}</Text></View></Pressable>;
}
function Workbench({back}:{back:()=>void}) {
 const [state,set]=useState(initialRows);const [hz,setHz]=useState(0);
 const timer=useRef<ReturnType<typeof setInterval>|undefined>(undefined);const generation=useRef(0);
 const visible=useMemo(()=>filtered(state),[state]);
 const stopBurst=()=>{generation.current++;clearInterval(timer.current);timer.current=undefined;setHz(0);};
 const beginBurst=(rate:number)=>{
  stopBurst();const token=generation.current,started=performance.now();setHz(rate);
  timer.current=setInterval(()=>{if(token!==generation.current)return;if(performance.now()-started>=2000){stopBurst();return;}set(old=>token===generation.current?update(old):old);},1000/rate);
 };
 useEffect(()=>()=>{generation.current++;clearInterval(timer.current);},[]);
 return <View style={s.work}>
  <View style={s.header}><Text accessibilityRole="header" style={[s.heading,{fontSize:22,lineHeight:33,flexShrink:1}]}>List and filter workbench</Text><Button onPress={()=>{stopBurst();back();}}>Back to main screen</Button></View>
  <Text style={s.copy}>Deterministic synthetic rows. No files, network, cryptography or native commands.</Text>
  <Text style={s.ready}>Workbench ready</Text>
  <View style={s.toolbar}>
   <Button onPress={()=>{stopBurst();set(old=>replace(old,1000));}}>1,000 rows</Button>
   <Button onPress={()=>{stopBurst();set(old=>replace(old,10000));}}>10,000 rows</Button>
   <Button onPress={()=>set(reverse)}>Reverse</Button><Button onPress={()=>set(splice)}>Splice 10</Button>
   <Button onPress={()=>set(update)}>Update 10%</Button>
   {([10,30,60] as const).map(rate=><Button key={rate} onPress={()=>beginBurst(rate)}>{`${rate} Hz / 2 s`}</Button>)}
   <Button onPress={stopBurst} hint={hz?'Updates active':'Updates stopped'}>Stop</Button>
   <Button onPress={()=>{stopBurst();set(initialRows());}}>Remount workload</Button>
  </View>
  <View style={s.filterCard}><Text style={s.label}>Filter synthetic rows</Text>
  <TextInput selectionColor="#047857" testID="workload-query" accessibilityLabel="Filter synthetic rows" value={state.query} onChangeText={query=>set(old=>({...old,query}))} style={s.filter}/>
  <Text testID="workload-summary" style={s.copy}>{visible.length} rows; tick {state.tick}</Text><Text style={s.hint}>Case-sensitive label filtering. Replacement advances row IDs; remount resets IDs, query and tick.</Text></View>
  <ScrollView style={s.list} testID="workload-rows" accessibilityLabel="Synthetic rows" removeClippedSubviews={false}>
   {visible.map(row=><RowView key={row.id} row={row}/>)}
  </ScrollView>
 </View>;
}
export default function App() {
 const [state,dispatch]=useReducer(workflow,undefined,initialWorkflow);
 const [work,setWork]=useState(false);const [about,setAbout]=useState(false);const [ready,setReady]=useState(false);
 const trigger=useRef<View>(null);const close=useRef<View>(null);const open=useRef<View>(null);const wasWork=useRef(false);
 const message='Zodiac GUI benchmark \u2014 \u05e9\u05dc\u05d5\u05dd \u2014 \u{1f320}';const [width,setWidth]=useState(960);
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
 return <View style={s.root} onLayout={event=>setWidth(event.nativeEvent.layout.width)}><ScrollView contentContainerStyle={[s.main,width<760&&s.narrowMain]}>
  <View style={[s.header,width<760&&s.stacked]}><View style={s.headerCopy}><View style={s.titleRow}><View style={s.brandIcon}><Image source={require('../assets/icons/orbit.png')} style={s.brandGlyph} accessible={false}/></View><Text accessibilityRole="header" style={s.title}>NeutronStar GUI Bench</Text></View><Text style={s.subtitle}>A UI-only simulation for comparing desktop frontends.</Text></View><Button iconName="info" buttonRef={trigger} onPress={()=>setAbout(true)}>About this test</Button></View>
  <View style={s.disclosure}><Image source={require('../assets/icons/shield-check.png')} style={s.shield} accessible={false}/><Text style={s.disclosureText}>{'SIMULATION \u00b7 NO FILES OR CRYPTOGRAPHY.'}</Text></View>
  <View style={[s.cards,width<760&&s.stacked]}>
   <View style={s.card}><View style={s.cardTitle}><Image source={require('../assets/icons/unlock-keyhole.png')} style={s.icon} accessible={false}/><Text style={s.heading}>Decrypt</Text></View><Text style={s.eyebrow}>SYNTHETIC INPUT</Text><View style={s.fixture}><Text style={s.fixtureText}>Synthetic sample: starlight.nsx</Text><Text style={s.hint}>No disk file is opened.</Text></View><Button id="decrypt" iconName="download" action disabled={running||!ready} onPress={()=>dispatch({type:'start'})}>Simulate decryption</Button></View>
   <View style={s.card}><View style={s.cardTitle}><Image source={require('../assets/icons/lock-keyhole.png')} style={s.icon} accessible={false}/><Text style={s.heading}>Encrypt</Text></View><Text style={s.eyebrow}>SYNTHETIC INPUT</Text><View style={s.fixture}><Text style={s.fixtureText}>{message}</Text></View><Button id="encrypt" iconName="upload" primary action disabled={running||!ready} onPress={()=>dispatch({type:'start'})}>Simulate encryption</Button></View>
  </View>
  <View style={s.statusCard}><View style={s.statusRow}><View style={s.statusLabel}><View style={s.dot}/><Text accessibilityLiveRegion="polite" style={s.ready}>{status}</Text></View><View style={s.toolbar}>{running&&<Button onPress={()=>dispatch({type:'cancel'})}>Cancel</Button>}<Button onPress={()=>dispatch({type:'reset'})}>Reset</Button></View></View><View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:state.progress}} style={s.track}><View style={[s.progress,{width:`${state.progress}%`}]}/></View><View style={s.caption}><Text style={s.small}>Simulation progress</Text><Text style={s.small}>{state.progress}%</Text></View></View>
  <View style={[s.footer,width<760&&s.stacked]}><Button buttonRef={open} disabled={running||!ready} onPress={()=>setWork(true)}>Open workbench</Button><Text style={[s.small,s.privacy]}>Local interface. Synthetic data. Nothing is encrypted or decrypted.</Text><Text style={s.small}>{'CONTROLLED RENDERER \u00b7 LOCAL STATE'}</Text></View>
 </ScrollView>
 <Modal visible={about} transparent animationType="none" onRequestClose={dismiss} onShow={()=>close.current?.focus()}>
  <View style={s.overlay}><View style={s.dialog} accessibilityViewIsModal>
   <Text style={s.heading}>About this test</Text><Text style={s.copy}>Actions are UI-only simulations. No files, cryptography, Go CLI, network or native bridge are involved.</Text>
   <Button id="about-close" buttonRef={close} onPress={dismiss}>Close</Button>
  </View></View>
 </Modal></View>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:'#f8faf9'},main:{width:'100%',maxWidth:1100,alignSelf:'center',padding:28},narrowMain:{padding:20},
 header:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:16},headerCopy:{flex:1},titleRow:{flexDirection:'row',alignItems:'center',gap:12},brandIcon:{width:40,height:40,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#dce3de',borderRadius:8,backgroundColor:'#f1f4f2'},brandGlyph:{width:20,height:20,tintColor:'#171a18'},icon:{width:16,height:16,tintColor:'#171a18'},shield:{width:14,height:14,tintColor:'#171a18'},
 title:{fontFamily:'Segoe UI',fontSize:24,lineHeight:31.2,letterSpacing:-0.96,fontWeight:'600',color:'#171a18',flexShrink:1},heading:{fontFamily:'Segoe UI',fontSize:16,lineHeight:24,fontWeight:'600',color:'#171a18'},subtitle:{fontFamily:'Segoe UI',fontSize:14,lineHeight:22.4,color:'#5d6660',marginTop:8},
 copy:{fontFamily:'Segoe UI',fontSize:14,lineHeight:22.4,color:'#5d6660'},label:{fontFamily:'Segoe UI',fontSize:14,lineHeight:21,fontWeight:'600',color:'#171a18'},disclosure:{flexDirection:'row',alignSelf:'flex-start',alignItems:'center',gap:7,backgroundColor:'#f1f4f2',borderWidth:1,borderColor:'#dce3de',borderRadius:6,paddingVertical:7,paddingHorizontal:9,marginTop:24},disclosureText:{fontFamily:'Segoe UI',fontSize:10,lineHeight:15,fontWeight:'600',letterSpacing:0.7,color:'#171a18'},
 cards:{flexDirection:'row',gap:20,marginTop:20},stacked:{flexDirection:'column'},card:{flex:1,padding:16,borderWidth:1,borderColor:'#dce3de',borderRadius:8,backgroundColor:'white'},cardTitle:{flexDirection:'row',alignItems:'center',gap:8},eyebrow:{fontFamily:'Segoe UI',fontSize:10,lineHeight:15,fontWeight:'600',letterSpacing:0.8,color:'#5d6660',marginTop:20,marginBottom:9},fixture:{minHeight:94,padding:13,borderWidth:1,borderColor:'#dce3de',borderRadius:6,backgroundColor:'#f1f4f2'},fixtureText:{fontFamily:'Segoe UI',fontSize:14,lineHeight:23.8,color:'#171a18'},hint:{fontFamily:'Segoe UI',fontSize:12,lineHeight:20.4,color:'#5d6660',marginTop:5},
 buttonContent:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},button:{backgroundColor:'white',borderRadius:8,paddingHorizontal:13,alignItems:'center',justifyContent:'center',height:40,borderWidth:1,borderColor:'#dce3de'},buttonText:{fontFamily:'Segoe UI',color:'#171a18',fontWeight:'500',fontSize:12},primary:{backgroundColor:'#047857',borderColor:'#047857'},primaryText:{color:'white'},action:{marginTop:16,width:'100%'},actionText:{fontSize:14},disabled:{opacity:0.55},pressed:{opacity:0.8},focusRing:{borderColor:'#047857',borderWidth:2},
 statusCard:{marginTop:20,padding:16,borderWidth:1,borderColor:'#dce3de',borderRadius:8,backgroundColor:'white'},statusRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},statusLabel:{flexDirection:'row',alignItems:'center',gap:8,flexShrink:1},dot:{width:7,height:7,borderRadius:4,backgroundColor:'#047857'},ready:{fontFamily:'Segoe UI',fontSize:13,lineHeight:24,fontWeight:'500',color:'#171a18'},toolbar:{flexDirection:'row',flexWrap:'wrap',gap:8},track:{height:6,marginTop:14,backgroundColor:'#f1f4f2',borderRadius:8,overflow:'hidden'},progress:{height:6,backgroundColor:'#047857'},caption:{flexDirection:'row',justifyContent:'space-between',marginTop:8},small:{fontFamily:'Segoe UI',fontSize:11,lineHeight:17.6,color:'#5d6660'},footer:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,marginTop:18},privacy:{flexShrink:1},
 overlay:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#07130d66',padding:28},dialog:{width:'100%',maxWidth:420,backgroundColor:'white',padding:24,borderWidth:1,borderColor:'#dce3de',borderRadius:8,gap:20},
 filterCard:{padding:16,gap:10,borderWidth:1,borderColor:'#dce3de',borderRadius:8,backgroundColor:'white'},work:{flex:1,padding:28,gap:16,backgroundColor:'#f8faf9'},filter:{borderWidth:1,borderColor:'#dce3de',borderRadius:8,backgroundColor:'white',paddingHorizontal:12,height:40,fontFamily:'Segoe UI',fontSize:14,color:'#171a18'},list:{flex:1,backgroundColor:'white',borderRadius:8,borderWidth:1,borderColor:'#dce3de'},row:{fontFamily:'Segoe UI',fontSize:14,lineHeight:21,paddingVertical:5,paddingHorizontal:12,color:'#171a18',borderBottomWidth:1,borderColor:'#dce3de'}
});
