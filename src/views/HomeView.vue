<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
interface Photo { id: string; author: string; width: number; height: number; url: string }
const photos = ref<Photo[]>([]);
const loading = ref(false);
const error = ref('');
const failed = ref<string[]>([]);
let controller: AbortController | undefined;
let generation = 0;
const captions = ['光线落下的地方', '在路上', '慢一点，看见更多', '日常的另一面', '片刻之间', '远方与近处', '留住一束光', '安静的轮廓', '偶然遇见', '未完的旅程'];
function image(photo: Photo, width = 900) {
  const height = Math.round(width * photo.height / photo.width);
  return `https://picsum.photos/id/${photo.id}/${width}/${Math.max(1, Math.min(2400, height))}`;
}
async function shuffle() {
  controller?.abort(); controller = new AbortController();
  const current = ++generation;
  const signal = controller.signal;
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(12000)]);
  loading.value = true; error.value = '';
  try {
    const page = 1 + Math.floor(Math.random() * 16);
    const response = await fetch(`https://picsum.photos/v2/list?page=${page}&limit=60`, { signal: requestSignal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('暂时无法读取照片，稍后再试。');
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error('图片来源响应异常，请稍后再试。');
    const list = data.filter((p): p is Photo => p && typeof p.id === 'string' && /^\d+$/.test(p.id) && typeof p.author === 'string' && Number.isFinite(p.width) && p.width > 0 && Number.isFinite(p.height) && p.height > 0 && typeof p.url === 'string' && p.url.startsWith('https://unsplash.com/'));
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j]!, list[i]!]; }
    if (!list.length) throw new Error('暂时没有可展示的照片，请换一组选片。');
    if (current === generation) { photos.value = list.slice(0, 10); failed.value = []; }
  } catch (cause) {
    if (!signal.aborted && current === generation) error.value = cause instanceof Error && cause.name === 'TimeoutError' ? '照片加载超时，请重新加载。' : cause instanceof Error ? cause.message : '照片加载失败，请稍后重试。';
  } finally { if (current === generation) loading.value = false; }
}
function imageFailed(id: string) { if (!failed.value.includes(id)) failed.value.push(id); }
onMounted(() => { void shuffle(); });
onUnmounted(() => { controller?.abort(); });
</script>
<template>
  <section class="photo-intro">
    <p class="journal-label"><span /> A VISUAL JOURNAL</p>
    <h1>把目光，<br />留给<span class="quiet-word">片刻。</span></h1>
    <div class="intro-bottom"><p>光影、远方，以及那些值得停留的日常。<br />一册不断更新的随机摄影选片。</p><a href="#collection" class="browse-link">向下浏览 <span aria-hidden="true">↘</span></a></div>
  </section>
  <section id="collection" class="collection" aria-label="摄影选片" :aria-busy="loading">
    <div class="collection-heading"><div><span class="section-number">01 /</span><h2>片刻收藏</h2></div><button class="shuffle-button" :disabled="loading" @click="shuffle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 11.6-1L20 9M4 15l2.4 3A7 7 0 0 0 18 17" /></svg>{{ loading ? '正在选片' : '换一组选片' }}</button></div>
    <p v-if="error" class="photo-error" role="alert">{{ error }} <button :disabled="loading" @click="shuffle">重新加载</button></p>
    <div v-if="!photos.length && loading" class="photo-columns" aria-label="正在加载照片"><div v-for="n in 6" :key="n" class="photo-skeleton" :style="{ height: `${n % 2 ? 280 : 390}px` }" /></div>
    <div v-else class="photo-columns">
      <figure v-for="(photo, index) in photos" :key="photo.id" class="photo-piece">
        <a class="photo-frame" :href="photo.url" target="_blank" rel="noopener noreferrer" :aria-label="`查看 ${photo.author} 的照片来源（新标签页）`" :style="{ aspectRatio: `${photo.width} / ${photo.height}` }">
          <img v-if="!failed.includes(photo.id)" :src="image(photo, 720)" :srcset="`${image(photo, 480)} 480w, ${image(photo, 900)} 900w`" sizes="(max-width: 600px) calc(100vw - 32px), (max-width: 850px) 45vw, 290px" :alt="`${photo.author} 的摄影作品`" :width="photo.width" :height="photo.height" :loading="index < 2 ? 'eager' : 'lazy'" decoding="async" referrerpolicy="no-referrer" @error="imageFailed(photo.id)" />
          <span v-else class="image-unavailable">照片暂时无法加载</span><span class="view-mark" aria-hidden="true">↗</span>
        </a>
        <figcaption><span class="photo-caption">{{ captions[index] }}</span><a :href="photo.url" target="_blank" rel="noopener noreferrer" class="photo-author">{{ photo.author }}</a></figcaption>
      </figure>
    </div>
  </section>
  <footer id="about" class="photo-footer"><p>看见，是一切的开始。</p><p class="about-copy">一册关于光影与日常的随机摄影选片。让每一次停留，都遇见不同的视角。</p><div><span>Prometheus · 摄影随记</span><span>Photos via <a href="https://picsum.photos" target="_blank" rel="noopener noreferrer">Lorem Picsum</a> / <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash</a></span></div></footer>
