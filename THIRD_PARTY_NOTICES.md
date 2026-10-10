# Third-party notices

Protocol, transport, proxy, subscription and integration algorithms are derived from cmliu/edgetunnel, baseline a8ab111 (Worker 2026-10-08 22:23:27), under GNU GPL version 2. The accompanying LICENSE preserves the upstream license text.

Upstream credits include zizifn/edgetunnel, 3Kmfi6HP/EDtunnel, SHIJS1999/cloudflare-worker-vless-ip, ToiCF/CF-Workers-HTTPS, ToiCF/CF-Workers-TURN, ToiCF/CF-Workers-SoftEther, ToiCF/GrainTCP, and TLSClient credited in the source to @Alexandre_Kojeve. Preserve algorithm-level attributions during further changes. See reference/README.md for the complete upstream acknowledgment list.

Vue, Vue Router, Pinia, Vite, Cloudflare development tools and their transitive dependencies retain their respective package licenses.

Production browser bundle transformation uses javascript-obfuscator as a development dependency (BSD-2-Clause license). Its package and transitive dependencies retain their own licenses; it is not bundled as a runtime dependency.

Local QR generation uses node-qrcode (`qrcode`, MIT license). Subscription links are rendered in the browser without sending their tokens to an external QR service.

Management workflow compatibility is derived from the edgetunnel administration interface. Public proxy/catalogue/preset lists and optional Snippet exports retain their upstream ownership; the UI links their sources. A generated upstream Snippet is separate from this application's modular Worker and requires its upstream license to be preserved.
