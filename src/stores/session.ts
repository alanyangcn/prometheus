import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/client';
import type { Session } from '../../shared/config';
export const useSessionStore = defineStore('session', () => {
  const state = ref<Session>({ configured: false, authenticated: false, storage: false });
  async function refresh() { state.value = await api<Session>('/api/session'); return state.value; }
  async function login(password: string) { await api('/api/login', { password }); await refresh(); }
  async function logout() { await api('/api/logout', {}); state.value.authenticated = false; }
  return { state, refresh, login, logout };
});
