<script lang="ts">
 let {value,onChange,disabled}:{value:Record<string,unknown>;onChange:(key:string,value:unknown)=>void;disabled:boolean}=$props();
 function text(v:unknown){return typeof v==='string'?v:JSON.stringify(v??'',null,2)}
 function parse(v:string,old:unknown){if(Array.isArray(old)){try{return JSON.parse(v)}catch{return v.split('\n').filter(Boolean)}}if(old&&typeof old==='object'){try{return JSON.parse(v)}catch{return old}}if(typeof old==='number'){const n=Number(v);return Number.isFinite(n)?n:v}if(typeof old==='boolean')return v==='true';return v;}
</script>
<div class="space-y-3">{#each Object.entries(value) as [key,item]}<label class="block">{key.replaceAll(/([A-Z])/g,' $1')}<textarea class="block w-full" rows="{typeof item==='string'?3:5}" value={text(item)} disabled={disabled} oninput={(e)=>onChange(key,parse(e.currentTarget.value,item))}></textarea></label>{/each}</div>
