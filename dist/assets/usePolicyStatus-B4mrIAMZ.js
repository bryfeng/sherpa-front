import{d9 as r,da as s,db as n,dd as a}from"./index-rkOzlyuE.js";/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=r("CircleCheckBig",[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=r("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);function p(){const t=s(n.systemPolicy.getStatus),e=a.useMemo(()=>t?{operational:t.operational,emergencyStop:t.emergencyStop,inMaintenance:t.inMaintenance,message:t.message}:{operational:!0,emergencyStop:!1,inMaintenance:!1,message:void 0},[t]),o=t===void 0,i=e.operational,c=!e.emergencyStop&&!e.inMaintenance,u=a.useMemo(()=>e.emergencyStop?e.message||"Trading is temporarily disabled for safety":e.inMaintenance?e.message||"System maintenance in progress":null,[e]),l=a.useMemo(()=>e.emergencyStop?"error":e.inMaintenance?"warning":"ok",[e]);return{status:e,isLoading:o,isOperational:i,canTrade:c,statusMessage:u,statusLevel:l}}function g(t){return s(n.systemPolicy.isChainAllowed,{chainId:t})??!0}function f(t){return s(n.systemPolicy.isTokenBlocked,{tokenAddress:t})??!1}function k(t){return s(n.systemPolicy.isContractBlocked,{contractAddress:t})??!1}export{d as C,y as a,g as b,f as c,k as d,p as u};
