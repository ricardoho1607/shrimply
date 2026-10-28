const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

function renderAuth(fontsLoaded, fontError) {
  const code = ts.transpileModule(fs.readFileSync(__dirname+'/auth.tsx','utf8'), {
    fileName: 'auth.tsx', compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
  }).outputText;
  const react = {useState: value=>[value,()=>{}],useCallback:fn=>fn,useMemo:fn=>fn(),useEffect:()=>{}};
  const native = { Platform:{OS:'android'},StyleSheet:{create:x=>x},Animated:{Value:class {constructor(value){this.value=value}},View:'View'} };
  for(const name of ['ActivityIndicator','Image','KeyboardAvoidingView','SafeAreaView','Text','TextInput','TouchableOpacity','View']) native[name]=name;
  const mod={exports:{}};
  const requireMock = name => {
    if(name==='react') return react;
    if(name==='react/jsx-runtime') return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
    if(name==='react-native') return native;
    if(name==='expo-font') return {useFonts:()=>[fontsLoaded,fontError]};
    if(name==='expo-router') return {useLocalSearchParams:()=>({})};
    if(name==='react-native-safe-area-context') return {useSafeAreaInsets:()=>({bottom:0})};
    if(name==='expo-web-browser') return {maybeCompleteAuthSession(){}};
    if(name.includes('AuthContext')) return {useAuth:()=>({loading:false})};
    if(name.endsWith('.png')) return 1;
    return {};
  };
  new Function('module','exports','require',code)(mod,mod.exports,requireMock);
  return mod.exports.default();
}
function inputs(tree) {
  if(!tree || typeof tree!=='object') return [];
  return [...(tree.type==='TextInput'?[tree.props]:[]), ...[tree.props?.children].flat(Infinity).flatMap(inputs)];
}
for(const [name,loaded,error] of [['loading',false,null],['failed',false,new Error('Font unavailable')],['ready',true,null]]) {
 test(`native login remains usable when decorative font is ${name}`,()=>{
   const fields=inputs(renderAuth(loaded,error));
   assert.ok(fields.some(field=>field.keyboardType==='email-address' && field.editable), 'email input is available');
   assert.ok(fields.some(field=>field.secureTextEntry && field.editable), 'password input is available');
 });
}
