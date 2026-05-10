<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-6">
    <div class="card w-full max-w-md p-8 space-y-5">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded bg-accent flex items-center justify-center">
          <Icon name="package" :size="18" :stroke-width="1.5" class="text-white" />
        </div>
        <div>
          <h1 class="text-md font-semibold">Connect extension</h1>
          <p class="text-xs text-[var(--text-muted)]">Link the DevProbe browser extension to this workspace.</p>
        </div>
      </div>

      <div class="border-t border-border pt-5 space-y-4">
        <!-- State: not signed in -->
        <div v-if="state === 'unauthed'" class="space-y-3">
          <p class="text-sm text-[var(--text-secondary)]">Sign in to your workspace to continue.</p>
          <Button variant="default" size="sm" class="w-full justify-center text-xs" as-child>
            <RouterLink :to="`/login?redirect=${encodeURIComponent(returnPath)}`">Sign in</RouterLink>
          </Button>
        </div>

        <!-- State: needs extension id -->
        <div v-else-if="state === 'needs-id'" class="space-y-3">
          <p class="text-sm text-[var(--text-secondary)]">Open <span class="font-mono">chrome://extensions</span>, enable Developer mode, and paste the DevProbe extension ID below.</p>
          <Input
            v-model="extId"
            placeholder="abcdefghijklmnopqrstuvwxyz123456"
            maxlength="32"
            class="font-mono text-xs"
            @keyup.enter="connect"
          />
          <Button variant="default" size="sm" class="w-full justify-center text-xs" :disabled="!extIdValid || sending" @click="connect">
            {{ sending ? "Connecting…" : "Connect extension" }}
          </Button>
        </div>

        <!-- State: success -->
        <div v-else-if="state === 'connected'" class="space-y-3 text-center">
          <div class="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
            <Icon name="check" :size="20" :stroke-width="2" />
          </div>
          <p class="text-sm font-medium">Extension connected</p>
          <p class="text-xs text-[var(--text-muted)]">You can close this tab and use the extension popup to capture issues.</p>
        </div>

        <!-- State: error -->
        <div v-else-if="state === 'error'" class="space-y-3">
          <p class="text-sm text-red-500">{{ errorMessage }}</p>
          <Button variant="ghost" size="sm" class="text-xs" @click="state = 'needs-id'">Try again</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { RouterLink, useRoute } from "vue-router";
import Icon from "@/components/base/Icon.vue";
import { Button, Input } from "@deveprobe/ui";
import { useAuthStore } from "@/stores/auth.js";

type State = "unauthed" | "needs-id" | "connected" | "error";

const auth = useAuthStore();
const route = useRoute();
const state = ref<State>("needs-id");
const extId = ref<string>(localStorage.getItem("dp_extension_id") ?? "");
const sending = ref(false);
const errorMessage = ref("");

const extIdValid = computed(() => /^[a-z]{32}$/.test(extId.value));

// Preserve `?ext=...` across the login round-trip.
const returnPath = computed(() => {
  const qid = route.query["ext"]?.toString();
  return qid ? `/extension/connect?ext=${qid}` : "/extension/connect";
});

onMounted(() => {
  if (!auth.isAuthenticated) {
    state.value = "unauthed";
    return;
  }
  // If extId in query string, attempt auto-connect
  const qid = route.query["ext"]?.toString();
  if (qid) {
    extId.value = qid;
    if (extIdValid.value) connect();
  }
});

async function connect() {
  if (!extIdValid.value || !auth.token) return;
  sending.value = true;
  errorMessage.value = "";
  try {
    localStorage.setItem("dp_extension_id", extId.value);
    const chromeRuntime = (window as unknown as { chrome?: { runtime?: { sendMessage?: (id: string, msg: unknown, cb: (resp: unknown) => void) => void } } }).chrome?.runtime;
    if (!chromeRuntime?.sendMessage) {
      throw new Error("Chrome extension runtime not available in this browser.");
    }
    await new Promise<void>((resolve, reject) => {
      chromeRuntime.sendMessage!(
        extId.value,
        {
          type: "DEVPROBE_AUTH_HANDOFF",
          token: auth.token,
          orgId: auth.orgId,
          userId: auth.userId,
        },
        (resp: unknown) => {
          const r = resp as { ok?: boolean; error?: string } | undefined;
          if (!r) return reject(new Error("No response from extension. Is it installed and the ID correct?"));
          if (!r.ok) return reject(new Error(r.error ?? "Extension rejected handoff"));
          resolve();
        },
      );
    });
    state.value = "connected";
  } catch (e) {
    errorMessage.value = (e as Error).message;
    state.value = "error";
  } finally {
    sending.value = false;
  }
}
</script>
