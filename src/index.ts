import { createClient } from "@/Client";
 
if (typeof window !== 'undefined' && !window.crypto) {
    // 仅在浏览器环境且原生 crypto 不存在时注入 Polyfill
    window.crypto = require('crypto-browserify');
}


export default createClient;