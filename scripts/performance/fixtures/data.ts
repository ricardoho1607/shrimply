// Synthetic farm only. These modules are used by the local browser harness.
export const company = {id:'perf-farm',ownerId:'owner',companyName:'Performance Test Farm',businessSize:'small',farmType:'shrimp',timeZone:'Asia/Jakarta',country:'Indonesia',phone:'123',primaryLocation:'Test farm'};
export const user = {id:'owner',uid:'owner',role:'owner',email:'test@example.test',name:'Test Owner',companyId:company.id,hasCompletedSetup:true};
export const ponds = Array.from({length:24}, (_,p) => ({
  id:`pond-${p}`,pondName:`Pond ${String(p+1).padStart(2,'0')}`,pondArea:2500,area:2500,density:40,
  initialPopulation:100000+p*1000,initialWeight:0.01,docStart:'2026-08-01',cycleStatus:'active',
  cycleId:'cycle-1',pondCycleId:`pond-${p}`,supplier:'Test hatchery',
  samplings:Array.from({length:80},(_,day)=>({id:`sample-${day}`,date:new Date(Date.UTC(2026,7,day+1,5)).toISOString(),mbw:0.2+day*0.2,mortality:day%7===0?10:0,phMorning:'7.8',phEvening:'8.0',doMorning:'5.5',doEvening:'5.8',transparency:'30',feedData:{totalDailyFeed:String(1+day*0.3),feedingResponse:'normal',cycleId:'cycle-1'}})),
  mortalityRecords:[],
}));
export const cycles=[{id:'cycle-1',cycleName:'Cycle 1',status:'active',startDate:'2026-08-01',createdAt:'2026-08-01'}];
export const feeds=[{id:'feed-1',name:'Test feed',type:'feed',quantity:1000,remainingQuantity:1000,quantityRemaining:1000,pricePerKg:1.5,totalCost:1500,stockHistory:[],usageHistory:[],purchaseHistory:[],date:'2026-10-01',unit:'kg',category:'Feed',brand:'Test brand'}];
export const expenses=Array.from({length:120},(_,i)=>({id:`expense-${i}`,date:'2026-10-01',amount:50,item:'Farm expense',category:'Utilities',paymentType:'Cash',type:'expense',cycleId:'cycle-1',timestamp:i,settlements:[],notes:'',reference:'',addedByName:'Test Owner'}));
export const revenues=[{id:'revenue-1',date:'2026-10-01',amount:20000,item:'Test sale',category:'Harvest',paymentType:'Cash',type:'income',cycleId:'cycle-1',timestamp:1,settlements:[],notes:'',reference:'',addedByName:'Test Owner'}];
const empty: never[]=[];
const result=(data:unknown=empty)=>({data,loading:false,error:null,user,company,companyId:company.id,scope:`owner:${company.id}`,loadMore:async()=>{},hasMore:false,loadingMore:false});
export const useCompanyId=()=>result();
export const useCompanyPonds=()=>result(ponds);
export const useCompanyCycles=()=>result(cycles);
export const useCompanyPhysicalPonds=()=>result(ponds.map(p=>({...p,activePondId:p.id})));
export const useCompanyBlocks=()=>result();
export const useCompanyMembers=()=>result([user]);
export const useCompanyFeeds=()=>result(feeds);
export const useCompanyAdditives=()=>result();
export const useCompanyAssets=()=>result();
export const useCompanyHarvestRecords=()=>result();
export const useCompanyLabReports=()=>result();
export const useCompanyLabPdfUsage=()=>result({});
export const useCompanyNotifications=()=>result();
export const useMarketplaceListings=()=>result();
export const useMonitoredCompanies=()=>result();
export const useDebouncedValue=(value:unknown)=>value;
export const useUnreadNotificationCount=()=>0;
export const useInventoryFeeds=()=>({feeds,additives:empty,ponds,loading:false,error:null,companyId:company.id});
export const useFinanceRecords=()=>({expenses,revenues,loading:false,error:null});
export const fetchCompanyPonds=async()=>ponds;
export const useAuth=()=>({user,company,loading:false,companyLoading:false,isAuthenticated:true,emailVerified:true,needsRoleSelection:false,needsSetup:false,isBuyer:false,signOut:async()=>{}});
export const useFarmDateKey=()=> '2026-10-28';
