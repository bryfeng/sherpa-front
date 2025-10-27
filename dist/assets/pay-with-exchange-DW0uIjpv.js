import{d6 as g,db as y,dk as f,dc as r,du as w,dj as p,dh as P,dv as k,e2 as u,da as b,di as v}from"./index-vTXeJqHX.js";import{E as i}from"./ExchangeController-Bs27gAnA.js";const A=g`
  .amount-input-container {
    border-radius: ${({borderRadius:s})=>s[5]};
    border-top-right-radius: 0;
    border-top-left-radius: 0;
    border-bottom: 1px solid ${({tokens:s})=>s.core.glass010};
    background-color: ${({tokens:s})=>s.theme.backgroundPrimary};
  }

  .container {
    background-color: ${({tokens:s})=>s.theme.foregroundSecondary};
    border-radius: 30px;
  }
`;var l=function(s,e,n,t){var a=arguments.length,o=a<3?e:t===null?t=Object.getOwnPropertyDescriptor(e,n):t,m;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(s,e,n,t);else for(var d=s.length-1;d>=0;d--)(m=s[d])&&(o=(a<3?m(o):a>3?m(e,n,o):m(e,n))||o);return a>3&&o&&Object.defineProperty(e,n,o),o};const I=[10,50,100];let c=class extends y{constructor(){super(),this.unsubscribe=[],this.network=f.state.activeCaipNetwork,this.exchanges=i.state.exchanges,this.isLoading=i.state.isLoading,this.amount=i.state.amount,this.tokenAmount=i.state.tokenAmount,this.priceLoading=i.state.priceLoading,this.isPaymentInProgress=i.state.isPaymentInProgress,this.currentPayment=i.state.currentPayment,this.paymentId=i.state.paymentId,this.paymentAsset=i.state.paymentAsset,this.unsubscribe.push(f.subscribeKey("activeCaipNetwork",e=>{this.network=e,this.setDefaultPaymentAsset()}),i.subscribe(e=>{var t,a;this.exchanges=e.exchanges,this.isLoading=e.isLoading,this.amount=e.amount,this.tokenAmount=e.tokenAmount,this.priceLoading=e.priceLoading,this.paymentId=e.paymentId,this.isPaymentInProgress=e.isPaymentInProgress,this.currentPayment=e.currentPayment,this.paymentAsset=e.paymentAsset,e.isPaymentInProgress&&((t=e.currentPayment)==null?void 0:t.exchangeId)&&((a=e.currentPayment)==null?void 0:a.sessionId)&&e.paymentId&&this.handlePaymentInProgress()}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),i.reset()}async firstUpdated(){await this.getPaymentAssets(),this.paymentAsset||await this.setDefaultPaymentAsset(),await i.fetchExchanges()}render(){return r`
      <wui-flex flexDirection="column" gap="2" class="container">
        ${this.amountInputTemplate()} ${this.exchangesTemplate()}
      </wui-flex>
    `}exchangesLoadingTemplate(){return Array.from({length:2}).map(()=>r`<wui-shimmer width="100%" height="65px" borderRadius="xxs"></wui-shimmer>`)}_exchangesTemplate(){return this.exchanges.length>0?this.exchanges.map(e=>r`<wui-list-item
              @click=${()=>this.onExchangeClick(e)}
              chevron
              variant="image"
              imageSrc=${e.imageUrl}
              ?loading=${this.isLoading}
            >
              <wui-text variant="md-regular" color="secondary">
                Deposit from ${e.name}
              </wui-text>
            </wui-list-item>`):r`<wui-flex flexDirection="column" alignItems="center" gap="4" padding="4">
          <wui-text variant="lg-medium" align="center" color="primary">
            No exchanges support this asset on this network
          </wui-text>
        </wui-flex>`}exchangesTemplate(){return r`<wui-flex
      flexDirection="column"
      gap="2"
      .padding=${["3","3","3","3"]}
      class="exchanges-container"
    >
      ${this.isLoading?this.exchangesLoadingTemplate():this._exchangesTemplate()}
    </wui-flex>`}amountInputTemplate(){var e,n;return r`
      <wui-flex flexDirection="column" gap="3" .padding=${["0","3","3","3"]} class="amount-input-container">
        <wui-flex justifyContent="space-between" alignItems="center">
          <wui-text variant="md-medium" color="secondary">Asset</wui-text>

          <wui-token-button
            data-testid="deposit-from-exchange-asset-button"
            flexDirection="row-reverse"
            text=${((e=this.paymentAsset)==null?void 0:e.metadata.symbol)||""}
            imageSrc=${((n=this.paymentAsset)==null?void 0:n.metadata.iconUrl)||""}
            @click=${()=>w.push("PayWithExchangeSelectAsset")}
            >
          </wui-token-button>
        </wui-flex>
        <wui-flex flexDirection="column" alignItems="center" justifyContent="center">
          <wui-flex alignItems="center" gap="1">
            <wui-text variant="h2-regular" color="secondary">${this.amount}</wui-text>
            <wui-text variant="md-regular" color="secondary">USD</wui-text>
          </wui-flex>
          ${this.tokenAmountTemplate()}
          </wui-flex>
          <wui-flex justifyContent="space-between" gap="2">
            ${I.map(t=>r`<wui-button @click=${()=>this.onPresetAmountClick(t)} variant=${this.amount===t?"neutral-primary":"neutral-secondary"} size="sm" fullWidth>$${t}</wui-button>`)}
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `}tokenAmountTemplate(){var e;return this.priceLoading?r`<wui-shimmer
        width="65px"
        height="20px"
        borderRadius="xxs"
        variant="light"
      ></wui-shimmer>`:r`
      <wui-text variant="md-regular" color="secondary">
        ${this.tokenAmount.toFixed(4)} ${(e=this.paymentAsset)==null?void 0:e.metadata.symbol}
      </wui-text>
    `}async onExchangeClick(e){if(!this.amount){p.showError("Please enter an amount");return}await i.handlePayWithExchange(e.id)}handlePaymentInProgress(){var n,t;const e=f.state.activeChain;this.isPaymentInProgress&&((n=this.currentPayment)!=null&&n.exchangeId)&&((t=this.currentPayment)!=null&&t.sessionId)&&this.paymentId&&(i.waitUntilComplete({exchangeId:this.currentPayment.exchangeId,sessionId:this.currentPayment.sessionId,paymentId:this.paymentId}).then(a=>{a.status==="SUCCESS"?(p.showSuccess("Deposit completed"),e&&(P.fetchTokenBalance(),k.updateBalance(e))):a.status==="FAILED"&&p.showError("Deposit failed")}),p.showLoading("Deposit in progress..."),w.replace("Account"))}onPresetAmountClick(e){i.setAmount(e)}async getPaymentAssets(){this.network&&await i.getAssetsForNetwork(this.network.caipNetworkId)}async setDefaultPaymentAsset(){if(this.network){const e=await i.getAssetsForNetwork(this.network.caipNetworkId);e[0]&&i.setPaymentAsset(e[0])}}};c.styles=A;l([u()],c.prototype,"network",void 0);l([u()],c.prototype,"exchanges",void 0);l([u()],c.prototype,"isLoading",void 0);l([u()],c.prototype,"amount",void 0);l([u()],c.prototype,"tokenAmount",void 0);l([u()],c.prototype,"priceLoading",void 0);l([u()],c.prototype,"isPaymentInProgress",void 0);l([u()],c.prototype,"currentPayment",void 0);l([u()],c.prototype,"paymentId",void 0);l([u()],c.prototype,"paymentAsset",void 0);c=l([b("w3m-deposit-from-exchange-view")],c);const $=g`
  .contentContainer {
    height: 440px;
    overflow: scroll;
    scrollbar-width: none;
  }

  .contentContainer::-webkit-scrollbar {
    display: none;
  }

  wui-icon-box {
    width: 40px;
    height: 40px;
    border-radius: ${({borderRadius:s})=>s[3]};
  }
`;var x=function(s,e,n,t){var a=arguments.length,o=a<3?e:t===null?t=Object.getOwnPropertyDescriptor(e,n):t,m;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(s,e,n,t);else for(var d=s.length-1;d>=0;d--)(m=s[d])&&(o=(a<3?m(o):a>3?m(e,n,o):m(e,n))||o);return a>3&&o&&Object.defineProperty(e,n,o),o};let h=class extends y{constructor(){super(),this.unsubscribe=[],this.assets=i.state.assets,this.search="",this.onDebouncedSearch=v.debounce(e=>{this.search=e}),this.unsubscribe.push(i.subscribe(e=>{this.assets=e.assets}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return r`
      <wui-flex flexDirection="column">
        ${this.templateSearchInput()} <wui-separator></wui-separator> ${this.templateTokens()}
      </wui-flex>
    `}templateSearchInput(){return r`
      <wui-flex gap="2" padding="3">
        <wui-input-text
          @inputChange=${this.onInputChange.bind(this)}
          class="network-search-input"
          size="sm"
          placeholder="Search token"
          icon="search"
        ></wui-input-text>
      </wui-flex>
    `}templateTokens(){const e=this.assets.filter(t=>t.metadata.name.toLowerCase().includes(this.search.toLowerCase())),n=e.length>0;return r`
      <wui-flex
        class="contentContainer"
        flexDirection="column"
        .padding=${["0","3","0","3"]}
      >
        <wui-flex justifyContent="flex-start" .padding=${["4","3","3","3"]}>
          <wui-text variant="md-medium" color="secondary">Available tokens</wui-text>
        </wui-flex>
        <wui-flex flexDirection="column" gap="2">
          ${n?e.map(t=>r`<wui-list-item
                    .imageSrc=${t.metadata.iconUrl}
                    ?clickable=${!0}
                    @click=${this.handleTokenClick.bind(this,t)}
                  >
                    <wui-text variant="md-medium" color="primary">${t.metadata.name}</wui-text>
                    <wui-text variant="md-regular" color="secondary"
                      >${t.metadata.symbol}</wui-text
                    >
                  </wui-list-item>`):r`<wui-flex
                .padding=${["20","0","0","0"]}
                alignItems="center"
                flexDirection="column"
                gap="4"
              >
                <wui-icon-box icon="coinPlaceholder" color="default" size="lg"></wui-icon-box>
                <wui-flex
                  class="textContent"
                  gap="2"
                  flexDirection="column"
                  justifyContent="center"
                >
                  <wui-text variant="lg-medium" align="center" color="primary">
                    No tokens found
                  </wui-text>
                </wui-flex>
                <wui-link @click=${this.onBuyClick.bind(this)}>Buy</wui-link>
              </wui-flex>`}
        </wui-flex>
      </wui-flex>
    `}onBuyClick(){w.push("OnRampProviders")}onInputChange(e){this.onDebouncedSearch(e.detail)}handleTokenClick(e){i.setPaymentAsset(e),w.goBack()}};h.styles=$;x([u()],h.prototype,"assets",void 0);x([u()],h.prototype,"search",void 0);h=x([b("w3m-deposit-from-exchange-select-asset-view")],h);export{h as W3mDepositFromExchangeSelectAssetView,c as W3mDepositFromExchangeView};
