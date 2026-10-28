import React from 'react';
export default function Link({href,prefetch:_,...props}:any){return <a href={typeof href==='string'?href:'#'} {...props}/>}
export const usePathname=()=>new URLSearchParams(location.search).get('screen')||'/dashboard';
export const useSearchParams=()=>new URLSearchParams();
export const useRouter=()=>({push:()=>{},replace:()=>{},refresh:()=>{}});
export function Image(props:any){return <img {...props}/>}
