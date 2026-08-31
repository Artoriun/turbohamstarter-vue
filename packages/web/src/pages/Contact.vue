<!-- Mirrors packages/web/src/pages/Contact.tsx. -->
<script setup lang="ts">
import { reactive, ref } from 'vue';
import HamsterWriting from '../components/HamsterWriting.vue';
import { useT } from '../i18n';
import { apiSendContact } from '../lib/api';

type Status = 'idle' | 'sending' | 'sent' | 'error' | 'unavailable';

const t = useT();
const status = ref<Status>('idle');
const error = ref('');
const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '', // honeypot
});

async function onSubmit() {
  error.value = '';

  if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
    error.value = t.value.contact.required;
    return;
  }
  // Deliberately loose. The server validates properly; this only catches typos early, and a
  // stricter pattern here would reject addresses that are actually valid.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    error.value = t.value.contact.invalidEmail;
    return;
  }

  status.value = 'sending';
  try {
    await apiSendContact({ ...form });
    status.value = 'sent';
    form.name = '';
    form.email = '';
    form.subject = '';
    form.message = '';
    form.website = '';
  } catch (err) {
    status.value = err instanceof Error && err.message === 'unavailable' ? 'unavailable' : 'error';
  }
}
</script>

<template>
  <div v-if="status === 'sent'" class="page prose">
    <h1 class="title-accent">{{ t.contact.title }}</h1>
    <!-- role=status so a screen reader announces the outcome without moving focus. -->
    <p class="form-success" role="status">{{ t.contact.success }}</p>
  </div>

  <div v-else class="page prose">
    <h1 class="title-accent">{{ t.contact.title }}</h1>
    <p>{{ t.contact.intro }}</p>

    <form class="contact-form" novalidate @submit.prevent="onSubmit">
      <div class="field">
        <label for="name">{{ t.contact.name }}</label>
        <input id="name" v-model="form.name" name="name" autocomplete="name" />
      </div>

      <div class="field">
        <label for="email">{{ t.contact.email }}</label>
        <input id="email" v-model="form.email" name="email" type="email" autocomplete="email" />
      </div>

      <div class="field">
        <label for="subject">{{ t.contact.subject }}</label>
        <input id="subject" v-model="form.subject" name="subject" />
      </div>

      <div class="field field-wide">
        <label for="message">{{ t.contact.message }}</label>
        <textarea id="message" v-model="form.message" name="message" rows="6" />
      </div>

      <!-- Honeypot: hidden from people, tempting to naive bots. Not display:none, which
           some bots detect — off-screen with aria-hidden and tabindex -1 instead. -->
      <div class="honeypot" aria-hidden="true">
        <label for="website">Website</label>
        <input id="website" v-model="form.website" name="website" tabindex="-1" autocomplete="off" />
      </div>

      <p v-if="error" class="form-error field-wide" role="alert">{{ error }}</p>
      <p v-if="status === 'error'" class="form-error field-wide" role="alert">{{ t.contact.errorGeneric }}</p>
      <p v-if="status === 'unavailable'" class="form-error field-wide" role="alert">{{ t.contact.errorUnavailable }}</p>

      <button type="submit" class="btn btn-primary field-wide" :disabled="status === 'sending'">
        {{ status === 'sending' ? t.contact.sending : t.contact.send }}
      </button>
    </form>

    <HamsterWriting />
  </div>
</template>
