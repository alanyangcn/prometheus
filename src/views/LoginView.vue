<script setup lang="ts">
import { useToastMessage } from '../composables/useToast';
import { onMounted, onUnmounted, ref } from 'vue';
import ConfigurationNotice from '../components/ConfigurationNotice.vue';
import { attachLiquidGlass } from '../features/appearance/liquidGlass';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../stores/session';
const configuration = ref<InstanceType<typeof ConfigurationNotice> | null>(null);
const password = ref('');
const busy = ref(false);
const error = useToastMessage('error');
const visible = ref(false);
const glass = ref<HTMLFormElement | null>(null);
const session = useSessionStore();
const router = useRouter();
let removeGlass: (() => void) | undefined;
onMounted(() => { if (glass.value) removeGlass = attachLiquidGlass(glass.value); });
onUnmounted(() => removeGlass?.());
async function login() {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try {
    if (!await configuration.value?.checkConfiguration()) return;
    if (!password.value) { error.value = '请输入管理员密码'; return; }
    await session.login(password.value);
    password.value = '';
    await router.push('/Illumination');
  }
  catch (e) { error.value = e instanceof Error ? e.message : '登录失败'; }
  finally { busy.value = false; }
}
</script>
<template>
  <section class="login-scene" aria-labelledby="login-title">
    <div class="ambient-light" aria-hidden="true"><span class="orb orb-blue" /><span class="orb orb-lilac" /><span class="orb orb-peach" /><span class="light-ribbon" /></div>
    <ConfigurationNotice ref="configuration" />
    <div class="login-composition">
      <form ref="glass" class="login-glass" novalidate :aria-busy="busy" @submit.prevent="login">
        <div class="identity-mark" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M22 5c2 8-8 10-5 17 2-4 5-5 6-8 7 6 10 10 7 17-3 7-14 7-18 1-5-8 2-15 10-27Z" fill="currentColor" /><path d="M20 23c-1 4-5 5-4 9 2 4 7 4 9 0 1-3-2-6-5-9Z" fill="white" fill-opacity=".8" /></svg></div>
        <p class="login-wordmark">Prometheus</p>
        <h1 id="login-title">欢迎回来</h1>
        <p class="login-description">输入管理员密码，开启你的工作空间。</p>
        <div class="password-field">
          <label for="password">管理员密码</label>
          <div class="password-control">
            <svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            <input id="password" v-model="password" :type="visible ? 'text' : 'password'" :disabled="busy" autocomplete="current-password" placeholder="请输入密码" :aria-invalid="!!error" required />
            <button type="button" class="visibility-button" :aria-label="visible ? '隐藏密码' : '显示密码'" :aria-pressed="visible" @click="visible = !visible"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /><path v-if="visible" d="m3 3 18 18" /></svg></button>
          </div>
        </div>

        <button type="submit" class="login-submit" :disabled="busy"><span v-if="busy" class="login-spinner" aria-hidden="true" /><span>{{ busy ? '正在登录' : '登录' }}</span><svg v-if="!busy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></button>
        <p class="login-footnote"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></svg>仅供管理员访问</p>
      </form>
      <p class="scene-caption">A little clarity. A little possibility.</p>
    </div>
  </section>
