import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { glassSelect } from './directives/glassSelect';
import router from './router';
import './style.css';
import './styles/checkbox.css';
import './styles/select.css';
import './styles/mobile.css';

createApp(App).directive('glass-select', glassSelect).use(createPinia()).use(router).mount('#app');
