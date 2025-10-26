import{de as B,dd as b,di as O,dk as h,dw as g,eu as W,dv as w,ev as q,df as z,dg as T,dj as S,dh as N,du as M,e7 as x,dp as X,dq as J,dr as F,db as H,dc as p,dP as Y,dQ as y,da as K,dO as Z,dC as G,dM as Q}from"./index-DYGJqFH8.js";const i={INVALID_PAYMENT_CONFIG:"INVALID_PAYMENT_CONFIG",INVALID_RECIPIENT:"INVALID_RECIPIENT",INVALID_ASSET:"INVALID_ASSET",INVALID_AMOUNT:"INVALID_AMOUNT",UNKNOWN_ERROR:"UNKNOWN_ERROR",UNABLE_TO_INITIATE_PAYMENT:"UNABLE_TO_INITIATE_PAYMENT",INVALID_CHAIN_NAMESPACE:"INVALID_CHAIN_NAMESPACE",GENERIC_PAYMENT_ERROR:"GENERIC_PAYMENT_ERROR",UNABLE_TO_GET_EXCHANGES:"UNABLE_TO_GET_EXCHANGES",ASSET_NOT_SUPPORTED:"ASSET_NOT_SUPPORTED",UNABLE_TO_GET_PAY_URL:"UNABLE_TO_GET_PAY_URL",UNABLE_TO_GET_BUY_STATUS:"UNABLE_TO_GET_BUY_STATUS"},I={[i.INVALID_PAYMENT_CONFIG]:"Invalid payment configuration",[i.INVALID_RECIPIENT]:"Invalid recipient address",[i.INVALID_ASSET]:"Invalid asset specified",[i.INVALID_AMOUNT]:"Invalid payment amount",[i.UNKNOWN_ERROR]:"Unknown payment error occurred",[i.UNABLE_TO_INITIATE_PAYMENT]:"Unable to initiate payment",[i.INVALID_CHAIN_NAMESPACE]:"Invalid chain namespace",[i.GENERIC_PAYMENT_ERROR]:"Unable to process payment",[i.UNABLE_TO_GET_EXCHANGES]:"Unable to get exchanges",[i.ASSET_NOT_SUPPORTED]:"Asset not supported by the selected exchange",[i.UNABLE_TO_GET_PAY_URL]:"Unable to get payment URL",[i.UNABLE_TO_GET_BUY_STATUS]:"Unable to get buy status"};class c extends Error{get message(){return I[this.code]}constructor(e,s){super(I[e]),this.name="AppKitPayError",this.code=e,this.details=s,Error.captureStackTrace&&Error.captureStackTrace(this,c)}}const ee="https://rpc.walletconnect.org/v1/json-rpc";class te extends Error{}function ne(){const t=B.getSnapshot().projectId;return`${ee}?projectId=${t}`}async function L(t,e){const s=ne(),{sdkType:a,sdkVersion:r,projectId:o}=B.getSnapshot(),u={jsonrpc:"2.0",id:1,method:t,params:{...e||{},st:a,sv:r,projectId:o}},A=await(await fetch(s,{method:"POST",body:JSON.stringify(u),headers:{"Content-Type":"application/json"}})).json();if(A.error)throw new te(A.error.message);return A}async function V(t){return(await L("reown_getExchanges",t)).result}async function se(t){return(await L("reown_getExchangePayUrl",t)).result}async function ae(t){return(await L("reown_getExchangeBuyStatus",t)).result}const re=["eip155","solana"],ie={eip155:{native:{assetNamespace:"slip44",assetReference:"60"},defaultTokenNamespace:"erc20"},solana:{native:{assetNamespace:"slip44",assetReference:"501"},defaultTokenNamespace:"token"}};function v(t,e){const{chainNamespace:s,chainId:a}=b.parseCaipNetworkId(t),r=ie[s];if(!r)throw new Error(`Unsupported chain namespace for CAIP-19 formatting: ${s}`);let o=r.native.assetNamespace,u=r.native.assetReference;return e!=="native"&&(o=r.defaultTokenNamespace,u=e),`${`${s}:${a}`}/${o}:${u}`}function oe(t){const{chainNamespace:e}=b.parseCaipNetworkId(t);return re.includes(e)}async function ce(t){const{paymentAssetNetwork:e,activeCaipNetwork:s,approvedCaipNetworkIds:a,requestedCaipNetworks:r}=t,u=O.sortRequestedNetworks(a,r).find(_=>_.caipNetworkId===e);if(!u)throw new c(i.INVALID_PAYMENT_CONFIG);if(u.caipNetworkId===s.caipNetworkId)return;const d=h.getNetworkProp("supportsAllNetworks",u.chainNamespace);if(!((a==null?void 0:a.includes(u.caipNetworkId))||d))throw new c(i.INVALID_PAYMENT_CONFIG);try{await h.switchActiveNetwork(u)}catch(_){throw new c(i.GENERIC_PAYMENT_ERROR,_)}}async function ue(t,e,s){var d;if(e!==g.CHAIN.EVM)throw new c(i.INVALID_CHAIN_NAMESPACE);if(!s.fromAddress)throw new c(i.INVALID_PAYMENT_CONFIG,"fromAddress is required for native EVM payments.");const a=typeof s.amount=="string"?parseFloat(s.amount):s.amount;if(isNaN(a))throw new c(i.INVALID_PAYMENT_CONFIG);const r=((d=t.metadata)==null?void 0:d.decimals)??18,o=w.parseUnits(a.toString(),r);if(typeof o!="bigint")throw new c(i.GENERIC_PAYMENT_ERROR);return await w.sendTransaction({chainNamespace:e,to:s.recipient,address:s.fromAddress,value:o,data:"0x"})??void 0}async function le(t,e){if(!e.fromAddress)throw new c(i.INVALID_PAYMENT_CONFIG,"fromAddress is required for ERC20 EVM payments.");const s=t.asset,a=e.recipient,r=Number(t.metadata.decimals),o=w.parseUnits(e.amount.toString(),r);if(o===void 0)throw new c(i.GENERIC_PAYMENT_ERROR);return await w.writeContract({fromAddress:e.fromAddress,tokenAddress:s,args:[a,o],method:"transfer",abi:q.getERC20Abi(s),chainNamespace:g.CHAIN.EVM})??void 0}async function de(t,e){if(t!==g.CHAIN.SOLANA)throw new c(i.INVALID_CHAIN_NAMESPACE);if(!e.fromAddress)throw new c(i.INVALID_PAYMENT_CONFIG,"fromAddress is required for Solana payments.");const s=typeof e.amount=="string"?parseFloat(e.amount):e.amount;if(isNaN(s)||s<=0)throw new c(i.INVALID_PAYMENT_CONFIG,"Invalid payment amount.");try{if(!W.getProvider(t))throw new c(i.GENERIC_PAYMENT_ERROR,"No Solana provider available.");const r=await w.sendTransaction({chainNamespace:g.CHAIN.SOLANA,to:e.recipient,value:s,tokenMint:e.tokenMint});if(!r)throw new c(i.GENERIC_PAYMENT_ERROR,"Transaction failed.");return r}catch(a){throw a instanceof c?a:new c(i.GENERIC_PAYMENT_ERROR,`Solana payment failed: ${a}`)}}const $=0,R="unknown",n=z({paymentAsset:{network:"eip155:1",asset:"0x0",metadata:{name:"0x0",symbol:"0x0",decimals:0}},recipient:"0x0",amount:0,isConfigured:!1,error:null,isPaymentInProgress:!1,exchanges:[],isLoading:!1,openInNewTab:!0,redirectUrl:void 0,payWithExchange:void 0,currentPayment:void 0,analyticsSet:!1,paymentId:void 0}),l={state:n,subscribe(t){return J(n,()=>t(n))},subscribeKey(t,e){return X(n,t,e)},async handleOpenPay(t){this.resetState(),this.setPaymentConfig(t),this.subscribeEvents(),this.initializeAnalytics(),n.isConfigured=!0,T.sendEvent({type:"track",event:"PAY_MODAL_OPEN",properties:{exchanges:n.exchanges,configuration:{network:n.paymentAsset.network,asset:n.paymentAsset.asset,recipient:n.recipient,amount:n.amount}}}),await x.open({view:"Pay"})},resetState(){n.paymentAsset={network:"eip155:1",asset:"0x0",metadata:{name:"0x0",symbol:"0x0",decimals:0}},n.recipient="0x0",n.amount=0,n.isConfigured=!1,n.error=null,n.isPaymentInProgress=!1,n.isLoading=!1,n.currentPayment=void 0},setPaymentConfig(t){if(!t.paymentAsset)throw new c(i.INVALID_PAYMENT_CONFIG);try{n.paymentAsset=t.paymentAsset,n.recipient=t.recipient,n.amount=t.amount,n.openInNewTab=t.openInNewTab??!0,n.redirectUrl=t.redirectUrl,n.payWithExchange=t.payWithExchange,n.error=null}catch(e){throw new c(i.INVALID_PAYMENT_CONFIG,e.message)}},getPaymentAsset(){return n.paymentAsset},getExchanges(){return n.exchanges},async fetchExchanges(){try{n.isLoading=!0;const t=await V({page:$,asset:v(n.paymentAsset.network,n.paymentAsset.asset),amount:n.amount.toString()});n.exchanges=t.exchanges.slice(0,2)}catch{throw S.showError(I.UNABLE_TO_GET_EXCHANGES),new c(i.UNABLE_TO_GET_EXCHANGES)}finally{n.isLoading=!1}},async getAvailableExchanges(t){var e;try{const s=t!=null&&t.asset&&(t!=null&&t.network)?v(t.network,t.asset):void 0;return await V({page:(t==null?void 0:t.page)??$,asset:s,amount:(e=t==null?void 0:t.amount)==null?void 0:e.toString()})}catch{throw new c(i.UNABLE_TO_GET_EXCHANGES)}},async getPayUrl(t,e,s=!1){try{const a=Number(e.amount),r=await se({exchangeId:t,asset:v(e.network,e.asset),amount:a.toString(),recipient:`${e.network}:${e.recipient}`});return T.sendEvent({type:"track",event:"PAY_EXCHANGE_SELECTED",properties:{source:"pay",exchange:{id:t},configuration:{network:e.network,asset:e.asset,recipient:e.recipient,amount:a},currentPayment:{type:"exchange",exchangeId:t},headless:s}}),s&&(this.initiatePayment(),T.sendEvent({type:"track",event:"PAY_INITIATED",properties:{source:"pay",paymentId:n.paymentId||R,configuration:{network:e.network,asset:e.asset,recipient:e.recipient,amount:a},currentPayment:{type:"exchange",exchangeId:t}}})),r}catch(a){throw a instanceof Error&&a.message.includes("is not supported")?new c(i.ASSET_NOT_SUPPORTED):new Error(a.message)}},async openPayUrl(t,e,s=!1){try{const a=await this.getPayUrl(t.exchangeId,e,s);if(!a)throw new c(i.UNABLE_TO_GET_PAY_URL);const o=t.openInNewTab??!0?"_blank":"_self";return O.openHref(a.url,o),a}catch(a){throw a instanceof c?n.error=a.message:n.error=I.GENERIC_PAYMENT_ERROR,new c(i.UNABLE_TO_GET_PAY_URL)}},subscribeEvents(){n.isConfigured||(w.subscribeKey("connections",t=>{t.size>0&&this.handlePayment()}),N.subscribeKey("caipAddress",t=>{const e=w.hasAnyConnection(g.CONNECTOR_ID.WALLET_CONNECT);t&&(e?setTimeout(()=>{this.handlePayment()},100):this.handlePayment())}))},async handlePayment(){n.currentPayment={type:"wallet",status:"IN_PROGRESS"};const t=N.state.caipAddress;if(!t)return;const{chainId:e,address:s}=b.parseCaipAddress(t),a=h.state.activeChain;if(!s||!e||!a||!W.getProvider(a))return;const o=h.state.activeCaipNetwork;if(o&&!n.isPaymentInProgress)try{this.initiatePayment();const u=h.getAllRequestedCaipNetworks(),d=h.getAllApprovedCaipNetworkIds();switch(await ce({paymentAssetNetwork:n.paymentAsset.network,activeCaipNetwork:o,approvedCaipNetworkIds:d,requestedCaipNetworks:u}),await x.open({view:"PayLoading"}),a){case g.CHAIN.EVM:n.paymentAsset.asset==="native"&&(n.currentPayment.result=await ue(n.paymentAsset,a,{recipient:n.recipient,amount:n.amount,fromAddress:s})),n.paymentAsset.asset.startsWith("0x")&&(n.currentPayment.result=await le(n.paymentAsset,{recipient:n.recipient,amount:n.amount,fromAddress:s})),n.currentPayment.status="SUCCESS";break;case g.CHAIN.SOLANA:n.currentPayment.result=await de(a,{recipient:n.recipient,amount:n.amount,fromAddress:s,tokenMint:n.paymentAsset.asset==="native"?void 0:n.paymentAsset.asset}),n.currentPayment.status="SUCCESS";break;default:throw new c(i.INVALID_CHAIN_NAMESPACE)}}catch(u){u instanceof c?n.error=u.message:n.error=I.GENERIC_PAYMENT_ERROR,n.currentPayment.status="FAILED",S.showError(n.error)}finally{n.isPaymentInProgress=!1}},getExchangeById(t){return n.exchanges.find(e=>e.id===t)},validatePayConfig(t){const{paymentAsset:e,recipient:s,amount:a}=t;if(!e)throw new c(i.INVALID_PAYMENT_CONFIG);if(!s)throw new c(i.INVALID_RECIPIENT);if(!e.asset)throw new c(i.INVALID_ASSET);if(a==null||a<=0)throw new c(i.INVALID_AMOUNT)},handlePayWithWallet(){const t=N.state.caipAddress;if(!t){M.push("Connect");return}const{chainId:e,address:s}=b.parseCaipAddress(t),a=h.state.activeChain;if(!s||!e||!a){M.push("Connect");return}this.handlePayment()},async handlePayWithExchange(t){try{n.currentPayment={type:"exchange",exchangeId:t};const{network:e,asset:s}=n.paymentAsset,a={network:e,asset:s,amount:n.amount,recipient:n.recipient},r=await this.getPayUrl(t,a);if(!r)throw new c(i.UNABLE_TO_INITIATE_PAYMENT);return n.currentPayment.sessionId=r.sessionId,n.currentPayment.status="IN_PROGRESS",n.currentPayment.exchangeId=t,this.initiatePayment(),{url:r.url,openInNewTab:n.openInNewTab}}catch(e){return e instanceof c?n.error=e.message:n.error=I.GENERIC_PAYMENT_ERROR,n.isPaymentInProgress=!1,S.showError(n.error),null}},async getBuyStatus(t,e){var s,a;try{const r=await ae({sessionId:e,exchangeId:t});return(r.status==="SUCCESS"||r.status==="FAILED")&&T.sendEvent({type:"track",event:r.status==="SUCCESS"?"PAY_SUCCESS":"PAY_ERROR",properties:{source:"pay",paymentId:n.paymentId||R,configuration:{network:n.paymentAsset.network,asset:n.paymentAsset.asset,recipient:n.recipient,amount:n.amount},currentPayment:{type:"exchange",exchangeId:(s=n.currentPayment)==null?void 0:s.exchangeId,sessionId:(a=n.currentPayment)==null?void 0:a.sessionId,result:r.txHash}}}),r}catch{throw new c(i.UNABLE_TO_GET_BUY_STATUS)}},async updateBuyStatus(t,e){try{const s=await this.getBuyStatus(t,e);n.currentPayment&&(n.currentPayment.status=s.status,n.currentPayment.result=s.txHash),(s.status==="SUCCESS"||s.status==="FAILED")&&(n.isPaymentInProgress=!1)}catch{throw new c(i.UNABLE_TO_GET_BUY_STATUS)}},initiatePayment(){n.isPaymentInProgress=!0,n.paymentId=crypto.randomUUID()},initializeAnalytics(){n.analyticsSet||(n.analyticsSet=!0,this.subscribeKey("isPaymentInProgress",t=>{var e;if((e=n.currentPayment)!=null&&e.status&&n.currentPayment.status!=="UNKNOWN"){const s={IN_PROGRESS:"PAY_INITIATED",SUCCESS:"PAY_SUCCESS",FAILED:"PAY_ERROR"}[n.currentPayment.status];T.sendEvent({type:"track",event:s,properties:{source:"pay",paymentId:n.paymentId||R,configuration:{network:n.paymentAsset.network,asset:n.paymentAsset.asset,recipient:n.recipient,amount:n.amount},currentPayment:{type:n.currentPayment.type,exchangeId:n.currentPayment.exchangeId,sessionId:n.currentPayment.sessionId,result:n.currentPayment.result}}})}}))}},pe=F`
  wui-separator {
    margin: var(--apkt-spacing-3) calc(var(--apkt-spacing-3) * -1) var(--apkt-spacing-2)
      calc(var(--apkt-spacing-3) * -1);
    width: calc(100% + var(--apkt-spacing-3) * 2);
  }

  .token-display {
    padding: var(--apkt-spacing-3) var(--apkt-spacing-3);
    border-radius: var(--apkt-borderRadius-5);
    background-color: var(--apkt-tokens-theme-backgroundPrimary);
    margin-top: var(--apkt-spacing-3);
    margin-bottom: var(--apkt-spacing-3);
  }

  .token-display wui-text {
    text-transform: none;
  }

  wui-loading-spinner {
    padding: var(--apkt-spacing-2);
  }
`;var E=function(t,e,s,a){var r=arguments.length,o=r<3?e:a===null?a=Object.getOwnPropertyDescriptor(e,s):a,u;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(t,e,s,a);else for(var d=t.length-1;d>=0;d--)(u=t[d])&&(o=(r<3?u(o):r>3?u(e,s,o):u(e,s))||o);return r>3&&o&&Object.defineProperty(e,s,o),o};let m=class extends H{constructor(){super(),this.unsubscribe=[],this.amount="",this.tokenSymbol="",this.networkName="",this.exchanges=l.state.exchanges,this.isLoading=l.state.isLoading,this.loadingExchangeId=null,this.connectedWalletInfo=N.state.connectedWalletInfo,this.initializePaymentDetails(),this.unsubscribe.push(l.subscribeKey("exchanges",e=>this.exchanges=e)),this.unsubscribe.push(l.subscribeKey("isLoading",e=>this.isLoading=e)),this.unsubscribe.push(N.subscribe(e=>this.connectedWalletInfo=e.connectedWalletInfo)),l.fetchExchanges()}get isWalletConnected(){return N.state.status==="connected"}render(){return p`
      <wui-flex flexDirection="column">
        <wui-flex flexDirection="column" .padding=${["0","4","4","4"]} gap="3">
          ${this.renderPaymentHeader()}

          <wui-flex flexDirection="column" gap="3">
            ${this.renderPayWithWallet()} ${this.renderExchangeOptions()}
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}initializePaymentDetails(){const e=l.getPaymentAsset();this.networkName=e.network,this.tokenSymbol=e.metadata.symbol,this.amount=l.state.amount.toString()}renderPayWithWallet(){return oe(this.networkName)?p`<wui-flex flexDirection="column" gap="3">
        ${this.isWalletConnected?this.renderConnectedView():this.renderDisconnectedView()}
      </wui-flex>
      <wui-separator text="or"></wui-separator>`:p``}renderPaymentHeader(){let e=this.networkName;if(this.networkName){const a=h.getAllRequestedCaipNetworks().find(r=>r.caipNetworkId===this.networkName);a&&(e=a.name)}return p`
      <wui-flex flexDirection="column" alignItems="center">
        <wui-flex alignItems="center" gap="2">
          <wui-text variant="h1-regular" color="primary">${this.amount||"0.0000"}</wui-text>
          <wui-flex class="token-display" alignItems="center" gap="1">
            <wui-text variant="md-medium" color="primary">
              ${this.tokenSymbol||"Unknown Asset"}
            </wui-text>
            ${e?p`
                  <wui-text variant="sm-medium" color="secondary">
                    on ${e}
                  </wui-text>
                `:""}
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}renderConnectedView(){var s,a;const e=((s=this.connectedWalletInfo)==null?void 0:s.name)||"connected wallet";return p`
      <wui-list-item
        @click=${this.onWalletPayment}
        ?chevron=${!0}
        ?fullSize=${!0}
        ?rounded=${!0}
        data-testid="wallet-payment-option"
        imageSrc=${Y((a=this.connectedWalletInfo)==null?void 0:a.icon)}
      >
        <wui-text variant="lg-regular" color="primary">Pay with ${e}</wui-text>
      </wui-list-item>

      <wui-list-item
        icon="power"
        ?rounded=${!0}
        iconColor="error"
        @click=${this.onDisconnect}
        data-testid="disconnect-button"
        ?chevron=${!1}
      >
        <wui-text variant="lg-regular" color="secondary">Disconnect</wui-text>
      </wui-list-item>
    `}renderDisconnectedView(){return p`<wui-list-item
      variant="icon"
      iconVariant="overlay"
      icon="wallet"
      ?rounded=${!0}
      @click=${this.onWalletPayment}
      ?chevron=${!0}
      data-testid="wallet-payment-option"
    >
      <wui-text variant="lg-regular" color="inherit">Pay from wallet</wui-text>
    </wui-list-item>`}renderExchangeOptions(){return this.isLoading?p`<wui-flex justifyContent="center" alignItems="center">
        <wui-spinner size="md"></wui-spinner>
      </wui-flex>`:this.exchanges.length===0?p`<wui-flex justifyContent="center" alignItems="center">
        <wui-text variant="md-medium" color="primary">No exchanges available</wui-text>
      </wui-flex>`:this.exchanges.map(e=>p`
        <wui-list-item
          @click=${()=>this.onExchangePayment(e.id)}
          data-testid="exchange-option-${e.id}"
          ?chevron=${!0}
          ?disabled=${this.loadingExchangeId!==null}
          ?loading=${this.loadingExchangeId===e.id}
          imageSrc=${Y(e.imageUrl)}
        >
          <wui-flex alignItems="center" gap="3">
            <wui-text flexGrow="1" variant="md-medium" color="inherit"
              >Pay with ${e.name} <wui-spinner size="sm" color="secondary"></wui-spinner
            ></wui-text>
          </wui-flex>
        </wui-list-item>
      `)}onWalletPayment(){l.handlePayWithWallet()}async onExchangePayment(e){try{this.loadingExchangeId=e;const s=await l.handlePayWithExchange(e);s&&(await x.open({view:"PayLoading"}),O.openHref(s.url,s.openInNewTab?"_blank":"_self"))}catch(s){console.error("Failed to pay with exchange",s),S.showError("Failed to pay with exchange")}finally{this.loadingExchangeId=null}}async onDisconnect(e){e.stopPropagation();try{await w.disconnect()}catch{console.error("Failed to disconnect"),S.showError("Failed to disconnect")}}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}};m.styles=pe;E([y()],m.prototype,"amount",void 0);E([y()],m.prototype,"tokenSymbol",void 0);E([y()],m.prototype,"networkName",void 0);E([y()],m.prototype,"exchanges",void 0);E([y()],m.prototype,"isLoading",void 0);E([y()],m.prototype,"loadingExchangeId",void 0);E([y()],m.prototype,"connectedWalletInfo",void 0);m=E([K("w3m-pay-view")],m);const me=F`
  :host {
    display: block;
    height: 100%;
    width: 100%;
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-loading-thumbnail {
    position: absolute;
  }
`;var U=function(t,e,s,a){var r=arguments.length,o=r<3?e:a===null?a=Object.getOwnPropertyDescriptor(e,s):a,u;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(t,e,s,a);else for(var d=t.length-1;d>=0;d--)(u=t[d])&&(o=(r<3?u(o):r>3?u(e,s,o):u(e,s))||o);return r>3&&o&&Object.defineProperty(e,s,o),o};const ye=4e3;let P=class extends H{constructor(){super(),this.loadingMessage="",this.subMessage="",this.paymentState="in-progress",this.paymentState=l.state.isPaymentInProgress?"in-progress":"completed",this.updateMessages(),this.setupSubscription(),this.setupExchangeSubscription()}disconnectedCallback(){clearInterval(this.exchangeSubscription)}render(){return p`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["7","5","5","5"]}
        gap="9"
      >
        <wui-flex justifyContent="center" alignItems="center"> ${this.getStateIcon()} </wui-flex>
        <wui-flex flexDirection="column" alignItems="center" gap="2">
          <wui-text align="center" variant="lg-medium" color="primary">
            ${this.loadingMessage}
          </wui-text>
          <wui-text align="center" variant="lg-regular" color="secondary">
            ${this.subMessage}
          </wui-text>
        </wui-flex>
      </wui-flex>
    `}updateMessages(){var e;switch(this.paymentState){case"completed":this.loadingMessage="Payment completed",this.subMessage="Your transaction has been successfully processed";break;case"error":this.loadingMessage="Payment failed",this.subMessage="There was an error processing your transaction";break;case"in-progress":default:((e=l.state.currentPayment)==null?void 0:e.type)==="exchange"?(this.loadingMessage="Payment initiated",this.subMessage="Please complete the payment on the exchange"):(this.loadingMessage="Awaiting payment confirmation",this.subMessage="Please confirm the payment transaction in your wallet");break}}getStateIcon(){switch(this.paymentState){case"completed":return this.successTemplate();case"error":return this.errorTemplate();case"in-progress":default:return this.loaderTemplate()}}setupExchangeSubscription(){var e;((e=l.state.currentPayment)==null?void 0:e.type)==="exchange"&&(this.exchangeSubscription=setInterval(async()=>{var r,o,u;const s=(r=l.state.currentPayment)==null?void 0:r.exchangeId,a=(o=l.state.currentPayment)==null?void 0:o.sessionId;s&&a&&(await l.updateBuyStatus(s,a),((u=l.state.currentPayment)==null?void 0:u.status)==="SUCCESS"&&clearInterval(this.exchangeSubscription))},ye))}setupSubscription(){l.subscribeKey("isPaymentInProgress",e=>{var s;!e&&this.paymentState==="in-progress"&&(l.state.error||!((s=l.state.currentPayment)!=null&&s.result)?this.paymentState="error":this.paymentState="completed",this.updateMessages(),setTimeout(()=>{w.state.status!=="disconnected"&&x.close()},3e3))}),l.subscribeKey("error",e=>{e&&this.paymentState==="in-progress"&&(this.paymentState="error",this.updateMessages())})}loaderTemplate(){const e=Z.state.themeVariables["--w3m-border-radius-master"],s=e?parseInt(e.replace("px",""),10):4,a=this.getPaymentIcon();return p`
      <wui-flex justifyContent="center" alignItems="center" style="position: relative;">
        ${a?p`<wui-wallet-image size="lg" imageSrc=${a}></wui-wallet-image>`:null}
        <wui-loading-thumbnail radius=${s*9}></wui-loading-thumbnail>
      </wui-flex>
    `}getPaymentIcon(){var s;const e=l.state.currentPayment;if(e){if(e.type==="exchange"){const a=e.exchangeId;if(a){const r=l.getExchangeById(a);return r==null?void 0:r.imageUrl}}if(e.type==="wallet"){const a=(s=N.state.connectedWalletInfo)==null?void 0:s.icon;if(a)return a;const r=h.state.activeChain;if(!r)return;const o=G.getConnectorId(r);if(!o)return;const u=G.getConnectorById(o);return u?Q.getConnectorImage(u):void 0}}}successTemplate(){return p`<wui-icon size="xl" color="success" name="checkmark"></wui-icon>`}errorTemplate(){return p`<wui-icon size="xl" color="error" name="close"></wui-icon>`}};P.styles=me;U([y()],P.prototype,"loadingMessage",void 0);U([y()],P.prototype,"subMessage",void 0);U([y()],P.prototype,"paymentState",void 0);P=U([K("w3m-pay-loading-view")],P);const he=3e5;async function we(t){return l.handleOpenPay(t)}async function Ae(t,e=he){if(e<=0)throw new c(i.INVALID_PAYMENT_CONFIG,"Timeout must be greater than 0");try{await we(t)}catch(s){throw s instanceof c?s:new c(i.UNABLE_TO_INITIATE_PAYMENT,s.message)}return new Promise((s,a)=>{let r=!1;const o=setTimeout(()=>{r||(r=!0,C(),a(new c(i.GENERIC_PAYMENT_ERROR,"Payment timeout")))},e);function u(){if(r)return;const f=l.state.currentPayment,k=l.state.error,j=l.state.isPaymentInProgress;if((f==null?void 0:f.status)==="SUCCESS"){r=!0,C(),clearTimeout(o),s({success:!0,result:f.result});return}if((f==null?void 0:f.status)==="FAILED"){r=!0,C(),clearTimeout(o),s({success:!1,error:k||"Payment failed"});return}k&&!j&&!f&&(r=!0,C(),clearTimeout(o),s({success:!1,error:k}))}const d=D("currentPayment",u),A=D("error",u),_=D("isPaymentInProgress",u),C=fe([d,A,_]);u()})}function Ie(){return l.getExchanges()}function Pe(){var t;return(t=l.state.currentPayment)==null?void 0:t.result}function _e(){return l.state.error}function Te(){return l.state.isPaymentInProgress}function D(t,e){return l.subscribeKey(t,e)}function fe(t){return()=>{t.forEach(e=>{try{e()}catch{}})}}const Se={network:"eip155:8453",asset:"native",metadata:{name:"Ethereum",symbol:"ETH",decimals:18}},Ce={network:"eip155:8453",asset:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},be={network:"eip155:84532",asset:"native",metadata:{name:"Ethereum",symbol:"ETH",decimals:18}},xe={network:"eip155:1",asset:"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},Ue={network:"eip155:10",asset:"0x0b2c639c533813f4aa9d7837caf62653d097ff85",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},ke={network:"eip155:42161",asset:"0xaf88d065e77c8cC2239327C5EDb3A432268e5831",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},ve={network:"eip155:137",asset:"0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},Re={network:"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",asset:"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",metadata:{name:"USD Coin",symbol:"USDC",decimals:6}},De={network:"eip155:1",asset:"0xdAC17F958D2ee523a2206206994597C13D831ec7",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},Oe={network:"eip155:10",asset:"0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},Le={network:"eip155:42161",asset:"0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},Me={network:"eip155:137",asset:"0xc2132d05d31c914a87c6611c10748aeb04b58e8f",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},Ye={network:"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",asset:"Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",metadata:{name:"Tether USD",symbol:"USDT",decimals:6}},Ge={network:"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",asset:"native",metadata:{name:"Solana",symbol:"SOL",decimals:9}};export{P as W3mPayLoadingView,m as W3mPayView,ke as arbitrumUSDC,Le as arbitrumUSDT,Se as baseETH,be as baseSepoliaETH,Ce as baseUSDC,xe as ethereumUSDC,De as ethereumUSDT,Ie as getExchanges,Te as getIsPaymentInProgress,_e as getPayError,Pe as getPayResult,we as openPay,Ue as optimismUSDC,Oe as optimismUSDT,Ae as pay,ve as polygonUSDC,Me as polygonUSDT,Ge as solanaSOL,Re as solanaUSDC,Ye as solanaUSDT};