</template>
<style scoped>
.photo-intro { padding: 26px 0 64px; }
.journal-label { display: flex; align-items: center; gap: 10px; font-size: 10px; font-weight: 550; letter-spacing: .22em; color: #7a817c; }
.journal-label span { width: 6px; height: 6px; border-radius: 50%; background: #879c8d; }
.photo-intro h1 { font-family: Georgia, "Songti SC", "Noto Serif CJK SC", serif; font-size: clamp(42px, 7vw, 76px); font-weight: 400; letter-spacing: -.05em; line-height: 1.25; margin: 30px 0 28px; }
.quiet-word { color: #8c958a; }
.intro-bottom { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; }
.intro-bottom p { font-size: 14px; line-height: 1.9; color: #7a817c; margin: 0; }
.browse-link { color: inherit; font-size: 12px; white-space: nowrap; }
.browse-link span { margin-left: 14px; font-size: 19px; }
.collection { scroll-margin-top: 24px; }
.collection-heading { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #dfe3de; padding: 22px 0 28px; gap: 16px; }
.collection-heading > div { display: flex; gap: 16px; align-items: center; }
.section-number { font-size: 11px; color: #91988f; }
.collection-heading h2 { margin: 0; font-size: 15px; font-weight: 500; letter-spacing: .08em; }
.shuffle-button { display: flex; align-items: center; gap: 8px; background: transparent; color: #626b62; font-size: 12px; padding: 8px 0 8px 10px; -webkit-tap-highlight-color: transparent; }
.shuffle-button:hover { background: transparent; color: #202a23; }
.shuffle-button svg { width: 16px; height: 16px; }
.photo-columns { columns: 3; column-gap: 22px; }
.photo-piece { break-inside: avoid; margin: 0 0 32px; }
.photo-frame { position: relative; display: block; width: 100%; padding: 0; overflow: hidden; border-radius: 4px; background: #e8ebe6; -webkit-tap-highlight-color: transparent; }
.photo-frame img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .55s ease; }
.photo-frame:hover img { transform: scale(1.035); }
.view-mark { position: absolute; bottom: 12px; right: 12px; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #ffffff38; backdrop-filter: blur(12px); color: white; opacity: 0; transition: opacity .2s; }
.photo-frame:hover .view-mark, .photo-frame:focus-visible .view-mark { opacity: 1; }
.image-unavailable { display: grid; place-items: center; height: 100%; color: #657064; font-size: 13px; }
figcaption { display: flex; justify-content: space-between; gap: 12px; margin-top: 11px; line-height: 1.5; }
.photo-caption { font-size: 12px; color: #626b62; }
.photo-author { font-size: 10px; color: #8a9387; text-align: right; max-width: 55%; }
.photo-skeleton { background: linear-gradient(110deg,#e8ebe6,#f2f4ef,#e8ebe6); border-radius: 4px; break-inside: avoid; margin-bottom: 24px; }
.photo-error { font-size: 13px; color: #8c534b; padding: 16px 0; }
.photo-error button { padding: 6px 10px; font-size: 12px; background: transparent; color: inherit; text-decoration: underline; }
.photo-footer { border-top: 1px solid #dfe3de; margin-top: 28px; padding: 36px 0 0; }
.photo-footer > p { font-family: Georgia, "Songti SC", serif; font-size: 24px; letter-spacing: .03em; color: #969e92; }
.photo-footer .about-copy { font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.8; color: #8a9387; letter-spacing: 0; }
.photo-footer > div { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; font-size: 10px; color: #92998e; margin-top: 28px; }
.photo-footer a { color: inherit; }
:global(:root[data-theme=dark] .collection-heading) , :global(:root[data-theme=dark] .photo-footer) { border-color: #ffffff20; }
:global(:root[data-theme=dark] .photo-caption) , :global(:root[data-theme=dark] .shuffle-button) { color: #bdc5b8; }
:global(:root[data-theme=dark] .intro-bottom p) , :global(:root[data-theme=dark] .journal-label) , :global(:root[data-theme=dark] .photo-author) { color: #a2ad9d; }
:global(:root[data-theme=dark] .photo-frame) , :global(:root[data-theme=dark] .photo-skeleton) { background: #27312c; }
@media (max-width: 850px) { .photo-columns { columns: 2; column-gap: 18px; } }
@media (max-width: 600px) { .photo-intro { padding: 16px 0 40px; } .intro-bottom { align-items: flex-start; } .intro-bottom p { font-size: 12px; } .browse-link { font-size: 11px; } .photo-columns { columns: 1; } .photo-piece { margin-bottom: 26px; } }
@media (prefers-reduced-motion: reduce) { .photo-frame img, .view-mark { transition: none; } }
</style>
