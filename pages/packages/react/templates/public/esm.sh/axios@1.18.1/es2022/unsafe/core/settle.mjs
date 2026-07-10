/* esm.sh - axios@1.18.1/unsafe/core/settle */
import a from"../../lib/core/AxiosError.mjs";function E(i,f,t){let u=t.config.validateStatus;!t.status||!u||u(t.status)?i(t):f(new a("Request failed with status code "+t.status,t.status>=400&&t.status<500?a.ERR_BAD_REQUEST:a.ERR_BAD_RESPONSE,t.config,t.request,t))}export{E as default};
//# sourceMappingURL=settle.mjs.map