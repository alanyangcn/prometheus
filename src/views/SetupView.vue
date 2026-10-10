<template>
  <h1>完成初始化</h1>
  <section class="card">
    <p>请先为服务设置管理员密码，再进入管理面板。</p>
    <p>本地开发：在项目的 <code>.dev.vars</code> 中设置 <code>ADMIN</code>，然后重启开发服务。</p>
    <p>线上部署：在 Cloudflare 配置 ADMIN 密钥，并绑定名为 KV 的存储空间。</p>
    <RouterLink to="/login">前往登录</RouterLink>
  </section>
</template>