</template>
<style scoped>
.login-scene { position: relative; isolation: isolate; min-height: 100svh; display: grid; place-items: center; padding: max(48px, env(safe-area-inset-top)) 22px max(32px, env(safe-area-inset-bottom)); color: #26334a; background: #edf2fa; overflow: hidden; }
.ambient-light { position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; background: radial-gradient(ellipse at 50% 0%, #ffffffef, transparent 64%), linear-gradient(135deg, #e6eefb, #f3f0f9 55%, #e9f3f8); }
.orb { position: absolute; display: block; border-radius: 50%; filter: blur(36px); }
.orb-blue { width: min(65vw, 720px); height: min(65vw, 720px); left: -8%; top: 16%; background: radial-gradient(circle at 60% 30%, #c5e9ff, #7aa7eb80 60%, transparent 75%); }
.orb-lilac { width: min(60vw, 650px); height: min(60vw, 650px); right: -5%; top: -18%; background: radial-gradient(circle, #e0c9f1c9, #a5b5f06b 65%, transparent 74%); }
.orb-peach { width: min(50vw, 560px); height: min(50vw, 560px); right: 5%; bottom: -25%; background: radial-gradient(circle, #ffdbc985, #e8d9f16b 65%, transparent 74%); }
.light-ribbon { position: absolute; width: 110%; height: 190px; top: 55%; left: -5%; border-radius: 50%; transform: rotate(-26deg); border-top: 2px solid #ffffff90; background: linear-gradient(180deg,#ffffff4d,transparent); box-shadow: 0 -24px 70px #ffffff50; }
.login-composition { width: min(100%, 420px); }
.login-glass { --glass-filter: blur(22px) saturate(1.35); position: relative; isolation: isolate; padding: 38px 34px 26px; border-radius: 34px; border: 1px solid #ffffffbb; background: transparent; box-shadow: 0 24px 80px #45608a18, 0 6px 24px #45608a0d; }
.login-glass::before { content: ''; position: absolute; inset: 0; z-index: -2; border-radius: inherit; background: linear-gradient(145deg,#ffffff80,#ffffff3b 55%,#ffffff66); -webkit-backdrop-filter: var(--glass-filter); backdrop-filter: var(--glass-filter); box-shadow: inset 0 2px 2px #ffffffe6, inset 1px 0 3px #ffffffb3, inset 0 -1px 3px #ffffff99; }
.login-glass::after { content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none; padding: 1px; border-radius: inherit; background: linear-gradient(135deg,#fff,#ffffff20 35%,#95b2db50 52%,#ffffffcc 78%,#ffffff30); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.identity-mark { width: 62px; height: 62px; display: grid; place-items: center; margin: 0 auto 17px; border-radius: 20px; color: #6486be; background: linear-gradient(145deg,#ffffffc9,#ffffff4d); border: 1px solid #ffffffd9; box-shadow: inset 0 1px 2px #fff, 0 8px 20px #5477ae0d; }
.identity-mark svg { width: 36px; height: 36px; }
.login-wordmark { font-family: Georgia, 'Palatino Linotype', serif; font-style: italic; letter-spacing: -.7px; font-size: 26px; text-align: center; margin: 0 0 25px; color: #3f516b; }
.login-glass h1 { font-size: 27px; font-weight: 600; letter-spacing: -.8px; text-align: center; margin: 0 0 10px; }
.login-description { color: #6d7c92; font-size: 13px; line-height: 1.7; text-align: center; margin: 0 0 30px; }
.password-field label { font-size: 12px; font-weight: 550; color: #596a83; margin: 0 0 9px 4px; }
.password-control { position: relative; display: flex; align-items: center; border-radius: 16px; background: #ffffff59; border: 1px solid #ffffffb3; box-shadow: inset 0 1px 3px #5371980a; transition: box-shadow .2s, background .2s; }
.password-control:focus-within { background: #ffffff91; box-shadow: 0 0 0 3px #5b94e523; border-color: #8eafe0; }
.password-control input { background: transparent; width: 100%; height: 54px; border: 0; margin: 0; padding: 14px 50px 14px 43px; border-radius: inherit; font-size: 16px; color: inherit; outline: none; }
.password-control input::placeholder { color: #8b99ad; font-size: 13px; }
.lock-icon { position: absolute; left: 15px; width: 18px; height: 18px; color: #7e90a9; pointer-events: none; }
.visibility-button { position: absolute; right: 8px; width: 36px; height: 36px; display: grid; place-items: center; padding: 8px; background: transparent; color: #7e90a9; border-radius: 12px; -webkit-tap-highlight-color: transparent; }
.visibility-button:hover { background: #7e90a915; }
.visibility-button svg { width: 20px; height: 20px; }
.login-submit { margin-top: 20px; width: 100%; height: 52px; padding: 0 20px; display: flex; align-items: center; justify-content: center; gap: 12px; border-radius: 16px; border: 1px solid #ffffff45; color: white; background: linear-gradient(180deg,#428be9,#2872d4); box-shadow: inset 0 1px 1px #ffffff66, 0 6px 16px #357bd329; font-size: 14px; font-weight: 550; transition: transform .18s, box-shadow .18s; -webkit-tap-highlight-color: transparent; }
.login-submit:hover { background: linear-gradient(180deg,#5298f0,#327ddd); box-shadow: inset 0 1px 1px #ffffff66, 0 8px 22px #357bd338; }
.login-submit:active { transform: scale(.985); }
.login-submit svg { width: 18px; height: 18px; }
.login-error { color: #aa4652; background: #fff0f080; border: 1px solid #ffffff80; border-radius: 12px; padding: 10px 12px; font-size: 12px; line-height: 1.6; margin: 12px 0 0; overflow-wrap: anywhere; }
.login-footnote { display: flex; justify-content: center; align-items: center; gap: 6px; color: #8090a6; font-size: 11px; margin: 23px 0 0; }
.login-footnote svg { width: 14px; height: 14px; }
.scene-caption { color: #8795a9; font-family: Georgia, serif; font-style: italic; font-size: 12px; letter-spacing: .02em; text-align: center; margin: 24px 0 0; }
.login-spinner { width: 16px; height: 16px; border: 2px solid #ffffff50; border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
:global(:root[data-theme=dark] .login-scene) { color: #e5edf8; background: #101928; }
:global(:root[data-theme=dark] .ambient-light) { background: radial-gradient(ellipse at 50% 0%,#263a52,transparent 65%),linear-gradient(135deg,#101c30,#211e33 60%,#132a35); }
:global(:root[data-theme=dark] .orb) { opacity: .3; }
:global(:root[data-theme=dark] .light-ribbon) { opacity: .12; }
:global(:root[data-theme=dark] .login-glass) { border-color: #ffffff30; box-shadow: 0 24px 80px #00000030; }
:global(:root[data-theme=dark] .login-glass::before) { background: linear-gradient(145deg,#24374a99,#17233573 55%,#27314999); box-shadow: inset 0 1px 2px #ffffff30, inset 0 -1px 2px #ffffff20; }
:global(:root[data-theme=dark] .login-glass::after) { opacity: .4; }
:global(:root[data-theme=dark] .identity-mark) { background: #ffffff0d; border-color: #ffffff30; color: #99b9ec; box-shadow: inset 0 1px 2px #ffffff20; }
:global(:root[data-theme=dark] .login-wordmark) { color: #d7e4f6; }
:global(:root[data-theme=dark] .login-description) , :global(:root[data-theme=dark] .password-field label) { color: #a0b2cb; }
:global(:root[data-theme=dark] .password-control) { background: #0b192533; border-color: #ffffff26; }
:global(:root[data-theme=dark] .password-control:focus-within) { border-color: #7f9ed2; background: #18273966; }
:global(:root[data-theme=dark] .login-error) { background: #8a394533; border-color: #ed8b9930; color: #ffbdc5; }
@media (max-width: 480px) { .login-scene { padding-left: 20px; padding-right: 20px; } .login-glass { padding: 32px 24px 24px; border-radius: 30px; } .orb-blue { width: 110vw; height: 110vw; top: 30%; left: -45%; } .orb-lilac { width: 100vw; height: 100vw; top: -5%; right: -35%; } }
@media (prefers-reduced-transparency: reduce) { .login-glass::before { backdrop-filter: none; -webkit-backdrop-filter: none; background: #f1f5fc; } :global(:root[data-theme=dark] .login-glass::before) { background: #1c2b3c; } }
@media (prefers-reduced-motion: reduce) { .login-submit, .password-control { transition: none; } .login-spinner { animation: none; } }
</style>
